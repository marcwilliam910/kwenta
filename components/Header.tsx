import {useAuth} from "@/context/AuthContext";
import {updateDocument} from "@/lib/services/databaseService";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useEffect, useState} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {showMessage} from "react-native-flash-message";
import NotificationService from "../lib/services/notificationService";

const Header = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const {user, logout, setUser, isLoading} = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    business_name: user?.businessName || "",
  });

  useEffect(() => {
    const checkNotificationStatus = async () => {
      // Get user preference from database first
      const userPreference = user?.isNotifEnabled ?? false;

      // Check system permissions
      const systemEnabled = await NotificationService.areNotificationsEnabled();

      // Toggle is ON only if both user wants it AND system allows it
      const finalStatus = userPreference && systemEnabled;

      setNotificationsEnabled(finalStatus);
    };

    if (user) {
      // Only check if user is loaded
      checkNotificationStatus();
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && user) {
        checkNotificationStatus();
      }
    });

    return () => subscription?.remove();
  }, [user?.isNotifEnabled]); // Re-run when user preference changes

  useEffect(() => {
    const requestInitialPermissions = async () => {
      if (!user) return; // Wait for user to be loaded

      const {status} = await NotificationService.getPermissionsAsync();

      if (status === "undetermined") {
        // First time opening the app - request permissions
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          // Update user preference in database to true
          await updateUserNotificationPreference(true);
        }
      }

      // Sync toggle state based on user preference + system permission
      const userPreference = user.isNotifEnabled ?? false;
      const systemEnabled = await NotificationService.areNotificationsEnabled();
      setNotificationsEnabled(userPreference && systemEnabled);
    };

    if (user) {
      requestInitialPermissions();
    }
  }, [user]); // Run when user is loaded

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleFormSubmit = async () => {
    try {
      setLoading(true);
      const res = await updateDocument("users", user?.$id as string, form);
      console.log("RES", res);
      if (res && user) {
        setUser({
          ...user,
          name: form.name,
          businessName: form.business_name,
        });
      }
      showMessage({
        message: "User updated",
        description: "User updated successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to update user:", error);
      showMessage({
        message: "Failed to update user",
        description: "Please try again.",
        type: "danger",
      });
    } finally {
      setLoading(false);
      setIsEditing(false);
      Keyboard.dismiss();
    }
  };

  const handleNotificationsToggle = async () => {
    setLoading(true);
    try {
      if (notificationsEnabled) {
        await NotificationService.disableNotifications();
        await updateUserNotificationPreference(false);
        setNotificationsEnabled(false);
      } else {
        const currentStatus = await NotificationService.getPermissionStatus();

        if (currentStatus === "denied") {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings to receive expiration alerts.",
            [
              {text: "Cancel", style: "cancel"},
              {text: "Open Settings", onPress: () => Linking.openSettings()},
            ],
          );
          return; // still exits, but setLoading must run in finally
        }

        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          await updateUserNotificationPreference(true);
          setNotificationsEnabled(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserNotificationPreference = async (enabled: boolean) => {
    try {
      await updateDocument("users", user!.$id, {isNotifEnabled: enabled});

      // Update local user state if you have a context/global state
      setUser((prev) => (prev ? {...prev, isNotifEnabled: enabled} : prev));
    } catch (error) {
      console.error("Failed to update notification preference:", error);
    }
  };

  const renderUserInfo = () => {
    return (
      <>
        <View
          className="flex items-center justify-center w-24 h-24 mx-auto mb-6 rounded-full shadow-lg"
          style={{backgroundColor: "#0ecc8f"}}
        >
          <View className="flex items-center justify-center w-20 h-20 bg-white rounded-full">
            <Ionicons name="person" size={32} color="#0ecc8f" />
          </View>
        </View>

        <View className="mb-8 text-center">
          <Text
            className="text-xl font-bold text-center text-gray-900 "
            style={{letterSpacing: 0.5}}
          >
            {user?.name.toUpperCase()}
          </Text>

          <Text className="mb-3 text-base text-center text-gray-600">
            {user?.email}
          </Text>

          <View className="self-center px-4 py-2 bg-green-100 rounded-full">
            <Text className="text-sm font-semibold text-green-700">
              {user?.businessName}
            </Text>
          </View>
        </View>

        {loading && (
          // show loading line with color back and forth
          <View className="flex-row items-center justify-center gap-2 mb-5">
            <View className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" />
            <View className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce delay-150" />
            <View className="w-2.5 h-2.5 bg-green-300 rounded-full animate-bounce delay-300" />
          </View>
        )}

        <Pressable
          className="flex-row items-center justify-start w-full px-6 py-4 mb-3 border border-gray-200 bg-gray-50 rounded-xl"
          onPress={handleEditClick}
          style={({pressed}) => ({
            backgroundColor: pressed ? "#f3f4f6" : "#f9fafb",
            transform: [{scale: pressed ? 0.95 : 1}],
          })}
        >
          <View className="flex items-center justify-center mr-3">
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
          </View>
          <Text className="text-base font-semibold text-gray-800">
            Edit Profile
          </Text>
        </Pressable>

        <Pressable
          disabled={isEditing}
          className={`flex-row items-center justify-between w-full px-6 py-4 mb-3 border border-gray-200 bg-gray-50 rounded-xl ${isEditing ? "opacity-50" : ""}`}
          onPress={handleNotificationsToggle}
          style={({pressed}) => ({
            backgroundColor: pressed ? "#f3f4f6" : "#f9fafb",
            transform: [{scale: pressed ? 0.98 : 1}],
          })}
        >
          <View className="flex-row items-center">
            <View className="flex items-center justify-center mr-3">
              <Ionicons
                name={
                  notificationsEnabled ? "notifications" : "notifications-off"
                }
                size={18}
                color={notificationsEnabled ? "#0ecc8f" : "#6b7280"}
              />
            </View>
            <Text className="text-base font-semibold text-gray-800">
              Notifications
            </Text>
          </View>
          <View
            className={`w-12 h-6 rounded-full ${notificationsEnabled ? "bg-green-500" : "bg-gray-300"}`}
            style={{position: "relative"}}
          >
            <View
              className={`w-5 h-5 bg-white rounded-full shadow-sm ${notificationsEnabled ? "translate-x-6" : "translate-x-0.5"}`}
              style={{
                position: "absolute",
                top: 2,
              }}
            />
          </View>
        </Pressable>

        <Pressable
          disabled={isEditing}
          className={`flex-row items-center justify-start w-full px-6 py-4 mb-6 border border-red-200 bg-red-50 rounded-xl ${isEditing ? "opacity-50" : ""}`}
          onPress={() => {
            logout();
            setModalVisible(false);
          }}
          style={({pressed}) => ({
            backgroundColor: pressed ? "#fef2f2" : "#fef2f2",
            transform: [{scale: pressed ? 0.98 : 1}],
          })}
        >
          {isLoading ? (
            <View className="flex-row items-center justify-center w-full">
              <ActivityIndicator size="small" color="#dc2626" />
              <Text className="ml-2 text-base font-semibold text-red-700">
                Signing out...
              </Text>
            </View>
          ) : (
            <>
              <View className="flex items-center justify-center mr-3">
                <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              </View>
              <Text className="text-base font-semibold text-red-700">
                Sign Out
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setModalVisible(false);
            setIsEditing(false);
          }}
          className="px-6 py-3 rounded-lg"
          style={({pressed}) => ({
            backgroundColor: pressed ? "#f3f4f6" : "transparent",
          })}
        >
          {({pressed}) => (
            <Text
              className={`text-base font-bold text-gray-500 ${pressed ? "underline" : ""}`}
            >
              Close
            </Text>
          )}
        </Pressable>
      </>
    );
  };

  const renderEditInputs = () => {
    return (
      <>
        <View className="w-full">
          <Text className="mb-3 text-lg font-semibold text-center text-gray-800">
            Edit Profile
          </Text>

          <View className="mb-5">
            <Text className="mb-2 ml-1 text-sm font-medium text-gray-700">
              Full Name
            </Text>
            <TextInput
              className="px-4 py-3.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white"
              style={{letterSpacing: 0.5}}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              value={form.name}
              onChangeText={(text) => setForm({...form, name: text})}
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-gray-700">
              Business Name
            </Text>
            <TextInput
              className="px-4 py-3.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white"
              placeholder="Enter your business name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              value={form.business_name}
              onChangeText={(text) => setForm({...form, business_name: text})}
            />
          </View>
        </View>

        <View className="w-full ">
          <Pressable
            className="flex-row items-center justify-center w-full px-6 py-4 mb-3 bg-blue-500 rounded-xl active:bg-blue-600"
            // onPress prop will be added externally for save functionality
            onPress={handleFormSubmit}
            disabled={!form.name || !form.business_name || loading}
          >
            {loading ? (
              <View className="flex items-center justify-center mr-3">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : (
              <>
                <View className="flex items-center justify-center mr-3">
                  <Ionicons name="save" size={18} color="white" />
                </View>
                <Text className="text-base font-semibold text-white">
                  Save Changes
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            className="flex-row items-center justify-center w-full px-6 py-4 mb-6 border border-gray-200 bg-gray-50 rounded-xl active:bg-gray-100"
            onPress={() => {
              setIsEditing(false);
              setForm({
                name: user?.name || "",
                business_name: user?.businessName || "",
              });
            }}
          >
            <Text className="text-base font-semibold text-gray-800">
              Cancel
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <>
      {/* Fixed Header */}
      <View className="flex-row items-center justify-between p-3 pl-1 border-b border-gray-300">
        <View className="flex-row items-center">
          <Image
            source={require("../assets/new-icon.png")}
            style={{width: 55, height: 50}}
            contentFit="cover"
          />
          <View>
            <Text className="text-lg font-bold">Kwenta</Text>
            <Text className="text-xs text-gray-500">
              Track • Control • Grow
            </Text>
          </View>
        </View>

        <Pressable
          className="items-center justify-center size-11 bg-gray-200 rounded-[999]"
          onPress={() => setModalVisible(true)}
        >
          {({pressed}) => (
            <Ionicons
              name="person-outline"
              size={20}
              color={pressed ? "#10b981" : "#6b7280"}
            />
          )}
        </Pressable>
      </View>
      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View className="items-center justify-center flex-1 bg-black/70">
          <View
            className="items-center p-8 py-4 mx-4 bg-white shadow-2xl rounded-3xl"
            style={{width: 340}}
          >
            {isEditing ? renderEditInputs() : renderUserInfo()}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Header;
