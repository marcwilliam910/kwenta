import IngredientSelectionCard from "@/components/IngredientSelectionCard";
import RecipeCard from "@/components/RecipeCard";
import { useIngredients } from "@/context/IngredientsContext";
import { useRecipes } from "@/context/RecipesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { showMessage } from "react-native-flash-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// types
type RecipeInput = {
  name: string;
  servings: number;
  targetProfit: number;
  ingredients: Record<string, number>;
};

type RecipeErrors = {
  name?: string;
  servings?: string;
  targetProfit?: string;
  ingredients?: string;
  insufficientStock?: string;
};

export function validateRecipe(
  input: RecipeInput,
  setErrors: (errors: RecipeErrors) => void,
): boolean {
  const errors: RecipeErrors = {};
  let isValid = true;

  if (!input.name?.trim()) {
    errors.name = "Recipe name is required";
    isValid = false;
  }

  if (isNaN(input.servings) || input.servings < 1) {
    errors.servings = "Servings must be greater than 0";
    isValid = false;
  }

  if (isNaN(input.targetProfit) || input.targetProfit < 1) {
    errors.targetProfit = "Target profit must be greater than 0";
    isValid = false;
  }

  if (
    !input.ingredients ||
    Object.keys(input.ingredients).length === 0 ||
    Object.values(input.ingredients).some((val) => isNaN(val) || val < 0)
  ) {
    errors.ingredients =
      "At least one ingredient with valid quantity is required";
    isValid = false;
  }

  setErrors(errors);
  return isValid;
}

// Helper function to validate stock availability
type StockValidationResult = {
  isValid: boolean;
  insufficientItems: {
    name: string;
    requested: number;
    available: number;
    unit: string;
  }[];
};

type StockIngredient = {
  $id: string;
  name: string;
  stock: number;
  unit: string;
  quantity: number;
};

