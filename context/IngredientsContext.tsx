import {AppwriteIngredient} from "@/app/(tabs)/inventory";
import {
  createDocument,
  deleteDocument,
  getTableData,
  updateDocument,
} from "@/lib/services/databaseService";
import {subscribeUserIngredients} from "@/lib/services/ingredientsSubscriptionService";
import {createContext, useContext, useEffect, useState} from "react";
import {Models} from "react-native-appwrite";
import {useAuth} from "./AuthContext";
import {AppwriteRecipe} from "./RecipesContext";

type ContextType = {
  ingredients: AppwriteIngredient[];
  addIngredient: (data: any) => Promise<Models.Document>;
  editIngredient: (id: string, data: any) => Promise<Models.Document>;
  deleteIngredient: (id: string, userId: string) => Promise<void>;
  loading: boolean;
  initialFetchIngredients: () => Promise<void>;
};

// Helper function to transform documents consistently
const transformIngredientDoc = (doc: any) => ({
  $id: doc.$id,
  name: doc.name,
  stock: Number(doc.stock),
  unit: doc.unit,
  userId: doc.userId,
  quantity: Number(doc.quantity),
  cost: Number(doc.cost),
  expires: new Date(doc.expires),
  notificationId: doc.notificationId,
  notificationScheduled: doc.notificationScheduled,
  // Use current time if $createdAt is missing/invalid
  $createdAt:
    doc.$createdAt && !isNaN(new Date(doc.$createdAt).getTime())
      ? new Date(doc.$createdAt)
      : new Date(),
});

const IngredientsContext = createContext<ContextType | undefined>(undefined);

export function IngredientsProvider({children}: {children: React.ReactNode}) {
  const [ingredients, setIngredients] = useState<AppwriteIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const {user} = useAuth();

  async function initialFetchIngredients() {
    const ingredientsRes = await getTableData(
      "ingredients",
      user?.$id as string
    );

    const ingredients = ingredientsRes.map(transformIngredientDoc);

    setIngredients(ingredients);
  }

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function setupIngredientsSubscription() {
      try {
        setLoading(true);
        // Initial fetch
        await initialFetchIngredients();

        // Subscribe
        unsubscribe = subscribeUserIngredients(user!.$id, (doc, event) => {
          setIngredients((prev) => {
            if (event === "create") {
              // Check if ingredient already exists to prevent duplicates
              const exists = prev.find((ing) => ing.$id === doc.$id);
              if (exists) return prev; // Don't add if it already exists

              return [...prev, transformIngredientDoc(doc)];
            }

            if (event === "update") {
              return prev.map((ing) =>
                ing.$id === doc.$id ? transformIngredientDoc(doc) : ing
              );
            }

            if (event === "delete") {
              return prev.filter((ing) => ing.$id !== doc.$id);
            }

            return prev;
          });
        });
      } catch (error) {
        console.error("Error setting up ingredients subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.$id) {
      setupIngredientsSubscription();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.$id]);

  // ✅ Expose functions here
  function addIngredient(data: Omit<AppwriteIngredient, "$id">) {
    return createDocument("ingredients", {
      ...data,
      userId: user?.$id,
      notificationScheduled: false, // Initialize as false
    });
  }

  function editIngredient(id: string, data: Partial<AppwriteIngredient>) {
    return updateDocument("ingredients", id, data);
  }

  async function deleteIngredient(id: string, userId: string) {
    // delete the ingredient row
    await deleteDocument("ingredients", id);

    // get all recipes of the user
    const recipes = (await getTableData(
      "recipes",
      userId
    )) as unknown as AppwriteRecipe[];

    for (const recipe of recipes) {
      // parse ingredients if stored as string
      const ingredients =
        typeof recipe.ingredients === "string"
          ? JSON.parse(recipe.ingredients)
          : recipe.ingredients;

      if (ingredients[id] !== undefined) {
        delete ingredients[id];

        await updateDocument("recipes", recipe.$id, {
          ingredients: JSON.stringify(ingredients), // re-stringify for Appwrite
        });
      }
    }
  }

  return (
    <IngredientsContext.Provider
      value={{
        ingredients,
        addIngredient,
        deleteIngredient,
        loading,
        editIngredient,
        initialFetchIngredients,
      }}
    >
      {children}
    </IngredientsContext.Provider>
  );
}

export const useIngredients = () => {
  const context = useContext(IngredientsContext);
  if (context === undefined) {
    throw new Error(
      "useIngredients must be used within an IngredientsProvider"
    );
  }
  return context;
};
