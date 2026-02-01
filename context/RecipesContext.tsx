import {
  createDocument,
  deleteDocument,
  getTableData,
  updateDocument,
} from "@/lib/services/databaseService";
import {subscribeUserRecipes} from "@/lib/services/recipesSubscriptionService";
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {Models} from "react-native-appwrite";
import {useAuth} from "./AuthContext";

export type AppwriteRecipe = {
  $id: string;
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: {
    [key: string]: number;
  };
  createdAt: Date;
  userId: string;
};

type RecipeContextType = {
  recipes: AppwriteRecipe[];
  loading: boolean;
  addRecipe: (data: any) => Promise<Models.Document>;
  deleteRecipe: (id: string) => Promise<void>;
  editRecipe: (id: string, data: any) => Promise<Models.Document>;
  initialFetchRecipes: () => Promise<void>;
};

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

// Helper function to transform recipe documents consistently
const transformRecipeDoc = (doc: any): AppwriteRecipe => ({
  $id: doc.$id,
  name: doc.name,
  servings: Number(doc.servings),
  targetProfit: Number(doc.targetProfit),
  ingredients:
    typeof doc.ingredients === "string"
      ? JSON.parse(doc.ingredients)
      : doc.ingredients,
  userId: doc.userId,
  // Handle missing or invalid createdAt
  createdAt:
    doc.createdAt && !isNaN(new Date(doc.createdAt).getTime())
      ? new Date(doc.createdAt)
      : new Date(),
});

export default function RecipeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recipes, setRecipes] = useState<AppwriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const {user} = useAuth();

  // Sort recipes by creation date (most recent first)
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [recipes]);

  async function initialFetchRecipes() {
    // Initial fetch
    const recipesRes = await getTableData("recipes", user?.$id as string);

    // Transform documents consistently
    const recipes = recipesRes.map(transformRecipeDoc);
    setRecipes(recipes);
  }

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function setupRecipesSubscription() {
      try {
        setLoading(true);

        // Initial fetch
        await initialFetchRecipes();

        // Subscribe
        unsubscribe = subscribeUserRecipes(user!.$id, (doc, event) => {
          setRecipes((prev) => {
            if (event === "create") {
              const exists = prev.find((rec) => rec.$id === doc.$id);
              if (exists) return prev; // Don't add if it already exists

              // Transform the document the same way as initial fetch
              return [...prev, transformRecipeDoc(doc)];
            }

            if (event === "update") {
              return prev.map((rec) =>
                rec.$id === doc.$id ? transformRecipeDoc(doc) : rec
              );
            }

            if (event === "delete") {
              return prev.filter((rec) => rec.$id !== doc.$id);
            }

            return prev;
          });
        });
      } catch (error) {
        console.error("Error setting up recipes subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.$id) {
      setupRecipesSubscription();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.$id]);

  const addRecipe = (data: any) => {
    return createDocument("recipes", {...data, userId: user?.$id});
  };

  const deleteRecipe = async (id: string) => {
    await deleteDocument("recipes", id);
  };

  const editRecipe = (id: string, data: AppwriteRecipe) => {
    return updateDocument("recipes", id, data);
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes: sortedRecipes, // Return sorted recipes
        loading,
        addRecipe,
        deleteRecipe,
        editRecipe,
        initialFetchRecipes,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error("useRecipes must be used within a RecipeContextProvider");
  }
  return context;
};
