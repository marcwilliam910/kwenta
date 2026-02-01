import {AppwriteRecipe} from "@/app/(tabs)/recipes";
import useRecipeCost from "@/app/hooks/useRecipe";
import {Ionicons} from "@expo/vector-icons";
import {Pressable, Text, View} from "react-native";
import RecipeCardSkeleton from "./skeletons/recipeCardSkeleton";

const RecipeCard = ({
  recipe,
  className,
  handleDelete,
  handleEdit,
}: {
  recipe: AppwriteRecipe;
  className?: string;
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
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

  const profit = totalAmount - totalCost;

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
          <View className="flex-row gap-3">
            <Pressable
              className="p-2 rounded-full bg-gray-50 active:bg-gray-200"
              onPress={() => handleEdit(recipe.$id)}
            >
              <Ionicons name="create-outline" size={18} color="#6b7280" />
            </Pressable>
            <Pressable
              className="p-2 rounded-full bg-red-50 active:bg-gray-200"
              onPress={() => handleDelete(recipe.$id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>
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

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-green-600">
            Profit: ₱{profit.toFixed(2)}
          </Text>
          <Text className="text-sm font-medium text-blue-600">
            Target: {recipe.targetProfit}%
          </Text>
        </View>

        {ingredients.length > 0 && (
          <View className="gap-2 pt-3 mt-1 border-t border-gray-100">
            <Text className="text-xs font-medium text-gray-600">
              Ingredients:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ingredients.map((ingredient) => (
                <View
                  key={ingredient.$id}
                  className="px-2 py-1 rounded bg-gray-50"
                >
                  <Text className="text-xs text-gray-700">
                    {ingredient.name} ({ingredient.requiredQty}
                    {ingredient.unit})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default RecipeCard;
