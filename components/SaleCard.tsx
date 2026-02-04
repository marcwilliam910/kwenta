import { AppwriteSale } from "@/lib/services/expensesSalesSubscriptionService";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Pressable, Text, View } from "react-native";

type SaleCardProps = {
  sale: AppwriteSale;
  handleDelete: (sale: AppwriteSale) => void;
  handleEdit: (sale: AppwriteSale) => void;
};

const SaleCard = ({ sale, handleDelete, handleEdit }: SaleCardProps) => {
  const profit = sale.totalRevenue - sale.totalCost;
  const isProfit = profit >= 0;

  return (
    <View className="p-4 mb-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">
            {sale.recipeName}
          </Text>
          <Text className="text-sm text-gray-500">
            {sale.quantitySold} × ₱{sale.pricePerUnit.toFixed(2)}
          </Text>
          <Text className="text-xs text-gray-400">
            {format(sale.$createdAt, "MMM dd, yyyy")}
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-2">
          <Pressable
            className="p-2 rounded-full bg-gray-50 active:bg-gray-200"
            onPress={() => handleEdit(sale)}
          >
            <Ionicons name="create-outline" size={16} color="#6b7280" />
          </Pressable>
          <Pressable
            className="p-2 rounded-full bg-red-50 active:bg-red-100"
            onPress={() => handleDelete(sale)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* Financial Details */}
      <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
        <View>
          <Text className="text-xs text-gray-500">Revenue</Text>
          <Text className="text-sm font-semibold text-emerald-600">
            ₱{sale.totalRevenue.toFixed(2)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-gray-500">Cost</Text>
          <Text className="text-sm font-semibold text-red-500">
            ₱{sale.totalCost.toFixed(2)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-gray-500">Profit</Text>
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={isProfit ? "trending-up" : "trending-down"}
              size={14}
              color={isProfit ? "#10b981" : "#ef4444"}
            />
            <Text
              className={`text-sm font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}
            >
              {isProfit ? "+" : ""}₱{profit.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SaleCard;
