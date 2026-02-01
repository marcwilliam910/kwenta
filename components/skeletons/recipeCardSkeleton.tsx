import {View} from "react-native";

export default function RecipeCardSkeleton() {
  return (
    <View className="p-4 mb-3 bg-white rounded-lg">
      {/* Top row */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="w-32 h-4 mb-2 bg-gray-200 rounded" />
          <View className="w-20 h-3 bg-gray-200 rounded" />
        </View>
        <View className="w-24 h-4 bg-gray-200 rounded" />
      </View>

      {/* Bottom row */}
      <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
        <View className="w-24 h-3 bg-gray-200 rounded" />
        <View className="w-24 h-3 bg-gray-200 rounded" />
      </View>
    </View>
  );
}
