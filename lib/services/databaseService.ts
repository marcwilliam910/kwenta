import {AppwriteIngredient} from "@/app/(tabs)/inventory";
import {Query} from "react-native-appwrite";
import {appwriteConfig, databases, ID} from "../appwrite";

export const createDocument = async (
  collectionId: string,
  data: Record<string, unknown>
) => {
  return await databases.createDocument({
    databaseId: appwriteConfig.databaseId,
    collectionId: collectionId,
    documentId: ID.unique(),
    data,
  });
};

export const deleteDocument = async (
  collectionId: string,
  documentId: string
) => {
  return await databases.deleteDocument({
    databaseId: appwriteConfig.databaseId,
    collectionId: collectionId,
    documentId: documentId,
  });
};

export async function updateDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
) {
  return await databases.updateDocument({
    databaseId: appwriteConfig.databaseId,
    collectionId: collectionId,
    documentId: documentId,
    data,
  });
}

export async function updateIngredientNotification(
  ingredientId: string,
  notificationId: string
) {
  try {
    await databases.updateDocument({
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.ingredientsCollectionId,
      documentId: ingredientId,
      data: {
        notificationId,
        notificationScheduled: true,
      },
    });
  } catch (error) {
    console.error("Failed to update ingredient notification info:", error);
  }
}

export async function getTableData(collectionId: string, userId: string) {
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    collectionId,
    [Query.equal("userId", userId), Query.orderDesc("$createdAt")]
  );

  return res.documents;
}

export async function getRowCount(collectionId: string, userId: string) {
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    collectionId,
    [Query.equal("userId", userId), Query.limit(1)]
  );

  return res.total;
}

export async function getExpiringIngredients(
  collectionId: string,
  userId: string
) {
  const now = new Date();
  const fiveDaysLater = new Date(now);
  fiveDaysLater.setDate(now.getDate() + 7);

  const expiring = await databases.listDocuments(
    appwriteConfig.databaseId,
    collectionId,
    [
      Query.equal("userId", userId),
      Query.lessThanEqual("expires", fiveDaysLater.toISOString()),
    ]
  );

  const expiringIngredients: AppwriteIngredient[] = expiring.documents.map(
    (doc) => ({
      $id: doc.$id,
      name: doc.name,
      stock: Number(doc.stock),
      unit: doc.unit,
      userId: doc.userId,
      quantity: Number(doc.quantity),
      cost: Number(doc.cost),
      expires: new Date(doc.expires),
      $createdAt: new Date(doc.$createdAt),
    })
  );

  return expiringIngredients;
}
