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

export type OverheadType = "Rent" | "Utilities" | "Miscellaneous Fees";

export type LaborCost = {
  costPerDay: string;
  employees: string;
};

export type OverheadCost = {
  type: OverheadType;
  amount: string;
  units: string;
};

export type AppwriteRecipe = {
  $id: string;
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: Record<string, number>;
  laborCosts: LaborCost[];
  overheadCosts: OverheadCost[];
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

const safeParse = (value: any, fallback: any) => {
  if (!value) return fallback;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

const transformRecipeDoc = (doc: any): AppwriteRecipe => ({
  $id: doc.$id,
  name: doc.name,
  servings: Number(doc.servings),
  targetProfit: Number(doc.targetProfit),

  ingredients: safeParse(doc.ingredients, {}),

  laborCosts: safeParse(doc.laborCosts, []),

  overheadCosts: safeParse(doc.overheadCosts, []),

  userId: doc.userId,

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

  const sortedRecipes = useMemo(() => {
    return [...recipes].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [recipes]);

  async function initialFetchRecipes() {
    const recipesRes = await getTableData("recipes", user?.$id as string);
    const recipes = recipesRes.map(transformRecipeDoc);
    setRecipes(recipes);
  }

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function setupRecipesSubscription() {
      try {
        setLoading(true);

        await initialFetchRecipes();

        unsubscribe = subscribeUserRecipes(user!.$id, (doc, event) => {
          setRecipes((prev) => {
            if (event === "create") {
              const exists = prev.find((rec) => rec.$id === doc.$id);
              if (exists) return prev;

              return [...prev, transformRecipeDoc(doc)];
            }

            if (event === "update") {
              return prev.map((rec) =>
                rec.$id === doc.$id ? transformRecipeDoc(doc) : rec,
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
    return createDocument("recipes", {
      ...data,
      userId: user?.$id,
    });
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
        recipes: sortedRecipes,
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

  if (!context) {
    throw new Error("useRecipes must be used within a RecipeContextProvider");
  }

  return context;
};
