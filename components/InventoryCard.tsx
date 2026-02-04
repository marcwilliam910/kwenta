import { AppwriteIngredient } from "@/app/(tabs)/inventory";
import { Ionicons } from "@expo/vector-icons";
import { differenceInDays, format, startOfDay } from "date-fns";
import { Pressable, Text, View } from "react-native";

type InventoryCardProps = {
  ingredient: AppwriteIngredient;
  handleDelete: (ingredient: AppwriteIngredient) => void;
  handleEdit: (ingredient: AppwriteIngredient) => void;
};

const InventoryCard = ({
  ingredient,
  handleDelete,
  handleEdit,
}: InventoryCardProps) => {
  const formatAmount = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const today = startOfDay(new Date()); // Start of today

  const daysUntilExpiry = ingredient.expires
    ? differenceInDays(startOfDay(new Date(ingredient.expires)), today)
    : null;

  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringToday = daysUntilExpiry === 0;

  const isLowStock = ingredient.stock < 5;
  const isOutOfStock = ingredient.stock === 0;

  const isPieces = ingredient.unit.toLowerCase() === "piece";
  const totalAmount = isPieces
    ? ingredient.stock
    : ingredient.quantity * ingredient.stock;
  const displayUnit = isPieces ? "piece" : ingredient.unit;

  return (
    <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
      {/* Header Section */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-4">
          <Text className="mb-1 text-xl font-bold text-gray-900">
            {ingredient.name}
          </Text>
          <Text className="text-base text-gray-600">
            ₱{ingredient.cost.toFixed(2)} per {isPieces ? "piece" : "pack"}
          </Text>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            className="p-2 rounded-full bg-gray-50 active:bg-gray-200"
            onPress={() => handleEdit(ingredient)}
          >
            <Ionicons name="create-outline" size={18} color="#6b7280" />
          </Pressable>
          <Pressable
            className="p-2 rounded-full bg-red-50 active:bg-gray-200"
            onPress={() => handleDelete(ingredient)}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* Stock Status Section */}
      <View className="flex-row items-center justify-between p-3 mb-4 bg-gray-50 rounded-xl">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {formatAmount(totalAmount)} {displayUnit}
            {totalAmount > 1 && "s"} total
          </Text>
          {!isPieces && (
            <Text className="mt-1 text-sm text-gray-500">
              {formatAmount(ingredient.stock)} pack
              {ingredient.stock > 1 && "s"} × {formatAmount(ingredient.quantity)}
              {ingredient.unit} each
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          {isOutOfStock ? (
            <>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text className="font-semibold text-red-600">Out of Stock</Text>
            </>
          ) : isLowStock ? (
            <>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <Text className="font-semibold text-amber-600">Low Stock</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text className="font-semibold text-emerald-600">In Stock</Text>
            </>
          )}
        </View>
      </View>

      {/* Expiration Section */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="mb-1 text-sm text-gray-500">Expires</Text>
          <Text className="text-base font-medium text-gray-900">
            {ingredient.expires
              ? format(ingredient.expires, "MMM dd, yyyy")
              : "No expiry date"}
          </Text>
          {daysUntilExpiry !== null && (
            <Text className="mt-1 text-xs text-gray-500">
              {isExpiringToday
                ? "Expires today"
                : daysUntilExpiry === 1
                  ? "Expires tomorrow"
                  : daysUntilExpiry > 0
                    ? `${daysUntilExpiry} days left`
                    : `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? "s" : ""} ago`}
            </Text>
          )}
        </View>

        <View
          className={`py-2 px-4 rounded-full ${isExpired
              ? "bg-red-100"
              : isExpiringToday
                ? "bg-orange-100"
                : isExpiringSoon
                  ? "bg-yellow-100"
                  : "bg-green-100"
            }`}
        >
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={
                isExpired
                  ? "close-circle"
                  : isExpiringToday
                    ? "alert-circle"
                    : isExpiringSoon
                      ? "time"
                      : "thumbs-up-outline"
              }
              size={16}
              color={
                isExpired
                  ? "#dc2626"
                  : isExpiringToday
                    ? "#ea580c"
                    : isExpiringSoon
                      ? "#f59e0b"
                      : "#059669"
              }
            />
            <Text
              className={`font-semibold text-sm ${isExpired
                  ? "text-red-700"
                  : isExpiringToday
                    ? "text-orange-700"
                    : isExpiringSoon
                      ? "text-yellow-700"
                      : "text-green-700"
                }`}
            >
              {isExpired
                ? "Expired"
                : isExpiringToday
                  ? "Expires Today"
                  : isExpiringSoon
                    ? "Expires Soon"
                    : "Fresh"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default InventoryCard;
