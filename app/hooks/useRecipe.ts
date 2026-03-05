import {appwriteConfig, databases} from "@/lib/appwrite";
import {useEffect, useState} from "react";

type AppwriteRecipe = {
  $id: string;
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: Record<string, number>;
  laborCosts?: {
    costPerDay: string;
    employees: string;
  }[];
  overheadCosts?: {
    type: "Rent" | "Utilities" | "Miscellaneous Fees";
    amount: string;
    units: string;
  }[];
};

type IngredientDoc = {
  $id: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
  inflationRate: number;
};

export default function useRecipeCost(recipe: AppwriteRecipe) {
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const ids = Object.keys(recipe.ingredients || {});
    if (ids.length === 0) {
      setIngredients([]);
      setLoading(false);
      return;
    }

    const fetchIngredients = async () => {
      try {
        const results = await Promise.allSettled(
          ids.map((id) =>
            databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.ingredientsCollectionId,
              id,
            ),
          ),
        );

        const docs = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => {
            const doc = (r as PromiseFulfilledResult<any>).value;
            // Explicitly map each field — prevents inflationRate from being undefined
            // if Appwrite returns it as null for older documents
            return {
              $id: doc.$id,
              name: doc.name,
              unit: doc.unit,
              quantity: Number(doc.quantity ?? 0),
              cost: Number(doc.cost ?? 0),
              inflationRate: Number(doc.inflationRate ?? 0),
            } as IngredientDoc;
          });

        if (mounted) setIngredients(docs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIngredients();
    return () => {
      mounted = false;
    };
  }, [recipe]);

  // Ingredient costs — apply per-ingredient inflation rate to base cost
  const perIngredient = ingredients.map((ing) => {
    const requiredQty = Number(recipe.ingredients[ing.$id] ?? 0);
    const baseCost = Number(ing.cost ?? 0);
    const inflationRate = Number(ing.inflationRate ?? 0);
    const effectiveCost = baseCost * (1 + inflationRate / 100);

    // For "piece" unit: cost per package IS cost per piece, so perItemQty = 1
    // For other units (kg, g, ml, etc): perItemQty = package size (e.g. 500g per bag)
    const perItemQty = ing.unit === "piece" ? 1 : Number(ing.quantity ?? 1);

    const cost =
      perItemQty > 0 ? (requiredQty / perItemQty) * effectiveCost : 0;

    return {...ing, requiredQty, cost, effectiveCost};
  });

  const ingredientTotalCost = perIngredient.reduce((s, i) => s + i.cost, 0);

  // Labor costs
  const laborTotalCost = (recipe.laborCosts ?? []).reduce((sum, labor) => {
    const costPerDay = Number(labor.costPerDay) || 0;
    const employees = Number(labor.employees) || 0;
    return sum + costPerDay * employees;
  }, 0);

  // Overhead costs: amount spread across  produced
  // cost per unit = amount / units; multiply by servings for this recipe's share
  const overheadTotalCost = (recipe.overheadCosts ?? []).reduce(
    (sum, overhead) => {
      const amount = Number(overhead.amount) || 0;
      const units = Number(overhead.units) || 1;
      return sum + (amount / units) * recipe.servings;
    },
    0,
  );

  const totalCost = ingredientTotalCost + laborTotalCost + overheadTotalCost;
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;
  const profitPerServing = (costPerServing * (recipe.targetProfit ?? 0)) / 100;
  const pricePerServing = costPerServing + profitPerServing;
  const totalAmount = pricePerServing * recipe.servings;

  return {
    loading,
    error,
    ingredients: perIngredient,
    ingredientTotalCost,
    laborTotalCost,
    overheadTotalCost,
    totalCost,
    costPerServing,
    profitPerServing,
    pricePerServing,
    totalAmount,
  };
}
