import {AppwriteRecipe as BaseAppwriteRecipe} from "@/app/(tabs)/recipes";
import {Models} from "react-native-appwrite";
import {appwriteConfig, client} from "../appwrite";

type AppwriteRecipe = BaseAppwriteRecipe & {userId: string};

type RecipeDoc = Models.Document & {
  $id: string;
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: string;
  userId: string;
};

function mapDocToRecipe(doc: RecipeDoc): AppwriteRecipe {
  return {
    $id: doc.$id,
    name: doc.name,
    servings: Number(doc.servings),
    targetProfit: Number(doc.targetProfit),
    ingredients: JSON.parse(doc.ingredients) as {[key: string]: number},
    userId: doc.userId,
    createdAt: new Date(doc.$createdAt),
  };
}

export function subscribeUserRecipes(
  userId: string,
  callback: (doc: AppwriteRecipe, event: "create" | "update" | "delete") => void
) {
  const unsubscribe = client.subscribe(
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.recipesCollectionId}.documents`,
    (response) => {
      const doc = response.payload as RecipeDoc;

      // skip if not this user's
      if (doc.userId !== userId) return;

      if (response.events.some((e) => e.endsWith(".create"))) {
        callback(mapDocToRecipe(doc), "create");
      }
      if (response.events.some((e) => e.endsWith(".update"))) {
        callback(mapDocToRecipe(doc), "update");
      }
      if (response.events.some((e) => e.endsWith(".delete"))) {
        callback(mapDocToRecipe(doc), "delete");
      }
    }
  );

  return unsubscribe;
}
