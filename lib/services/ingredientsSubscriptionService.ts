import {AppwriteIngredient as BaseAppwriteIngredient} from "@/app/(tabs)/inventory";
import {Models} from "react-native-appwrite";
import {appwriteConfig, client} from "../appwrite";

type AppwriteIngredient = BaseAppwriteIngredient & {userId: string};

type IngredientDoc = Models.Document & AppwriteIngredient;

function mapDocToIngredient(doc: IngredientDoc): AppwriteIngredient {
  return {
    $id: doc.$id,
    name: doc.name,
    stock: Number(doc.stock),
    unit: doc.unit,
    quantity: Number(doc.quantity),
    cost: Number(doc.cost),
    userId: doc.userId,
    expires: new Date(doc.expires),
  };
}

export function subscribeUserIngredients(
  userId: string,
  callback: (
    doc: AppwriteIngredient,
    event: "create" | "update" | "delete"
  ) => void
) {
  const unsubscribe = client.subscribe(
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ingredientsCollectionId}.documents`,
    (response) => {
      const doc = response.payload as IngredientDoc;

      // skip if not this user's
      if (doc.userId !== userId) return;

      if (response.events.some((e) => e.endsWith(".create"))) {
        callback(mapDocToIngredient(doc), "create");
      }
      if (response.events.some((e) => e.endsWith(".update"))) {
        callback(mapDocToIngredient(doc), "update");
      }
      if (response.events.some((e) => e.endsWith(".delete"))) {
        callback(mapDocToIngredient(doc), "delete");
      }
    }
  );

  return unsubscribe;
}