const formatAmount = (value: number) => {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const getPackUsage = (requestedQty: number, ingredient: StockIngredient) => {
  const unit = ingredient.unit?.toLowerCase();
  if (unit === "piece") return requestedQty;
  const packSize = ingredient.quantity;
  if (!packSize || isNaN(packSize) || packSize <= 0) return 0;
  return requestedQty / packSize;
};

export function validateStockAvailability(
  selectedIngredients: Record<string, number>,
  ingredientsList: StockIngredient[],
  previousIngredients?: Record<string, number>,
): StockValidationResult {
  const insufficientItems: {
    name: string;
    requested: number;
    available: number;
    unit: string;
  }[] = [];

  for (const [ingredientId, requestedQty] of Object.entries(selectedIngredients)) {
    const ingredient = ingredientsList.find((ing) => ing.$id === ingredientId);
    if (!ingredient) continue;

    // Calculate effective available stock in packs (current stock + restore from previous recipe)
    const previousQty = previousIngredients?.[ingredientId] || 0;
    const previousPackUsage = getPackUsage(previousQty, ingredient);
    const effectiveAvailablePacks = ingredient.stock + previousPackUsage;
    const requestedPackUsage = getPackUsage(requestedQty, ingredient);
    const unit = ingredient.unit || "";
    const availableAmount =
      unit.toLowerCase() === "piece"
        ? effectiveAvailablePacks
        : effectiveAvailablePacks * ingredient.quantity;

    if (requestedPackUsage > effectiveAvailablePacks) {
      insufficientItems.push({
        name: ingredient.name,
        requested: requestedQty,
        available: availableAmount,
        unit,
      });
    }
  }

  return {
    isValid: insufficientItems.length === 0,
    insufficientItems,
  };
}

export default function Recipes() {
  const {
    recipes,
    loading,
    addRecipe,
    deleteRecipe,
    editRecipe,
    initialFetchRecipes,
  } = useRecipes();
  const { ingredients, editIngredient: updateIngredientStock } = useIngredients();
  const [isCustomProfit, setIsCustomProfit] = useState(false);
  const [customProfit, setCustomProfit] = useState("");
  const insets = useSafeAreaInsets();
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    servings: "",
    targetProfit: "",
  });
  const [errors, setErrors] = useState<RecipeErrors>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<{
    [id: string]: string;
  }>({});
  const { height } = useWindowDimensions();
  const usableHeight = height - insets.top - insets.bottom;

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const servingsInputRef = useRef<any>(null);

  // Sort recipes by creation date (most recent first)
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [recipes]);

  // toggle selection
  const toggleIngredient = (id: string) => {
    setSelectedIngredients((prev) => {
      const copy = { ...prev };
      if (copy[id] !== undefined) {
        delete copy[id]; // deselect
      } else {
        copy[id] = ""; // select with empty quantity
      }
      return copy;
    });
    // Clear insufficient stock error when ingredients change
    if (errors.insufficientStock) {
      setErrors((prev) => ({ ...prev, insufficientStock: undefined }));
    }
  };

  // update quantity
  const updateQuantity = (id: string, value: string) => {
    setSelectedIngredients((prev) => ({
      ...prev,
      [id]: value,
    }));
    // Clear insufficient stock error when quantity changes
    if (errors.insufficientStock) {
      setErrors((prev) => ({ ...prev, insufficientStock: undefined }));
    }
  };

  // Modal handlers
  const handleOpenSheet = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsModalVisible(false);
    Keyboard.dismiss();
    setIsEditing(false);
    cleanInputFields();
  }, []);

  const cleanInputFields = () => {
    setNewRecipe({ name: "", servings: "", targetProfit: "" });
    setIsCustomProfit(false);
    setCustomProfit("");
    setSelectedIngredients({});
    setSearchQuery("");
    setIsEditing(false);
    setSelectedId(null);
    setErrors({});
  };

  const handleAddRecipe = async () => {
    const numericIngredients = Object.fromEntries(
      Object.entries(selectedIngredients).map(([key, value]) => [
        key,
        Number(value),
      ]),
    );

    const input: RecipeInput = {
      name: newRecipe.name.trim(),
      servings: Number(newRecipe.servings),
      targetProfit: isCustomProfit
        ? Number(customProfit)
        : Number(newRecipe.targetProfit),
      ingredients: numericIngredients,
    };

    if (!validateRecipe(input, setErrors)) return;

    // Validate stock availability
    const stockValidation = validateStockAvailability(
      numericIngredients,
      ingredients,
    );

    if (!stockValidation.isValid) {
      const errorMessages = stockValidation.insufficientItems
        .map(
          (item) =>
            `${item.name}: need ${formatAmount(item.requested)}${item.unit ? ` ${item.unit}` : ""}, only ${formatAmount(item.available)}${item.unit ? ` ${item.unit}` : ""} available`,
        )
        .join("\n");
      setErrors((prev) => ({
        ...prev,
        insufficientStock: `Insufficient stock:\n${errorMessages}`,
      }));
      return;
    }

    try {
      const payload = {
        ...input,
        ingredients: JSON.stringify(numericIngredients),
      };
      setIsSubmitting(true);
      const res = await addRecipe(payload);

      if (res.$id) {
        // Deduct stock from each ingredient used
        for (const [ingredientId, usedQty] of Object.entries(
          numericIngredients,
        )) {
          const ingredient = ingredients.find((ing) => ing.$id === ingredientId);
          if (ingredient) {
            const packUsage = getPackUsage(usedQty, ingredient);
            const newStock = ingredient.stock - packUsage;
            await updateIngredientStock(ingredientId, { stock: newStock });
          }
        }

        showMessage({
          message: "Recipe added",
          description: `${input.name} has been added to your recipes. Ingredient stock has been updated.`,
          type: "success",
        });
      }
    } catch (err) {
      console.error(err);
      showMessage({
        message: "Failed to add recipe",
        description: "Please try again.",
        type: "danger",
      });
    } finally {
      handleCloseSheet();
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const confirmDelete = async () => {
      try {
        await deleteRecipe(id);
        showMessage({
          message: "Recipe Deleted",
          description: "The recipe has been removed from your collection.",
          type: "success",
        });
      } catch (error) {
        console.error("Failed to delete recipe:", error);
        showMessage({
          message: "Failed to delete recipe",
          description: "Please try again.",
          type: "danger",
        });
      }
    };

    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ],
    );
  };

  const handleEditRecipe = async () => {
    if (!selectedId) return;
    const numericIngredients = Object.fromEntries(
      Object.entries(selectedIngredients).map(([key, value]) => [
        key,
        Number(value),
      ]),
    );

    const input: RecipeInput = {
      name: newRecipe.name.trim(),
      servings: Number(newRecipe.servings),
      targetProfit: isCustomProfit
        ? Number(customProfit)
        : Number(newRecipe.targetProfit),
      ingredients: numericIngredients,
    };

    if (!validateRecipe(input, setErrors)) return;

    // Get the original recipe to calculate stock differences
    const originalRecipe = recipes.find((r) => r.$id === selectedId);
    const originalIngredients = originalRecipe?.ingredients || {};

    // Validate stock availability (considering what will be restored from original recipe)
    const stockValidation = validateStockAvailability(
      numericIngredients,
      ingredients,
      originalIngredients,
    );

    if (!stockValidation.isValid) {
      const errorMessages = stockValidation.insufficientItems
        .map(
          (item) =>
            `${item.name}: need ${formatAmount(item.requested)}${item.unit ? ` ${item.unit}` : ""}, only ${formatAmount(item.available)}${item.unit ? ` ${item.unit}` : ""} available`,
        )
        .join("\n");
      setErrors((prev) => ({
        ...prev,
        insufficientStock: `Insufficient stock:\n${errorMessages}`,
      }));
      return;
    }

    try {
      const payload = {
        ...input,
        ingredients: JSON.stringify(numericIngredients),
      };

      setIsSubmitting(true);
      await editRecipe(selectedId, payload);

      // Adjust stock based on the difference between old and new quantities
      // Collect all ingredient IDs from both old and new
      const allIngredientIds = new Set([
        ...Object.keys(originalIngredients),
        ...Object.keys(numericIngredients),
      ]);

      for (const ingredientId of allIngredientIds) {
        const ingredient = ingredients.find((ing) => ing.$id === ingredientId);
        if (!ingredient) continue;

        const oldQty = originalIngredients[ingredientId] || 0;
        const newQty = numericIngredients[ingredientId] || 0;
        const oldPackUsage = getPackUsage(oldQty, ingredient);
        const newPackUsage = getPackUsage(newQty, ingredient);
        const difference = newPackUsage - oldPackUsage;

        if (difference !== 0) {
          // If difference > 0, we need more (deduct). If difference < 0, we used less (restore).
          const newStock = ingredient.stock - difference;
          await updateIngredientStock(ingredientId, { stock: newStock });
        }
      }

      showMessage({
        message: "Recipe Updated",
        description: `${input.name} has been updated. Ingredient stock has been adjusted.`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      showMessage({
        message: "Failed to update recipe",
        description: "Please try again.",
        type: "danger",
      });
    } finally {
      handleCloseSheet();
      setIsSubmitting(false);
    }
  };

  const onEditClick = async (id: string) => {
    setSelectedId(id);
    setIsEditing(true);
    const editingRecipe = recipes.find((r) => r.$id === id);
    if (!editingRecipe) return;

    setNewRecipe({
      name: editingRecipe.name,
      servings: editingRecipe.servings.toString(),
      targetProfit: editingRecipe.targetProfit.toString(),
    });
    setSelectedIngredients(
      Object.fromEntries(
        Object.entries(editingRecipe.ingredients).map(([key, value]) => [
          key,
          value.toString(),
        ]),
      ),
    );
    handleOpenSheet();
  };

  const onFormChange = (field: string, value: string) => {
    setNewRecipe((prev) => ({ ...prev, [field]: value }));
  };

  useFocusEffect(
    useCallback(() => {
      cleanInputFields();
      setIsModalVisible(false);
    }, []),
  );

  if (loading) {
    return (
      <View className="items-center justify-center">
        <ActivityIndicator size="large" color={"#3B82F6"} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {recipes.length === 0 ? (
        <View
          className="items-center justify-center px-8"
          style={{ height: usableHeight - 100 }}
        >
          {/* Icon Container */}
          <View className="items-center justify-center w-24 h-24 mb-6 bg-gray-100 rounded-full">
            <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          </View>
          {/* Main Message */}
          <Text className="mb-2 text-xl font-semibold text-center text-gray-800">
            No Recipes Yet
          </Text>
          {/* Subtitle */}
          <Text className="mb-8 text-base leading-6 text-center text-gray-500">
            Add your first recipe to get started
          </Text>
          {/* Add Button */}
          <Pressable
            onPress={handleOpenSheet}
            className="flex-row items-center px-6 py-3 bg-blue-200 rounded-lg active:bg-blue-300"
          >
            <Ionicons name="add-circle-outline" size={20} color="blue" />
            <Text className="ml-2 text-base font-medium text-blue-600">
              Add Recipe
            </Text>
          </Pressable>
          {/* Enhanced Tips Section */}
          <View className="w-full p-4 mt-8 border rounded-lg bg-amber-50 border-amber-200">
            <View className="flex-row items-start gap-3">
              <View className="items-center justify-center w-8 h-8 rounded-full bg-amber-200">
                <Ionicons name="bulb-outline" size={16} color="#D97706" />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-semibold text-amber-900">
                  Pro Tip
                </Text>
                <Text className="text-sm leading-5 text-amber-800">
                  Use the search bar to find ingredients by name when making
                  recipe
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Header with Add Button */}
          <View className="flex-row items-center justify-between p-4">
            <Text className="text-xl font-bold text-gray-900">My Recipes</Text>
            <Pressable
              onPress={handleOpenSheet}
              className="p-3 rounded-full bg-emerald-500 active:bg-emerald-600"
            >
              <Ionicons name="restaurant" size={20} color="white" />
            </Pressable>
          </View>

          {/* Recipe List */}
          <FlatList
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={initialFetchRecipes}
                tintColor="#007AFF"
                colors={["#007AFF"]}
                progressBackgroundColor="#ffffff"
              />
            }
            data={sortedRecipes}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                className="bg-white"
                handleDelete={handleDeleteRecipe}
                handleEdit={onEditClick}
              />
            )}
            keyExtractor={(item) => item.$id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40 + insets.bottom + 16,
            }}
          />
        </View>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseSheet}
      >
        <View className="flex-1 bg-black/50">
          <Pressable className="flex-1" onPress={handleCloseSheet} />
          <View
            className="bg-white rounded-t-3xl"
            style={{
              height: height * 0.9,
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
              nestedScrollEnabled={true}
            >
              {/* Sheet Header */}
              <View className="flex-row items-center justify-between pb-4 pr-4">
                <Text className="text-xl font-semibold text-gray-900">
                  {isEditing ? "Edit Recipe" : "Add Recipe"}
                </Text>
                <Pressable onPress={handleCloseSheet} className="p-2 -mr-2">
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              <View className="gap-5">
                {/* Recipe Name */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Recipe Name
                  </Text>
                  <TextInput
                    returnKeyType="next"
                    onSubmitEditing={() => servingsInputRef.current?.focus()}
                    value={newRecipe.name}
                    onChangeText={(text) => onFormChange("name", text)}
                    placeholder="Enter recipe name"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                  {errors.name && (
                    <Text className="text-xs text-red-500">{errors.name}</Text>
                  )}
                </View>

                {/* Servings */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Number of Servings
                  </Text>
                  <TextInput
                    ref={servingsInputRef}
                    value={newRecipe.servings}
                    onChangeText={(text) => onFormChange("servings", text)}
                    placeholder="e.g. 8"
                    keyboardType="numeric"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect={false}
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                  {errors.servings && (
                    <Text className="text-xs text-red-500">
                      {errors.servings}
                    </Text>
                  )}
                </View>

                {/* Profit Margin */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 ">
                    Target Profit Margin (%)
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row gap-2">
                      {["20", "30", "40", "50"].map((percentage) => (
                        <TouchableOpacity
                          key={percentage}
                          onPress={() => {
                            onFormChange("targetProfit", percentage);
                            setIsCustomProfit(false);
                          }}
                          className={`flex-1 py-3 rounded-xl border-2 ${newRecipe.targetProfit === percentage
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 bg-white"
                            }`}
                          activeOpacity={0.8}
                        >
                          <Text
                            className={`text-center font-medium ${newRecipe.targetProfit === percentage
                              ? "text-emerald-700"
                              : "text-gray-700"
                              }`}
                          >
                            {percentage}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        className={`grow py-3 rounded-xl border-2 ${isCustomProfit
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 bg-white"
                          }`}
                        onPress={() => {
                          setIsCustomProfit(true);
                          onFormChange("targetProfit", customProfit);
                        }}
                      >
                        <Text
                          className={`text-center font-medium ${isCustomProfit
                            ? "text-emerald-700"
                            : "text-gray-700"
                            }`}
                        >
                          Custom
                        </Text>
                      </Pressable>
                      {isCustomProfit && (
                        <>
                          <Text className="font-bold text-gray-700">=</Text>
                          <TextInput
                            value={customProfit}
                            onChangeText={(text) => {
                              onFormChange("targetProfit", text);
                              setCustomProfit(text);
                            }}
                            placeholder="25%"
                            keyboardType="numeric"
                            className="w-20 text-center text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                            placeholderTextColor="#9ca3af"
                          />
                        </>
                      )}
                    </View>
                  </View>
                  {errors.targetProfit && (
                    <Text className="text-xs text-red-500">
                      {errors.targetProfit}
                    </Text>
                  )}
                </View>

                {/* Ingredients Section */}
                <View>
                  <Text className="mb-3 text-sm font-medium text-gray-700">
                    Ingredients
                  </Text>
                  {ingredients.length === 0 ? (
                    <View className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
                      <Ionicons
                        name="leaf-outline"
                        size={28}
                        color="#9CA3AF"
                        style={{ marginBottom: 8 }}
                      />
                      <Text className="text-center text-gray-500">
                        No ingredients available. Add some to get started.
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-xl">
                      {/* Search/Filter Bar */}
                      <View className="p-4 border-b border-gray-200">
                        <View className="flex-row items-center px-3 border-2 border-gray-200 bg-gray-50 rounded-xl">
                          <Ionicons
                            name="search"
                            size={16}
                            color="#9CA3AF"
                            style={{ marginRight: 8 }}
                          />
                          <TextInput
                            placeholder="Search ingredients..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-gray-900"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                          />
                        </View>
                      </View>

                      <View style={{ maxHeight: 350 }}>
                        <FlatList
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          data={ingredients.filter((ingredient) =>
                            ingredient.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                          )}
                          keyExtractor={(item) => item.$id}
                          renderItem={({ item: ingredient }) => (
                            <IngredientSelectionCard
                              ingredient={ingredient}
                              selectedIngredients={selectedIngredients}
                              toggleIngredient={toggleIngredient}
                              updateQuantity={updateQuantity}
                            />
                          )}
                          contentContainerStyle={{
                            paddingVertical: 16,
                          }}
                        />
                        <View className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
                          <Text className="text-sm text-center text-gray-600">
                            {Object.keys(selectedIngredients).length} ingredient
                            {Object.keys(selectedIngredients).length === 1
                              ? ""
                              : "s"}{" "}
                            selected
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {errors.ingredients && (
                    <Text className="text-xs text-red-500">
                      {errors.ingredients}
                    </Text>
                  )}
                  {errors.insufficientStock && (
                    <View className="p-3 mt-2 border border-red-200 bg-red-50 rounded-xl">
                      <View className="flex-row items-start gap-2">
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color="#DC2626"
                          style={{ marginTop: 2 }}
                        />
                        <Text className="flex-1 text-xs text-red-600">
                          {errors.insufficientStock}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View
                  className="gap-3"
                  style={{ marginBottom: Platform.OS === "ios" ? 20 : 20 }}
                >
                  {isEditing ? (
                    <Pressable
                      onPress={handleEditRecipe}
                      className={`flex-1 py-4 bg-emerald-500 rounded-xl active:bg-emerald-600`}
                      disabled={loading || isSubmitting}
                    >
                      {loading || isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="font-medium text-center text-white">
                          Edit Recipe
                        </Text>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleAddRecipe}
                      className={`flex-1 py-4 bg-emerald-500 rounded-xl active:bg-emerald-600`}
                      disabled={loading || isSubmitting}
                    >
                      {loading || isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="font-medium text-center text-white">
                          Add Recipe
                        </Text>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleCloseSheet}
                    className="flex-1 py-4 border border-gray-300 rounded-xl active:bg-gray-100"
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
    </View>
  );
}
