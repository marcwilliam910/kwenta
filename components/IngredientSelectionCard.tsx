import {AppwriteIngredient} from "@/app/(tabs)/inventory";
import {Ionicons} from "@expo/vector-icons";
import {Pressable, Text, TextInput, View} from "react-native";

type IngredientSelectionCardProps = {
  ingredient: AppwriteIngredient;
  selectedIngredients: {[id: string]: string};
  toggleIngredient: (id: string) => void;
  updateQuantity: (id: string, value: string) => void;
};

const IngredientSelectionCard = ({
  ingredient,
  selectedIngredients,
  toggleIngredient,
  updateQuantity,
}: IngredientSelectionCardProps) => {
  const isSelected = selectedIngredients[ingredient.$id] !== undefined;

  return (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      {/* Selection Checkbox */}
      <Pressable
        onPress={() => toggleIngredient(ingredient.$id)}
        className="flex-row items-center flex-1 gap-3 active:opacity-50"
      >
        <Ionicons
          name={isSelected ? "checkbox" : "checkbox-outline"}
          size={20}
          color={isSelected ? "#3B82F6" : "#9CA3AF"}
        />

        {/* Ingredient Info */}
        <View>
          <Text className="font-medium text-gray-900">{ingredient.name}</Text>
          <Text className="text-sm text-gray-600">
            ₱{ingredient.cost.toFixed(2)} per{" "}
            {ingredient.unit === "piece" ? ingredient.unit : "pack"}
          </Text>
        </View>
      </Pressable>

      {/* Quantity Input (shown only when selected) */}
      {isSelected && (
        <View className="flex-row items-center justify-between w-20">
          <TextInput
            value={selectedIngredients[ingredient.$id] || ""}
            onChangeText={(text) => updateQuantity(ingredient.$id, text)}
            placeholder="0"
            keyboardType="decimal-pad"
            spellCheck={false}
            autoComplete="off"
            autoCorrect={false}
            className="w-12 mr-2 text-xs text-center bg-white border border-gray-300 rounded"
          />
          <Text className="text-xs text-gray-500">{ingredient.unit}</Text>
        </View>
      )}
    </View>
  );
};

export default IngredientSelectionCard;
