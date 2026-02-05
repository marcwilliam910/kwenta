import RecipeCardSkeleton from "@/components/skeletons/recipeCardSkeleton";
import {useAuth} from "@/context/AuthContext";
import {useExpensesSales} from "@/context/ExpensesSalesContext";
import {useIngredients} from "@/context/IngredientsContext";
import {AppwriteRecipe, useRecipes} from "@/context/RecipesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import {LinearGradient} from "expo-linear-gradient";
import {router} from "expo-router";
import {FlatList, Pressable, ScrollView, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import useRecipeCost from "../hooks/useRecipe";
import {AppwriteIngredient} from "./inventory";

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

export default function Dashboard() {
  const {user} = useAuth();
  const insets = useSafeAreaInsets();

  const {recipes} = useRecipes();
  const {ingredients} = useIngredients();
  const {
    totalExpenses,
    totalSalesRevenue,
    totalSalesCost,
    netProfit,
    currentMonthSales,
    currentMonthExpenses,
    selectedMonth,
  } = useExpensesSales();

  const ingredientCount = ingredients.length || 0;
  const recipeCount = recipes.length || 0;
  const salesCount = currentMonthSales.length || 0;
  const expensesCount = currentMonthExpenses.length || 0;

  const expiringIngredients = ingredients.filter((ing) => {
    const today = new Date();
    const expiry = new Date(ing.expires);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays <= 3 && diffDays >= -3;
  });

  // last 3 recipes by createdAt
  const recentRecipes = [...recipes]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  // // Test ingredient expiration notification
  // const testIngredientNotification = async () => {
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: "🚨 Ingredient Expiring Soon!",
  //       body: "Test Tomatoes expires in 3 days (Dec 25, 2024)",
  //       data: {
  //         ingredientId: "test-123",
  //         type: "expiration_alert",
  //       },
  //       sound: "default",
  //     },
  //     trigger: {
  //       type: Notifications.SchedulableTriggerInputTypes.DATE,
  //       date: new Date(Date.now() + 3 * 1000), // 3 seconds from now
  //     },
  //   });
  // };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingBottom: 40 + insets.bottom + 16, // 16 is extra spacing
      }} // 10% of screen height
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-6 p-4">
        {/* Welcome Card */}
        <LinearGradient
          colors={["#0ecc8f", "#0FA7B1"]} // exact colors from your screenshot
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={{
            padding: 24,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <Text
            className="mb-2 text-2xl font-bold text-white"
            numberOfLines={2}
          >
            {user?.businessName}
          </Text>
          <Text className="text-emerald-100">
            Smart Costing & Inventory Tracker
          </Text>
        </LinearGradient>

        {/* Quick Stats */}
        <View className="flex-row gap-4">
          <Pressable
            className="flex-row items-center justify-between flex-1 p-4 bg-white rounded-2xl active:border active:border-emerald-300 "
            onPress={() => router.push("/recipes")}
          >
            <View>
              <Text className="mb-1 text-sm text-gray-600">Total Recipes</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {recipeCount}
              </Text>
            </View>
            <Ionicons name="calculator-outline" size={30} color="#0ecc8f" />
          </Pressable>
          <Pressable
            className="flex-row items-center justify-between flex-1 p-4 bg-white rounded-2xl active:border active:border-emerald-300"
            onPress={() => router.push("/inventory")}
          >
            <View>
              <Text className="mb-1 text-sm text-gray-600">Ingredients</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {ingredientCount}
              </Text>
            </View>
            <Ionicons name="cube-outline" size={30} color="#0564fc" />
          </Pressable>
        </View>

        {/* Financial Summary */}
        <Pressable
          className="p-4 bg-white rounded-2xl active:border active:border-emerald-300"
          onPress={() => router.push("/expenses")}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="stats-chart" size={20} color="#6366f1" />
              <Text className="text-base font-semibold text-gray-800">
                Financial Summary
              </Text>
            </View>
            <View className="px-2 py-1 rounded-full bg-indigo-50">
              <Text className="text-xs font-medium text-indigo-600">
                {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
              </Text>
            </View>
          </View>

          {/* Net Profit Highlight */}
          <View
            className={`p-4 mb-4 rounded-xl ${netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}
          >
            <Text
              className={`text-sm ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              Net Profit
            </Text>
            <Text
              className={`text-3xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              ₱{netProfit.toFixed(2)}
            </Text>
          </View>

          {/* Revenue & Expenses Row */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 p-3 rounded-xl bg-blue-50">
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons name="trending-up" size={14} color="#2563eb" />
                <Text className="text-xs text-blue-600">Revenue</Text>
              </View>
              <Text className="text-lg font-bold text-blue-700">
                ₱{totalSalesRevenue.toFixed(2)}
              </Text>
              <Text className="text-xs text-blue-500">
                {salesCount} sale{salesCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <View className="flex-1 p-3 rounded-xl bg-orange-50">
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons name="trending-down" size={14} color="#ea580c" />
                <Text className="text-xs text-orange-600">Expenses</Text>
              </View>
              <Text className="text-lg font-bold text-orange-700">
                ₱{totalExpenses.toFixed(2)}
              </Text>
              <Text className="text-xs text-orange-500">
                {expensesCount} expense{expensesCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Cost of Goods */}
          <View className="flex-row items-center justify-between p-3 rounded-lg bg-gray-50">
            <View className="flex-row items-center gap-2">
              <Ionicons name="cart-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600">Cost of Goods Sold</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-700">
              ₱{totalSalesCost.toFixed(2)}
            </Text>
          </View>

          {/* View Details Link */}
          <View className="flex-row items-center justify-center gap-1 pt-3 mt-3 border-t border-gray-100">
            <Text className="text-sm font-medium text-indigo-600">
              View Details
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#6366f1" />
          </View>
        </Pressable>

        {/* Recent Alerts */}
        <View className="gap-5 p-4 bg-white rounded-xl max-h-96">
          <View className="flex-row items-center gap-1">
            <Ionicons name="notifications-outline" size={20} color="tomato" />
            <Text className="font-bold text-gray-500">Recent Alerts</Text>
          </View>

          {expiringIngredients.length === 0 ? (
            <View className="items-center justify-center p-6 pt-2">
              {/* Your empty state content */}
              <View className="items-center justify-center w-16 h-16 mb-3 rounded-full bg-green-50">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={32}
                  color="#10b981"
                />
              </View>
              <Text className="mb-2 text-base font-semibold text-center text-gray-800">
                All Good Here! 🎉
              </Text>
              <Text className="mb-3 text-sm leading-5 text-center text-gray-500">
                No ingredients are expiring soon.{"\n"}
                Your inventory is well managed!
              </Text>
              <View className="flex-row items-center gap-1 px-3 py-2 rounded-lg bg-gray-50">
                <Ionicons name="bulb-outline" size={14} color="#6b7280" />
                <Text className="text-xs text-gray-600">
                  Check back regularly to stay updated
                </Text>
              </View>
            </View>
          ) : (
            <View className="max-h-60">
              <FlatList
                data={expiringIngredients}
                renderItem={({item}) => <ExpiringCard ingredient={item} />}
                keyExtractor={(item) => item.$id}
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>
        <View className="p-4 bg-white rounded-xl">
          {recentRecipes.length === 0 ? (
            <View className="items-center justify-center px-8 py-6 rounded-lg bg-gray-50">
              <View className="items-center justify-center w-24 h-24 mb-6 bg-gray-100 rounded-full">
                <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="mb-2 text-xl font-semibold text-center text-gray-800">
                No Recipes Yet
              </Text>
              <Text className="mb-2 text-base leading-6 text-center text-gray-500">
                Add your first recipe to get started
              </Text>
            </View>
          ) : (
            <View>
              <Text className="mb-4 text-lg font-semibold text-gray-800">
                Recent Recipes
              </Text>
              {recentRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.$id}
                  recipe={recipe}
                  className="bg-gray-100"
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const ExpiringCard = ({ingredient}: {ingredient: AppwriteIngredient}) => {
  // Fix the date calculation to use start of day for both dates
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const expiryDate = new Date(ingredient.expires);
  const expiryStart = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate()
  );

  const daysUntilExpiry = Math.ceil(
    (expiryStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isPieces = ingredient.unit.toLowerCase() === "piece";
  const packCount =
    !isPieces && ingredient.quantity > 0
      ? ingredient.stock / ingredient.quantity
      : ingredient.stock;
  const totalAmount = isPieces
    ? `${ingredient.stock} ${ingredient.unit}${ingredient.stock > 1 ? "s" : ""}`
    : `${ingredient.stock}${ingredient.unit} (${packCount.toFixed(1)} pack${packCount > 1 ? "s" : ""})`;

  const getCardStyles = () => {
    if (daysUntilExpiry < 0) {
      // Expired - RED with different icon
      return {
        borderColor: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconName: "close-circle" as const,
        iconColor: "#DC2626",
        titleColor: "text-red-900",
        amountColor: "text-red-700",
        expireColor: "text-red-600",
      };
    } else if (daysUntilExpiry <= 2) {
      // 0-3 days (including today) - RED (critical)
      return {
        borderColor: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconName: "alert-circle" as const,
        iconColor: "#DC2626",
        titleColor: "text-red-900",
        amountColor: "text-red-700",
        expireColor: "text-red-600",
      };
    } else {
      // Within 3 days - YELLOW (warning)
      return {
        borderColor: "bg-yellow-50 border-yellow-300",
        iconBg: "bg-yellow-100",
        iconName: "warning-outline" as const,
        iconColor: "#F59E0B",
        titleColor: "text-yellow-900",
        amountColor: "text-yellow-700",
        expireColor: "text-yellow-600",
      };
    }
  };

  const styles = getCardStyles();

  return (
    <View
      className={`flex-row items-center p-3 mb-2 border rounded-lg ${styles.borderColor}`}
    >
      <View
        className={`items-center justify-center w-10 h-10 mr-3 rounded-full ${styles.iconBg}`}
      >
        <Ionicons name={styles.iconName} size={20} color={styles.iconColor} />
      </View>

      <View className="flex-1">
        <Text className={`text-base font-semibold ${styles.titleColor}`}>
          {ingredient.name}
        </Text>
        <Text className={`text-sm ${styles.amountColor}`}>{totalAmount}</Text>
        <Text className={`text-xs ${styles.expireColor}`}>
          {daysUntilExpiry < 0
            ? `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? "s" : ""} ago`
            : daysUntilExpiry === 0
              ? "Expires today"
              : daysUntilExpiry === 1
                ? "Expires tomorrow"
                : `Expires in ${daysUntilExpiry} days`}
        </Text>
      </View>
    </View>
  );
};

const RecipeCard = ({
  recipe,
  className,
}: {
  recipe: AppwriteRecipe;
  className?: string;
}) => {
  const {loading, error, totalCost, pricePerServing, totalAmount, ingredients} =
    useRecipeCost(recipe);

  if (loading) return <RecipeCardSkeleton />;

  if (error) {
    return (
      <View className="p-4 mb-3 bg-red-100 rounded-lg">
        <Text className="text-red-600">Error: {error}</Text>
      </View>
    );
  }

  return (
    <View className={`p-4 mb-3 rounded-lg gap-3 ${className}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-gray-800">
            {recipe.name}
          </Text>
          <Text className="text-sm text-gray-500">
            {recipe.servings} serving{recipe.servings > 1 ? "s" : ""}
          </Text>
        </View>

        <View className="items-end gap-2">
          <Text className="text-base font-semibold text-teal-600">
            ₱{pricePerServing.toFixed(2)}/serving
          </Text>
        </View>
      </View>

      <View className="gap-2 pt-2 border-t border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">
            Cost: ₱{totalCost.toFixed(2)}
          </Text>
          <Text className="text-sm font-medium text-gray-700">
            Total: ₱{totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
