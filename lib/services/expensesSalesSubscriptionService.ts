import { Models } from "react-native-appwrite";
import { appwriteConfig, client } from "../appwrite";

// Expense types
export type AppwriteExpense = {
  $id: string;
  userId: string;
  category: string;
  amount: number;
  description: string;
  month: number;
  year: number;
  $createdAt: Date;
};

type ExpenseDoc = Models.Document &
  Omit<AppwriteExpense, "$createdAt"> & {
    $createdAt: string;
  };

function mapDocToExpense(doc: ExpenseDoc): AppwriteExpense {
  return {
    $id: doc.$id,
    userId: doc.userId,
    category: doc.category,
    amount: Number(doc.amount),
    description: doc.description || "",
    month: Number(doc.month),
    year: Number(doc.year),
    $createdAt: new Date(doc.$createdAt),
  };
}

// Sales types
export type AppwriteSale = {
  $id: string;
  userId: string;
  recipeId: string;
  recipeName: string;
  quantitySold: number;
  pricePerUnit: number;
  totalRevenue: number;
  totalCost: number;
  month: number;
  year: number;
  $createdAt: Date;
};

type SaleDoc = Models.Document &
  Omit<AppwriteSale, "$createdAt"> & {
    $createdAt: string;
  };

function mapDocToSale(doc: SaleDoc): AppwriteSale {
  return {
    $id: doc.$id,
    userId: doc.userId,
    recipeId: doc.recipeId,
    recipeName: doc.recipeName,
    quantitySold: Number(doc.quantitySold),
    pricePerUnit: Number(doc.pricePerUnit),
    totalRevenue: Number(doc.totalRevenue),
    totalCost: Number(doc.totalCost),
    month: Number(doc.month),
    year: Number(doc.year),
    $createdAt: new Date(doc.$createdAt),
  };
}

export function subscribeUserExpenses(
  userId: string,
  callback: (
    doc: AppwriteExpense,
    event: "create" | "update" | "delete"
  ) => void
) {
  const unsubscribe = client.subscribe(
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.expensesCollectionId}.documents`,
    (response) => {
      const doc = response.payload as ExpenseDoc;

      // skip if not this user's
      if (doc.userId !== userId) return;

      if (response.events.some((e) => e.endsWith(".create"))) {
        callback(mapDocToExpense(doc), "create");
      }
      if (response.events.some((e) => e.endsWith(".update"))) {
        callback(mapDocToExpense(doc), "update");
      }
      if (response.events.some((e) => e.endsWith(".delete"))) {
        callback(mapDocToExpense(doc), "delete");
      }
    }
  );

  return unsubscribe;
}

export function subscribeUserSales(
  userId: string,
  callback: (doc: AppwriteSale, event: "create" | "update" | "delete") => void
) {
  const unsubscribe = client.subscribe(
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.salesCollectionId}.documents`,
    (response) => {
      const doc = response.payload as SaleDoc;

      // skip if not this user's
      if (doc.userId !== userId) return;

      if (response.events.some((e) => e.endsWith(".create"))) {
        callback(mapDocToSale(doc), "create");
      }
      if (response.events.some((e) => e.endsWith(".update"))) {
        callback(mapDocToSale(doc), "update");
      }
      if (response.events.some((e) => e.endsWith(".delete"))) {
        callback(mapDocToSale(doc), "delete");
      }
    }
  );

  return unsubscribe;
}
