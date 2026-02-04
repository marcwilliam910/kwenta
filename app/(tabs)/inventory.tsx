import InventoryCard from "@/components/InventoryCard";
import { useAuth } from "@/context/AuthContext";
import { useIngredients } from "@/context/IngredientsContext";
import { useReadAlert } from "@/context/ReadAlertContext";
import { updateIngredientNotification } from "@/lib/services/databaseService";
import NotificationService from "@/lib/services/notificationService";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type AppwriteIngredient = {
  $id: string;
  name: string;
  stock: number;
  unit: string;
  quantity: number;
  cost: number;
  expires: Date;
  notificationId?: string;
  notificationScheduled?: boolean;
  $createdAt: Date;
};

type Ingredient = {
  name: string;
  stock: string;
  unit: string;
  quantity: string;
  cost: string;
  expires: Date;
};

export type IngredientInput = {
  name: string;
  unit: string;
  stock: number;
  quantity: number;
  cost: number;
  expires: Date;
};

export type IngredientErrors = Partial<Record<keyof IngredientInput, string>>;

export function validateIngredient(
  input: IngredientInput,
  setErrors: any,
): boolean {
  const errors: IngredientErrors = {};
  let isValid = true;

  if (!input.name?.trim()) {
    errors.name = "Name is required";
    isValid = false;
  }
  if (!input.unit?.trim() || isNaN(input.quantity) || input.quantity < 1) {
    errors.unit = "Unit and non-zero quantity is required";
    isValid = false;
  }

  if (isNaN(input.stock) || input.stock < 1) {
    errors.stock = "Stock must be greater than 0";
    isValid = false;
  }

  if (isNaN(input.cost) || input.cost < 1) {
    errors.cost = "Cost must be greater than 0";
    isValid = false;
  }

  if (input.expires && isNaN(Date.parse(input.expires.toString()))) {
    errors.expires = "Expires must be a valid date";
    isValid = false;
  }

  setErrors(errors);
  return isValid;
}

