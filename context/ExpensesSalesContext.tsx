import {
  createDocument,
  deleteDocument,
  getAllUserData,
  updateDocument
} from "@/lib/services/databaseService";
import {
  AppwriteExpense,
  AppwriteSale,
  subscribeUserExpenses,
  subscribeUserSales,
} from "@/lib/services/expensesSalesSubscriptionService";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Models } from "react-native-appwrite";
import { useAuth } from "./AuthContext";

type MonthYear = {
  month: number;
  year: number;
};

type ContextType = {
  // Expenses
  expenses: AppwriteExpense[];
  currentMonthExpenses: AppwriteExpense[];
  addExpense: (data: Omit<AppwriteExpense, "$id" | "userId" | "$createdAt">) => Promise<Models.Document>;
  editExpense: (id: string, data: Partial<AppwriteExpense>) => Promise<Models.Document>;
  deleteExpense: (id: string) => Promise<void>;
  totalExpenses: number;

  // Sales
  sales: AppwriteSale[];
  currentMonthSales: AppwriteSale[];
  addSale: (data: Omit<AppwriteSale, "$id" | "userId" | "$createdAt">) => Promise<Models.Document>;
  editSale: (id: string, data: Partial<AppwriteSale>) => Promise<Models.Document>;
  deleteSale: (id: string) => Promise<void>;
  totalSalesRevenue: number;
  totalSalesCost: number;

  // Combined
  netProfit: number;
  loading: boolean;

  // Month/Year selection
  selectedMonth: MonthYear;
  setSelectedMonth: (month: MonthYear) => void;
  availableMonths: MonthYear[];

  // Refresh
  initialFetch: () => Promise<void>;
};

// Helper functions to transform documents
const transformExpenseDoc = (doc: any): AppwriteExpense => ({
  $id: doc.$id,
  userId: doc.userId,
  category: doc.category,
  amount: Number(doc.amount),
  description: doc.description || "",
  month: Number(doc.month),
  year: Number(doc.year),
  $createdAt:
    doc.$createdAt && !isNaN(new Date(doc.$createdAt).getTime())
      ? new Date(doc.$createdAt)
      : new Date(),
});

const transformSaleDoc = (doc: any): AppwriteSale => ({
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
  $createdAt:
    doc.$createdAt && !isNaN(new Date(doc.$createdAt).getTime())
      ? new Date(doc.$createdAt)
      : new Date(),
});

const ExpensesSalesContext = createContext<ContextType | undefined>(undefined);

export function ExpensesSalesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<AppwriteExpense[]>([]);
  const [sales, setSales] = useState<AppwriteSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Current month/year for filtering
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  // Filter expenses and sales for selected month
  const currentMonthExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => e.month === selectedMonth.month && e.year === selectedMonth.year
      ),
    [expenses, selectedMonth]
  );

  const currentMonthSales = useMemo(
    () =>
      sales.filter(
        (s) => s.month === selectedMonth.month && s.year === selectedMonth.year
      ),
    [sales, selectedMonth]
  );

  // Calculate totals for selected month
  const totalExpenses = useMemo(
    () => currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [currentMonthExpenses]
  );

  const totalSalesRevenue = useMemo(
    () => currentMonthSales.reduce((sum, s) => sum + s.totalRevenue, 0),
    [currentMonthSales]
  );

  const totalSalesCost = useMemo(
    () => currentMonthSales.reduce((sum, s) => sum + s.totalCost, 0),
    [currentMonthSales]
  );

  const netProfit = useMemo(
    () => totalSalesRevenue - totalSalesCost - totalExpenses,
    [totalSalesRevenue, totalSalesCost, totalExpenses]
  );

  // Get available months from all data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    expenses.forEach((e) => monthSet.add(`${e.year}-${e.month}`));
    sales.forEach((s) => monthSet.add(`${s.year}-${s.month}`));

    // Always include current month
    monthSet.add(`${now.getFullYear()}-${now.getMonth() + 1}`);

    return Array.from(monthSet)
      .map((key) => {
        const [year, month] = key.split("-").map(Number);
        return { month, year };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [expenses, sales]);

  // Initial fetch - get ALL data for history
  async function initialFetch() {
    if (!user?.$id) return;

    const [expensesRes, salesRes] = await Promise.all([
      getAllUserData("expenses", user.$id),
      getAllUserData("sales", user.$id),
    ]);

    setExpenses(expensesRes.map(transformExpenseDoc));
    setSales(salesRes.map(transformSaleDoc));
  }

  // Setup subscriptions
  useEffect(() => {
    let unsubExpenses: (() => void) | null = null;
    let unsubSales: (() => void) | null = null;

    async function setup() {
      if (!user?.$id) return;

      try {
        setLoading(true);
        await initialFetch();

        // Subscribe to expenses
        unsubExpenses = subscribeUserExpenses(user.$id, (doc, event) => {
          setExpenses((prev) => {
            if (event === "create") {
              const exists = prev.find((e) => e.$id === doc.$id);
              if (exists) return prev;
              return [...prev, doc];
            }
            if (event === "update") {
              return prev.map((e) => (e.$id === doc.$id ? doc : e));
            }
            if (event === "delete") {
              return prev.filter((e) => e.$id !== doc.$id);
            }
            return prev;
          });
        });

        // Subscribe to sales
        unsubSales = subscribeUserSales(user.$id, (doc, event) => {
          setSales((prev) => {
            if (event === "create") {
              const exists = prev.find((s) => s.$id === doc.$id);
              if (exists) return prev;
              return [...prev, doc];
            }
            if (event === "update") {
              return prev.map((s) => (s.$id === doc.$id ? doc : s));
            }
            if (event === "delete") {
              return prev.filter((s) => s.$id !== doc.$id);
            }
            return prev;
          });
        });
      } catch (error) {
        console.error("Error setting up expenses/sales subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    setup();

    return () => {
      if (unsubExpenses) unsubExpenses();
      if (unsubSales) unsubSales();
    };
  }, [user?.$id]);

  // CRUD Operations for Expenses
  function addExpense(data: Omit<AppwriteExpense, "$id" | "userId" | "$createdAt">) {
    return createDocument("expenses", {
      ...data,
      userId: user?.$id,
    });
  }

  function editExpense(id: string, data: Partial<AppwriteExpense>) {
    return updateDocument("expenses", id, data);
  }

  async function deleteExpense(id: string) {
    await deleteDocument("expenses", id);
  }

  // CRUD Operations for Sales
  function addSale(data: Omit<AppwriteSale, "$id" | "userId" | "$createdAt">) {
    return createDocument("sales", {
      ...data,
      userId: user?.$id,
    });
  }

  function editSale(id: string, data: Partial<AppwriteSale>) {
    return updateDocument("sales", id, data);
  }

  async function deleteSale(id: string) {
    await deleteDocument("sales", id);
  }

  return (
    <ExpensesSalesContext.Provider
      value={{
        expenses,
        currentMonthExpenses,
        addExpense,
        editExpense,
        deleteExpense,
        totalExpenses,
        sales,
        currentMonthSales,
        addSale,
        editSale,
        deleteSale,
        totalSalesRevenue,
        totalSalesCost,
        netProfit,
        loading,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        initialFetch,
      }}
    >
      {children}
    </ExpensesSalesContext.Provider>
  );
}

export const useExpensesSales = () => {
  const context = useContext(ExpensesSalesContext);
  if (context === undefined) {
    throw new Error(
      "useExpensesSales must be used within an ExpensesSalesProvider"
    );
  }
  return context;
};
