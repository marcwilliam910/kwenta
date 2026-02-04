import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs, router } from "expo-router";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useReadAlert } from "@/context/ReadAlertContext";
import NotificationService from "@/lib/services/notificationService";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

const getIconName = (routeName: string): keyof typeof Ionicons.glyphMap => {
  const icons: Record<
    "index" | "recipes" | "inventory" | "expenses" | "alerts",
    keyof typeof Ionicons.glyphMap
  > = {
    index: "trending-up-outline",
    recipes: "calculator-outline",
    inventory: "cube-outline",
    expenses: "wallet-outline",
    alerts: "notifications-outline",
  };
  return icons[routeName as keyof typeof icons];
};

export default function TabLayout() {
  const { user } = useAuth();
  const { unreadCount } = useReadAlert();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // Register for push notifications (async)
    const setupNotifications = async () => {
      try {
        await NotificationService.registerForPushNotifications();
        console.log("Notification permissions registered");
      } catch (error) {
        console.error("Error registering for notifications:", error);
      }
    };

    setupNotifications();

    // Listen for incoming notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    // Listen for user tapping notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data.type === "expiration_alert") {
          router.push("/(tabs)/inventory");
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView className="relative flex-1" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fef2f2" />
      <Header />
      <Tabs
        screenOptions={({ route }) => ({
          tabBarHideOnKeyboard: true,
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            const iconName = getIconName(route.name);
            const color = focused ? "#10b981" : "#6b7280";

            if (route.name === "alerts") {
              return (
                <View className="relative">
                  <Ionicons name={iconName} size={24} color={color} />
                  {unreadCount > 0 && (
                    <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[16px] h-4 px-1 justify-center items-center">
                      <Text className="text-white text-[10px] font-bold">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }

            return <Ionicons name={iconName} size={24} color={color} />;
          },
          tabBarStyle: {
            position: "absolute",
            left: 0,
            bottom: 0,
            right: 0,
          },
          tabBarActiveTintColor: "#0ecc8f",
          tabBarInactiveTintColor: "#6b7280",
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="recipes" options={{ title: "Recipes" }} />
        <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
        <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
        <Tabs.Screen name="alerts" options={{ title: "Alerts" }} />
      </Tabs>
    </SafeAreaView>
  );
}