export default function Inventory() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [ingredient, setIngredient] = useState<Ingredient>({
    name: "",
    stock: "",
    unit: "",
    quantity: "",
    cost: "",
    expires: new Date(),
  });
  const [errors, setErrors] = useState<IngredientErrors>({});
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const {
    addIngredient,
    ingredients,
    loading,
    deleteIngredient,
    editIngredient,
    initialFetchIngredients,
  } = useIngredients();
  const [selectedIngredient, setSelectedIngredient] =
    useState<AppwriteIngredient | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fetchUnread } = useReadAlert();

  const usableHeight = height - insets.top - insets.bottom;
  const nameInputRef = useRef<any>(null);
  const quantityInputRef = useRef<any>(null);
  const costInputRef = useRef<any>(null);
  const stockInputRef = useRef<any>(null);

  const sortedIngredients = useMemo(() => {
    return [...ingredients].sort(
      (a, b) => b.$createdAt.getTime() - a.$createdAt.getTime(),
    );
  }, [ingredients]);

  const cleanInputFields = () => {
    setIngredient({
      name: "",
      stock: "",
      unit: "",
      quantity: "",
      cost: "",
      expires: new Date(),
    });
    setErrors({});
    setSelectedIngredient(null);
    setIsEditing(false);
  };

  const onFormChange = (field: string, value: string | Date | null) => {
    setIngredient((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenSheet = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsModalVisible(false);
    Keyboard.dismiss();
    setIsEditing(false);
    setSelectedIngredient(null);
    cleanInputFields();
  }, []);

  const handleAddIngredient = useCallback(async () => {
    if (
      !validateIngredient(
        {
          name: ingredient.name.trim(),
          unit: ingredient.unit.trim(),
          stock: Number(ingredient.stock),
          quantity: Number(ingredient.quantity),
          cost: Number(ingredient.cost),
          expires: ingredient.expires,
        },
        setErrors,
      )
    )
      return;

    try {
      setIsSubmitting(true);
      const expirationDate = ingredient.expires
        ? new Date(ingredient.expires)
        : new Date();

      const payload: Omit<AppwriteIngredient, "$id" | "$createdAt"> = {
        name: ingredient.name.trim(),
        stock: Number(ingredient.stock),
        unit: ingredient.unit.trim(),
        quantity: Number(ingredient.quantity),
        cost: Number(ingredient.cost),
        expires: expirationDate,
        notificationScheduled: false,
      };

      console.log(`🔄 Adding ingredient: ${payload.name}`);
      const res = await addIngredient(payload);
      console.log(`✅ Ingredient added with ID: ${res?.$id}`);

      if (res?.$id) {
        try {
          let notificationId = null;

          if (user?.isNotifEnabled) {
            notificationId =
              await NotificationService.scheduleIngredientExpirationNotification(
                {
                  $id: res.$id,
                  name: payload.name,
                  expires: expirationDate,
                },
                user!.$id,
              );
          }

          if (notificationId) {
            console.log(
              `🔔 Updating ingredient with notification ID: ${notificationId}`,
            );
            await updateIngredientNotification(res.$id, notificationId);

            showMessage({
              message: "Ingredient Added",
              description: `${ingredient.name} has been added to your inventory. You'll be notified 3 days before expiration.`,
              type: "success",
            });
          } else {
            showMessage({
              message: "Ingredient Added",
              description: `${ingredient.name} has been added to your inventory.`,
              type: "success",
            });
          }
        } catch (error) {
          console.error("Failed to schedule notification:", error);
          showMessage({
            message: "Ingredient Added",
            description: `${ingredient.name} has been added to your inventory. (Notification scheduling failed)`,
            type: "success",
          });
        }

        await fetchUnread();
      }
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      showMessage({
        message: "Failed to add ingredient",
        description: "Please try again.",
        type: "danger",
      });
    } finally {
      handleCloseSheet();
      setIsSubmitting(false);
    }
  }, [ingredient.name, ingredient.unit, ingredient.stock, ingredient.quantity, ingredient.cost, ingredient.expires, addIngredient, fetchUnread, user, handleCloseSheet]);

  const confirmDelete = async (ingredientToDelete: AppwriteIngredient) => {
    try {
      await NotificationService.cleanupNotificationForIngredient(
        ingredientToDelete.$id,
        ingredientToDelete.notificationId,
      );

      await deleteIngredient(ingredientToDelete.$id, user?.$id as string);
      showMessage({
        message: "Ingredient Deleted",
        description: "The ingredient has been removed from your inventory.",
        type: "success",
      });

      await fetchUnread();
    } catch (error) {
      console.error("Failed to delete ingredient:", error);
      showMessage({
        message: "Failed to delete ingredient",
        description: "Please try again.",
        type: "danger",
      });
    }
  };

  const handleEditIngredient = async () => {
    if (!selectedIngredient) return;

    if (
      !validateIngredient(
        {
          name: ingredient.name.trim(),
          unit: ingredient.unit.trim(),
          stock: Number(ingredient.stock),
          quantity: Number(ingredient.quantity),
          cost: Number(ingredient.cost),
          expires: ingredient.expires,
        },
        setErrors,
      )
    )
      return;

    try {
      setIsSubmitting(true);
      const expirationDate = ingredient.expires
        ? new Date(ingredient.expires)
        : new Date();

      const payload: Partial<AppwriteIngredient> = {
        name: ingredient.name.trim(),
        stock: Number(ingredient.stock),
        unit: ingredient.unit.trim(),
        quantity: Number(ingredient.quantity),
        cost: Number(ingredient.cost),
        expires: expirationDate,
      };

      const expirationChanged =
        expirationDate.getTime() !== selectedIngredient.expires?.getTime();

      let notificationMessage = `${ingredient.name} has been updated in your inventory.`;

      if (expirationChanged) {
        if (selectedIngredient.notificationId) {
          try {
            await NotificationService.cancelNotification(
              selectedIngredient.notificationId,
            );
            console.log(
              "🗑️ Cancelled old notification:",
              selectedIngredient.notificationId,
            );
          } catch (error) {
            console.error("Failed to cancel old notification:", error);
          }
        }

        await NotificationService.cleanupOldAlertsForIngredient(
          selectedIngredient.$id,
        );

        try {
          const newNotificationId =
            await NotificationService.scheduleIngredientExpirationNotification(
              {
                $id: selectedIngredient.$id,
                name: payload.name!,
                expires: expirationDate,
              },
              user!.$id,
            );

          if (newNotificationId) {
            payload.notificationId = newNotificationId;
            payload.notificationScheduled = true;
            notificationMessage = `${ingredient.name} has been updated. Notification rescheduled for new expiry date.`;
            console.log("🔔 Scheduled new notification:", newNotificationId);
          } else {
            payload.notificationId = undefined;
            payload.notificationScheduled = false;
            notificationMessage = `${ingredient.name} has been updated. (Too close to expiration for notification)`;
            console.log("⚠️ No notification scheduled - expires too soon");
          }
        } catch (error) {
          console.error("Failed to schedule new notification:", error);
          payload.notificationId = undefined;
          payload.notificationScheduled = false;
          notificationMessage = `${ingredient.name} has been updated. (Notification rescheduling failed)`;
        }
      }

      await editIngredient(selectedIngredient.$id, payload);

      showMessage({
        message: "Ingredient Updated",
        description: notificationMessage,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to update ingredient:", error);
      showMessage({
        message: "Failed to update ingredient",
        description: "Please try again.",
        type: "danger",
      });
    } finally {
      handleCloseSheet();
      setIsSubmitting(false);
    }
  };

  const showAlertForDelete = async (ingredient: AppwriteIngredient) => {
    setSelectedIngredient(ingredient);
    Alert.alert(
      "Delete Ingredient",
      "Are you sure you want to delete this ingredient? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDelete(ingredient),
        },
      ],
    );
  };

  const onEditClick = async (ingredient: AppwriteIngredient) => {
    setSelectedIngredient(ingredient);
    setIsEditing(true);
    const selectedIngredient = ingredients.find(
      (r) => r.$id === ingredient.$id,
    );
    if (!selectedIngredient) return;

    setIngredient({
      name: selectedIngredient.name,
      stock: selectedIngredient.stock.toString(),
      unit: selectedIngredient.unit,
      quantity: selectedIngredient.quantity.toString(),
      cost: selectedIngredient.cost.toString(),
      expires: selectedIngredient.expires,
    });

    handleOpenSheet();
  };

  useFocusEffect(
    useCallback(() => {
      cleanInputFields();
      setIsModalVisible(false);
    }, []),
  );

  useEffect(() => {
    if (ingredient.unit === "piece") {
      onFormChange("stock", ingredient.quantity);
    }
  }, [ingredient.unit, ingredient.quantity]);

  if (loading) {
    return (
      <View
        className="items-center justify-center"
        style={{
          height: usableHeight - 100,
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {ingredients.length === 0 ? (
        <View
          className="items-center justify-center px-8"
          style={{ height: usableHeight - 100 }}
        >
          <View className="items-center justify-center w-24 h-24 mb-6 bg-gray-100 rounded-full">
            <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          </View>
          <Text className="mb-2 text-xl font-semibold text-center text-gray-800">
            No Ingredients Yet
          </Text>
          <Text className="mb-8 text-base leading-6 text-center text-gray-500">
            Start building your pantry by adding your first ingredient
          </Text>
          <Pressable
            onPress={handleOpenSheet}
            className="flex-row items-center px-6 py-3 bg-blue-200 rounded-lg active:bg-blue-300"
          >
            <Ionicons name="add-circle-outline" size={20} color="blue" />
            <Text className="ml-2 text-base font-medium text-blue-600">
              Add Ingredient
            </Text>
          </Pressable>
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
                  Keep track of expiration dates and quantities to reduce food
                  waste and save money on your grocery budget.
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between p-4">
            <Text className="text-xl font-bold text-gray-900">Inventory</Text>
            <Pressable
              className="items-center justify-center rounded-full size-12 bg-emerald-500 active:bg-emerald-600"
              onPress={handleOpenSheet}
            >
              {({ pressed }) => (
                <Ionicons name="add" size={pressed ? 26 : 24} color="white" />
              )}
            </Pressable>
          </View>
          <FlatList
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={initialFetchIngredients}
                tintColor="#007AFF"
                colors={["#007AFF"]}
                progressBackgroundColor="#ffffff"
              />
            }
            data={sortedIngredients}
            renderItem={({ item }) => (
              <InventoryCard
                ingredient={item}
                handleDelete={showAlertForDelete}
                handleEdit={onEditClick}
              />
            )}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40 + insets.bottom + 16,
            }}
          />
        </>
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
            >
              <View className="flex-row items-center justify-between px-4 pb-4">
                <Text className="text-xl font-semibold text-gray-900">
                  Add New Ingredient
                </Text>
                <TouchableOpacity
                  onPress={handleCloseSheet}
                  className="p-2 -mr-2"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View className="gap-5">
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Ingredient Name
                  </Text>
                  <TextInput
                    ref={nameInputRef}
                    returnKeyType="next"
                    onSubmitEditing={() => quantityInputRef.current?.focus()}
                    value={ingredient.name}
                    onChangeText={(value) => onFormChange("name", value)}
                    placeholder="Enter ingredient name"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                  />
                  {errors.name && (
                    <Text className="ml-1 text-xs font-medium text-red-500">
                      {errors.name}
                    </Text>
                  )}
                </View>

                <View className="gap-2">
                  <Text className="mb-2 text-sm font-medium text-gray-700">
                    Unit
                  </Text>
                  <View className="flex-row border border-gray-200 bg-gray-50 rounded-xl">
                    <TextInput
                      ref={quantityInputRef}
                      returnKeyType="next"
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect={false}
                      onSubmitEditing={() => costInputRef.current?.focus()}
                      value={ingredient.quantity}
                      onChangeText={(value) => {
                        value = value.replace(/[^0-9.]/g, "");
                        onFormChange("quantity", value);
                      }}
                      placeholder="Enter quantity"
                      className="flex-1 p-4 text-gray-900 border-r border-gray-200 "
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                    <View
                      style={{
                        flexGrow: 2,
                      }}
                    >
                      <Picker
                        selectedValue={ingredient.unit}
                        onValueChange={(value) => onFormChange("unit", value)}
                        style={{ height: 55, color: "#6b7280" }}
                        itemStyle={{ fontSize: 16, color: "black" }}
                        enabled={!isEditing}
                        dropdownIconColor="#6b7280"
                      >
                        <Picker.Item
                          label="Select Unit"
                          value=""
                          enabled={false}
                        />
                        <Picker.Item label="Kilogram (kg)" value="kg" />
                        <Picker.Item label="Liter (L)" value="liter" />
                        <Picker.Item label="Gram (g)" value="gram" />
                        <Picker.Item label="Milliliter (ml)" value="ml" />
                        <Picker.Item label="Piece" value="piece" />
                      </Picker>
                    </View>
                  </View>
                  {errors.unit && (
                    <Text className="ml-1 text-xs font-medium text-red-500">
                      {errors.unit}
                    </Text>
                  )}
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Cost Per Unit
                  </Text>
                  <TextInput
                    ref={costInputRef}
                    returnKeyType="next"
                    onSubmitEditing={() => stockInputRef.current?.focus()}
                    value={ingredient.cost}
                    placeholder="Enter cost"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect={false}
                    onChangeText={(value) => {
                      value = value.replace(/[^0-9.]/g, "");
                      onFormChange("cost", value);
                    }}
                  />
                  {errors.cost && (
                    <Text className="ml-1 text-xs font-medium text-red-500">
                      {errors.cost}
                    </Text>
                  )}
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Current Stock
                  </Text>
                  <TextInput
                    ref={stockInputRef}
                    value={
                      ingredient.unit === "piece"
                        ? ingredient.quantity
                        : ingredient.stock
                    }
                    placeholder="Enter stock"
                    className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                    editable={ingredient.unit !== "piece"}
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect={false}
                    onChangeText={(value) => {
                      value = value.replace(/[^0-9.]/g, "");
                      onFormChange("stock", value);
                    }}
                  />
                  {errors.stock && (
                    <Text className="ml-1 text-xs font-medium text-red-500">
                      {errors.stock}
                    </Text>
                  )}
                </View>

                <View className="gap-2">
                  <Text className="text-base font-medium text-gray-800">
                    Expiry Date
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsDatePickerOpen(true)}
                    className="p-4 border border-gray-300 rounded-xl bg-gray-50"
                  >
                    <Text className="text-gray-900">
                      {ingredient.expires
                        ? ingredient.expires.toDateString()
                        : "Select a date"}
                    </Text>
                  </TouchableOpacity>

                  {isDatePickerOpen && (
                    <DateTimePicker
                      value={ingredient.expires || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={
                        new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
                      }
                      onChange={(event, selectedDate) => {
                        setIsDatePickerOpen(false);
                        if (selectedDate) onFormChange("expires", selectedDate);
                      }}
                    />
                  )}
                  {errors.expires && (
                    <Text className="ml-1 text-xs font-medium text-red-500">
                      {errors.expires}
                    </Text>
                  )}
                </View>

                <View
                  className="gap-3"
                  style={{ marginBottom: Platform.OS === "ios" ? 20 : 20 }}
                >
                  {isEditing ? (
                    <Pressable
                      onPress={handleEditIngredient}
                      disabled={loading || isSubmitting}
                      className="flex-1 py-4 bg-emerald-500 rounded-xl active:bg-emerald-600"
                    >
                      {isSubmitting || loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="font-medium text-center text-white">
                          Update Ingredient
                        </Text>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleAddIngredient}
                      disabled={loading || isSubmitting}
                      className="flex-1 py-4 bg-emerald-500 rounded-xl active:bg-emerald-600"
                    >
                      {isSubmitting || loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="font-medium text-center text-white">
                          Add Ingredient
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
