import { AppwriteExpense } from "@/lib/services/expensesSalesSubscriptionService";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Pressable, Text, View } from "react-native";

type ExpenseCardProps = {
  expense: AppwriteExpense;
  handleDelete: (expense: AppwriteExpense) => void;
  handleEdit: (expense: AppwriteExpense) => void;
};

const CATEGORY_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }
> = {
  electricity: { icon: "flash", color: "#f59e0b", bgColor: "bg-amber-100" },
  water: { icon: "water", color: "#3b82f6", bgColor: "bg-blue-100" },
  gas: { icon: "flame", color: "#ef4444", bgColor: "bg-red-100" },
  rent: { icon: "home", color: "#8b5cf6", bgColor: "bg-purple-100" },
  supplies: { icon: "cube", color: "#10b981", bgColor: "bg-emerald-100" },
  other: { icon: "ellipsis-horizontal", color: "#6b7280", bgColor: "bg-gray-100" },
};

const ExpenseCard = ({ expense, handleDelete, handleEdit }: ExpenseCardProps) => {
  const category = expense.category.toLowerCase();
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  return (
    <View className="flex-row items-center p-4 mb-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
      {/* Category Icon */}
      <View
        className={`items-center justify-center w-12 h-12 mr-4 rounded-full ${config.bgColor}`}
      >
        <Ionicons name={config.icon} size={24} color={config.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 capitalize">
          {expense.category}
        </Text>
        {expense.description ? (
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {expense.description}
          </Text>
        ) : null}
        <Text className="text-xs text-gray-400">
          {format(expense.$createdAt, "MMM dd, yyyy")}
        </Text>
      </View>

      {/* Amount */}
      <View className="items-end mr-3">
        <Text className="text-lg font-bold text-red-600">
          -₱{expense.amount.toFixed(2)}
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2">
        <Pressable
          className="p-2 rounded-full bg-gray-50 active:bg-gray-200"
          onPress={() => handleEdit(expense)}
        >
          <Ionicons name="create-outline" size={16} color="#6b7280" />
        </Pressable>
        <Pressable
          className="p-2 rounded-full bg-red-50 active:bg-red-100"
          onPress={() => handleDelete(expense)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
};

export default ExpenseCard;
