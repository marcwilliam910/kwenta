import ExpenseCard from "@/components/ExpenseCard";
import SaleCard from "@/components/SaleCard";
import {useExpensesSales} from "@/context/ExpensesSalesContext";
import {useIngredients} from "@/context/IngredientsContext";
import {useRecipes} from "@/context/RecipesContext";
import {
  AppwriteExpense,
  AppwriteSale,
} from "@/lib/services/expensesSalesSubscriptionService";
import Ionicons from "@expo/vector-icons/Ionicons";
import {Picker} from "@react-native-picker/picker";
import {useFocusEffect} from "expo-router";
import {useCallback, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {showMessage} from "react-native-flash-message";
import {useSafeAreaInsets} from "react-native-safe-area-context";

const EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Gas",
  "Rent",
  "Supplies",
  "Salaries",
  "Maintenance",
  "Marketing",
  "Internet",
  "Transportation",
  "Other Utilities",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Expenses() {
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const usableHeight = height - insets.top - insets.bottom;

  const {
    currentMonthExpenses,
    currentMonthSales,
    addExpense,
    editExpense,
    deleteExpense,
    addSale,
    editSale,
    deleteSale,
    totalExpenses,
    totalSalesRevenue,
    totalSalesCost,
    netProfit,
    loading,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    initialFetch,
  } = useExpensesSales();

  const {recipes} = useRecipes();
  const {ingredients} = useIngredients();

  // Modal states
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [isSaleModalVisible, setIsSaleModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: "",
    description: "",
  });
  const [editingExpense, setEditingExpense] = useState<AppwriteExpense | null>(
    null
  );

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    recipeId: "",
    quantity: "",
  });
  const [editingSale, setEditingSale] = useState<AppwriteSale | null>(null);

  const amountInputRef = useRef<any>(null);
  const descInputRef = useRef<any>(null);

  // Calculate recipe cost for selected recipe
  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.$id === saleForm.recipeId),
    [recipes, saleForm.recipeId]
  );

  const recipeCostData = useMemo(() => {
    if (!selectedRecipe) return null;

    const recipeIngredients = selectedRecipe.ingredients || {};
    let totalCost = 0;

    for (const [ingredientId, requiredQty] of Object.entries(
      recipeIngredients
    )) {
      const ingredient = ingredients.find((ing) => ing.$id === ingredientId);
      if (ingredient) {
        const perItemQty = Number(ingredient.quantity) || 0;
        const perItemCost = Number(ingredient.cost) || 0;
        if (perItemQty > 0) {
          totalCost += (requiredQty / perItemQty) * perItemCost;
        }
      }
    }

    const servings = selectedRecipe.servings || 1;
    const costPerServing = totalCost / servings;
    const targetMargin = selectedRecipe.targetProfit || 0;
    const sellingPrice = costPerServing * (1 + targetMargin / 100);

    return {
      totalCost,
      costPerServing,
      sellingPrice,
      targetMargin,
      servings,
    };
  }, [selectedRecipe, ingredients]);

  // Clean up form on modal close
  const cleanExpenseForm = () => {
    setExpenseForm({category: "", amount: "", description: ""});
    setEditingExpense(null);
  };

  const cleanSaleForm = () => {
    setSaleForm({recipeId: "", quantity: ""});
    setEditingSale(null);
  };

  useFocusEffect(
    useCallback(() => {
      setIsExpenseModalVisible(false);
      setIsSaleModalVisible(false);
      setIsHistoryModalVisible(false);
      cleanExpenseForm();
      cleanSaleForm();
    }, [])
  );

  // Expense handlers
  const handleOpenExpenseModal = (expense?: AppwriteExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        category: expense.category,
        amount: expense.amount.toString(),
        description: expense.description,
      });
    }
    setIsExpenseModalVisible(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalVisible(false);
    Keyboard.dismiss();
    cleanExpenseForm();
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount) {
      showMessage({
        message: "Validation Error",
        description: "Please select a category and enter an amount.",
        type: "warning",
      });
      return;
    }

    const amount = Number(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showMessage({
        message: "Validation Error",
        description: "Amount must be a positive number.",
        type: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date();

      if (editingExpense) {
        await editExpense(editingExpense.$id, {
          category: expenseForm.category,
          amount,
          description: expenseForm.description,
        });
        showMessage({
          message: "Expense Updated",
          description: "The expense has been updated successfully.",
          type: "success",
        });
      } else {
        await addExpense({
          category: expenseForm.category,
          amount,
          description: expenseForm.description,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
        showMessage({
          message: "Expense Added",
          description: "The expense has been recorded.",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      showMessage({
        message: "Error",
        description: "Failed to save expense. Please try again.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
      handleCloseExpenseModal();
    }
  };

  const handleDeleteExpense = (expense: AppwriteExpense) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        {text: "Cancel", style: "cancel"},
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(expense.$id);
              showMessage({
                message: "Expense Deleted",
                description: "The expense has been removed.",
                type: "success",
              });
            } catch (error) {
              console.error("Error deleting expense:", error);
              showMessage({
                message: "Error",
                description: "Failed to delete expense.",
                type: "danger",
              });
            }
          },
        },
      ]
    );
  };

  // Sale handlers
  const handleOpenSaleModal = (sale?: AppwriteSale) => {
    if (sale) {
      setEditingSale(sale);
      setSaleForm({
        recipeId: sale.recipeId,
        quantity: sale.quantitySold.toString(),
      });
    }
    setIsSaleModalVisible(true);
  };

  const handleCloseSaleModal = () => {
    setIsSaleModalVisible(false);
    Keyboard.dismiss();
    cleanSaleForm();
  };

  const handleSaveSale = async () => {
    if (!saleForm.recipeId || !saleForm.quantity) {
      showMessage({
        message: "Validation Error",
        description: "Please select a recipe and enter quantity.",
        type: "warning",
      });
      return;
    }

    if (!recipeCostData) {
      showMessage({
        message: "Validation Error",
        description: "Could not calculate recipe cost. Please try again.",
        type: "warning",
      });
      return;
    }

    const quantity = Number(saleForm.quantity);

    if (isNaN(quantity) || quantity <= 0) {
      showMessage({
        message: "Validation Error",
        description: "Quantity must be a positive number.",
        type: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date();
      const recipe = recipes.find((r) => r.$id === saleForm.recipeId);
      const pricePerUnit = recipeCostData.sellingPrice;
      const costPerUnit = recipeCostData.costPerServing;
      const totalRevenue = Math.round(quantity * pricePerUnit);
      const totalCost = Math.round(quantity * costPerUnit);

      if (editingSale) {
        await editSale(editingSale.$id, {
          recipeId: saleForm.recipeId,
          recipeName: recipe?.name || "Unknown Recipe",
          quantitySold: quantity,
          pricePerUnit: Math.round(pricePerUnit),
          totalRevenue,
          totalCost,
        });
        showMessage({
          message: "Sale Updated",
          description: "The sale has been updated successfully.",
          type: "success",
        });
      } else {
        await addSale({
          recipeId: saleForm.recipeId,
          recipeName: recipe?.name || "Unknown Recipe",
          quantitySold: quantity,
          pricePerUnit: Math.round(pricePerUnit),
          totalRevenue,
          totalCost,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
        showMessage({
          message: "Sale Recorded",
          description: "The sale has been added.",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error saving sale:", error);
      showMessage({
        message: "Error",
        description: "Failed to save sale. Please try again.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
      handleCloseSaleModal();
    }
  };

  const handleDeleteSale = (sale: AppwriteSale) => {
    Alert.alert("Delete Sale", "Are you sure you want to delete this sale?", [
      {text: "Cancel", style: "cancel"},
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSale(sale.$id);
            showMessage({
              message: "Sale Deleted",
              description: "The sale has been removed.",
              type: "success",
            });
          } catch (error) {
            console.error("Error deleting sale:", error);
            showMessage({
              message: "Error",
              description: "Failed to delete sale.",
              type: "danger",
            });
          }
        },
      },
    ]);
  };

  // Check if viewing current month
  const now = new Date();
  const isCurrentMonth =
    selectedMonth.month === now.getMonth() + 1 &&
    selectedMonth.year === now.getFullYear();

  if (loading) {
    return (
      <View
        className="items-center justify-center"
        style={{height: usableHeight - 100}}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40 + insets.bottom + 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={initialFetch}
            tintColor="#007AFF"
            colors={["#007AFF"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Month Selector */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xl font-bold text-gray-900">
              Expenses & Sales
            </Text>
            <Text className="text-sm text-gray-500">
              {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
            </Text>
          </View>
          <Pressable
            onPress={() => setIsHistoryModalVisible(true)}
            className="flex-row items-center gap-2 px-4 py-2 bg-gray-100 rounded-full active:bg-gray-200"
          >
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-700">History</Text>
          </Pressable>
        </View>

        {/* Summary Card */}
        <View className="p-4 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-base font-semibold text-gray-700">
            Monthly Summary
          </Text>
          <View className="flex-row justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Total Expenses</Text>
              <Text className="text-lg font-bold text-red-600">
                ₱{totalExpenses.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xs text-gray-500">Sales Revenue</Text>
              <Text className="text-lg font-bold text-emerald-600">
                ₱{totalSalesRevenue.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-xs text-gray-500">Sales Cost</Text>
              <Text className="text-lg font-bold text-orange-500">
                ₱{totalSalesCost.toFixed(2)}
              </Text>
            </View>
          </View>
          <View className="pt-3 border-t border-gray-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-600">
                Net Profit/Loss
              </Text>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={netProfit >= 0 ? "trending-up" : "trending-down"}
                  size={20}
                  color={netProfit >= 0 ? "#10b981" : "#ef4444"}
                />
                <Text
                  className={`text-xl font-bold ${
                    netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {netProfit >= 0 ? "+" : ""}₱{netProfit.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expenses Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-800">
              Expenses
            </Text>
            {isCurrentMonth && (
              <Pressable
                onPress={() => handleOpenExpenseModal()}
                className="flex-row items-center gap-1 px-3 py-2 rounded-full bg-red-50 active:bg-red-100"
              >
                <Ionicons name="add" size={18} color="#ef4444" />
                <Text className="text-sm font-medium text-red-600">
                  Add Expense
                </Text>
              </Pressable>
            )}
          </View>

          {currentMonthExpenses.length === 0 ? (
            <View className="items-center justify-center p-8 bg-gray-50 rounded-xl">
              <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
              <Text className="mt-2 text-sm text-gray-500">
                No expenses recorded for this month
              </Text>
            </View>
          ) : (
            currentMonthExpenses.map((expense) => (
              <ExpenseCard
                key={expense.$id}
                expense={expense}
                handleEdit={() => handleOpenExpenseModal(expense)}
                handleDelete={() => handleDeleteExpense(expense)}
              />
            ))
          )}
        </View>

        {/* Sales Section */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-800">Sales</Text>
            {isCurrentMonth && (
              <Pressable
                onPress={() => handleOpenSaleModal()}
                className="flex-row items-center gap-1 px-3 py-2 rounded-full bg-emerald-50 active:bg-emerald-100"
              >
                <Ionicons name="add" size={18} color="#10b981" />
                <Text className="text-sm font-medium text-emerald-600">
                  Add Sale
                </Text>
              </Pressable>
            )}
          </View>

          {currentMonthSales.length === 0 ? (
            <View className="items-center justify-center p-8 bg-gray-50 rounded-xl">
              <Ionicons name="cart-outline" size={40} color="#9ca3af" />
              <Text className="mt-2 text-sm text-gray-500">
                No sales recorded for this month
              </Text>
            </View>
          ) : (
            currentMonthSales.map((sale) => (
              <SaleCard
                key={sale.$id}
                sale={sale}
                handleEdit={() => handleOpenSaleModal(sale)}
                handleDelete={() => handleDeleteSale(sale)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={isExpenseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseExpenseModal}
      >
        <View className="flex-1 bg-black/50">
          <Pressable className="flex-1" onPress={handleCloseExpenseModal} />
          <View
            className="bg-white rounded-t-3xl"
            style={{
              height: height * 0.6,
              paddingBottom: insets.bottom,
            }}
          >
            <View className="items-center py-2">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            <ScrollView
              className="flex-1 px-6 py-4"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center justify-between pb-4">
                <Text className="text-xl font-semibold text-gray-900">
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </Text>
                <Pressable
                  onPress={handleCloseExpenseModal}
                  className="p-2 -mr-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              <View className="gap-4">
                {/* Category */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Category
                  </Text>
                  <View className="border border-gray-200 bg-gray-50 rounded-xl">
                    <Picker
                      selectedValue={expenseForm.category}
                      onValueChange={(value) =>
                        setExpenseForm((prev) => ({...prev, category: value}))
                      }
                      style={{height: 55, color: "#374151"}}
                    >
                      <Picker.Item
                        label="Select Category"
                        value=""
                        enabled={false}
                      />
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <Picker.Item key={cat} label={cat} value={cat} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Amount */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Amount (₱)
                  </Text>
                  <TextInput
                    ref={amountInputRef}
                    value={expenseForm.amount}
                    onChangeText={(text) => {
                      text = text.replace(/[^0-9.]/g, "");
                      setExpenseForm((prev) => ({...prev, amount: text}));
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Description */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Description (Optional)
                  </Text>
                  <TextInput
                    ref={descInputRef}
                    value={expenseForm.description}
                    onChangeText={(text) =>
                      setExpenseForm((prev) => ({...prev, description: text}))
                    }
                    placeholder="Add a note..."
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Buttons */}
                <View
                  className="gap-3"
                  style={{marginBottom: Platform.OS === "ios" ? 20 : 20}}
                >
                  <Pressable
                    onPress={handleSaveExpense}
                    disabled={isSubmitting}
                    className="py-4 bg-red-500 rounded-xl active:bg-red-600"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="font-medium text-center text-white">
                        {editingExpense ? "Update Expense" : "Add Expense"}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCloseExpenseModal}
                    className="py-4 border border-gray-300 rounded-xl active:bg-gray-100"
                  >
                    <Text className="font-medium text-center text-gray-700">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Sale Modal */}
      <Modal
        visible={isSaleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseSaleModal}
      >
        <View className="flex-1 bg-black/50">
          <Pressable className="flex-1" onPress={handleCloseSaleModal} />
          <View
            className="bg-white rounded-t-3xl"
            style={{
              height: height * 0.85,
              paddingBottom: insets.bottom,
            }}
          >
            <View className="items-center py-2">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            <ScrollView
              className="flex-1 px-6 py-4"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center justify-between pb-4">
                <Text className="text-xl font-semibold text-gray-900">
                  {editingSale ? "Edit Sale" : "Add Sale"}
                </Text>
                <Pressable onPress={handleCloseSaleModal} className="p-2 -mr-2">
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              <View className="gap-4">
                {/* Recipe Selection */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Recipe
                  </Text>
                  <View className="border border-gray-200 bg-gray-50 rounded-xl">
                    <Picker
                      selectedValue={saleForm.recipeId}
                      onValueChange={(value) =>
                        setSaleForm((prev) => ({...prev, recipeId: value}))
                      }
                      style={{height: 55, color: "#374151"}}
                    >
                      <Picker.Item
                        label="Select Recipe"
                        value=""
                        enabled={false}
                      />
                      {recipes.map((recipe) => (
                        <Picker.Item
                          key={recipe.$id}
                          label={recipe.name}
                          value={recipe.$id}
                        />
                      ))}
                    </Picker>
                  </View>

                  {/* Recipe Pricing Info */}
                  {recipeCostData && (
                    <View className="p-3 bg-blue-50 rounded-xl">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-blue-600">
                          Cost per serving:
                        </Text>
                        <Text className="text-xs font-medium text-blue-700">
                          ₱{recipeCostData.costPerServing.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-blue-600">
                          Target margin:
                        </Text>
                        <Text className="text-xs font-medium text-blue-700">
                          {recipeCostData.targetMargin}%
                        </Text>
                      </View>
                      <View className="flex-row justify-between pt-1 border-t border-blue-200">
                        <Text className="text-xs font-semibold text-blue-700">
                          Selling price:
                        </Text>
                        <Text className="text-xs font-bold text-blue-800">
                          ₱{recipeCostData.sellingPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Quantity */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Quantity Sold
                  </Text>
                  <TextInput
                    value={saleForm.quantity}
                    onChangeText={(text) => {
                      text = text.replace(/[^0-9]/g, "");
                      setSaleForm((prev) => ({...prev, quantity: text}));
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Sale Preview */}
                {saleForm.quantity && recipeCostData && (
                  <View className="p-4 bg-gray-50 rounded-xl">
                    <Text className="mb-2 text-sm font-semibold text-gray-700">
                      Sale Preview
                    </Text>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-gray-600">Revenue:</Text>
                      <Text className="text-sm font-medium text-emerald-600">
                        ₱
                        {(
                          Number(saleForm.quantity) *
                          recipeCostData.sellingPrice
                        ).toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-gray-600">Cost:</Text>
                      <Text className="text-sm font-medium text-red-500">
                        ₱
                        {(
                          Number(saleForm.quantity) *
                          recipeCostData.costPerServing
                        ).toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t border-gray-200">
                      <Text className="text-sm font-medium text-gray-700">
                        Profit:
                      </Text>
                      <Text
                        className={`text-sm font-bold ${
                          Number(saleForm.quantity) *
                            (recipeCostData.sellingPrice -
                              recipeCostData.costPerServing) >=
                          0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        ₱
                        {(
                          Number(saleForm.quantity) *
                          (recipeCostData.sellingPrice -
                            recipeCostData.costPerServing)
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Buttons */}
                <View
                  className="gap-3"
                  style={{marginBottom: Platform.OS === "ios" ? 20 : 20}}
                >
                  <Pressable
                    onPress={handleSaveSale}
                    disabled={isSubmitting}
                    className="py-4 bg-emerald-500 rounded-xl active:bg-emerald-600"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="font-medium text-center text-white">
                        {editingSale ? "Update Sale" : "Record Sale"}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCloseSaleModal}
                    className="py-4 border border-gray-300 rounded-xl active:bg-gray-100"
                  >
                    <Text className="font-medium text-center text-gray-700">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View className="flex-1 bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => setIsHistoryModalVisible(false)}
          />
          <View
            className="bg-white rounded-t-3xl"
            style={{
              height: height * 0.5,
              paddingBottom: insets.bottom,
            }}
          >
            <View className="items-center py-2">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            <View className="flex-1 px-6 py-4">
              <View className="flex-row items-center justify-between pb-4">
                <Text className="text-xl font-semibold text-gray-900">
                  View History
                </Text>
                <Pressable
                  onPress={() => setIsHistoryModalVisible(false)}
                  className="p-2 -mr-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              <FlatList
                data={availableMonths}
                keyExtractor={(item) => `${item.year}-${item.month}`}
                renderItem={({item}) => {
                  const isSelected =
                    item.month === selectedMonth.month &&
                    item.year === selectedMonth.year;
                  const isCurrent =
                    item.month === now.getMonth() + 1 &&
                    item.year === now.getFullYear();

                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedMonth(item);
                        setIsHistoryModalVisible(false);
                      }}
                      className={`flex-row items-center justify-between p-4 mb-2 rounded-xl ${
                        isSelected
                          ? "bg-emerald-50 border-2 border-emerald-500"
                          : "bg-gray-50"
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`w-10 h-10 items-center justify-center rounded-full ${
                            isSelected ? "bg-emerald-500" : "bg-gray-200"
                          }`}
                        >
                          <Ionicons
                            name="calendar"
                            size={20}
                            color={isSelected ? "white" : "#6b7280"}
                          />
                        </View>
                        <View>
                          <Text
                            className={`text-base font-semibold ${
                              isSelected ? "text-emerald-700" : "text-gray-900"
                            }`}
                          >
                            {MONTH_NAMES[item.month - 1]} {item.year}
                          </Text>
                          {isCurrent && (
                            <Text className="text-xs text-gray-500">
                              Current Month
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#10b981"
                        />
                      )}
                    </Pressable>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
