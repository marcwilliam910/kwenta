import {appwriteConfig, databases} from "@/lib/appwrite"; // adjust your import
import {useEffect, useState} from "react";

type AppwriteRecipe = {
  $id: string;
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: Record<string, number>;
};

type IngredientDoc = {
  $id: string;
  name: string;
  unit: string;
  quantity: number; // package size (e.g. 45g per item)
  cost: number; // price per package
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
              id
            )
          )
        );

        const docs = results
          .filter((r) => r.status === "fulfilled")
          .map(
            (r) => (r as PromiseFulfilledResult<any>).value as IngredientDoc
          );

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

  // compute cost
  const perIngredient = ingredients.map((ing) => {
    const requiredQty = Number(recipe.ingredients[ing.$id] ?? 0);
    const perItemQty = Number(ing.quantity ?? 0);
    const perItemCost = Number(ing.cost ?? 0);

    const cost = perItemQty > 0 ? (requiredQty / perItemQty) * perItemCost : 0;

    return {...ing, requiredQty, cost};
  });

  const totalCost = perIngredient.reduce((s, i) => s + i.cost, 0);
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;
  const profitPerServing = (costPerServing * (recipe.targetProfit ?? 0)) / 100;
  const pricePerServing = costPerServing + profitPerServing;
  const totalAmount = pricePerServing * recipe.servings;

  return {
    loading,
    error,
    ingredients: perIngredient,
    totalCost,
    costPerServing,
    profitPerServing,
    pricePerServing,
    totalAmount,
  };
}
