import {AppwriteIngredient} from "@/app/(tabs)/inventory";
import {appwriteConfig, databases} from "@/lib/appwrite";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {Platform} from "react-native";
import {ID, Query} from "react-native-appwrite";

export interface Alert {
  $id: string;
  userId: string;
  ingredientId: string;
  ingredientName: string;
  alertType: "expiration_warning";
  message: string;
  expirationDate: string;
  isRead: boolean;
  $createdAt: Date;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  async getPermissionsAsync() {
    return await Notifications.getPermissionsAsync();
  }

  // NEW METHOD: Get current permission status
  async getPermissionStatus() {
    try {
      const {status} = await Notifications.getPermissionsAsync();
      return status; // returns 'granted', 'denied', or 'undetermined'
    } catch (error) {
      console.error("Failed to get permission status:", error);
      return "undetermined";
    }
  }

  // NEW METHOD: Check if notifications are actually enabled
  async areNotificationsEnabled() {
    const status = await this.getPermissionStatus();
    return status === "granted";
  }

  // NEW METHOD: Disable notifications (cancel all and cleanup)
  // Replace the existing disableNotifications method with this:
  async disableNotifications() {
    try {
      // Cancel all scheduled notifications
      await this.cancelAllNotifications();

      // Note: We cannot programmatically disable notification permissions
      // The user would need to go to device settings to revoke permissions

      console.log("📴 All scheduled notifications cancelled");
    } catch (error) {
      console.error("Failed to disable notifications:", error);
    }
  }

  // NEW METHOD: Cleanup all alerts for a user
  async cleanupAllAlertsForUser(userId: string) {
    try {
      const alerts = await databases.listDocuments(
        appwriteConfig.databaseId,
        "alerts",
        [Query.equal("userId", userId)],
      );

      for (const alert of alerts.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          "alerts",
          alert.$id,
        );
      }

      console.log(
        `📋 Cleaned up ${alerts.documents.length} alerts for user ${userId}`,
      );
    } catch (error) {
      console.error("Failed to cleanup user alerts:", error);
    }
  }

  async registerForPushNotifications() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const {status: existingStatus} =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.error("Failed to get push token for push notification!");
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;
    } else {
      console.error("Must use physical device for Push Notifications");
    }

    return token;
  }

  async getUnreadCount(userId: string) {
    try {
      // Compute cutoff date = now + 3 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 3);

      const alerts = await databases.listDocuments(
        appwriteConfig.databaseId,
        "alerts",
        [
          Query.equal("userId", userId),
          Query.equal("isRead", false),
          Query.lessThanEqual("expirationDate", cutoff.toISOString()), // <= 3 days
        ],
      );

      return alerts.total;
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      return 0;
    }
  }
  async storeAlertInDatabase(
    ingredient: Partial<AppwriteIngredient>,
    userId: string,
  ) {
    try {
      const alert = await databases.createDocument(
        appwriteConfig.databaseId,
        "alerts",
        ID.unique(),
        {
          userId: userId,
          ingredientId: ingredient.$id,
          ingredientName: ingredient.name,
          alertType: "expiration_warning",
          message: `${ingredient.name} expires in 3 days`,
          expirationDate: ingredient.expires?.toISOString(),
          isRead: false,
        },
      );
      console.log(`📋 Stored alert in database for ${ingredient.name}`);
      return alert;
    } catch (error) {
      console.error("Failed to store alert in database:", error);
      return null;
    }
  }

  async scheduleIngredientExpirationNotification(
    ingredient: Partial<AppwriteIngredient>,
    userId: string,
  ) {
    if (!ingredient.expires) return null;

    const expirationDate = new Date(ingredient.expires);
    // Calculate alert date: 3 days before expiration
    const alertDate = new Date(
      expirationDate.getTime() - 3 * 24 * 60 * 60 * 1000,
    );

    // for testing, 1 minute only
    // const alertDate = new Date(Date.now() + 1 * 60 * 1000);

    // Don't schedule notification if alert date is in the past
    if (alertDate <= new Date()) return null;

    try {
      // 1. Schedule the notification first
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Ingredient Expiring Soon!",
          body: `${ingredient.name} expires in 3 days (${expirationDate.toLocaleDateString()})`,
          data: {
            ingredientId: ingredient.$id,
            type: "expiration_alert",
            userId: userId,
            ingredientName: ingredient.name,
            expires: ingredient.expires,
          },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alertDate,
        },
      });

      console.log(
        `🔔 Scheduled notification for ${ingredient.name} on ${alertDate.toLocaleString()}`,
      );

      // 2. Store alert in database - THIS IS THE CALL YOU'RE LOOKING FOR!
      await this.storeAlertInDatabase(ingredient, userId);

      return notificationId;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`🗑️ Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async getAlertsFromDatabase(userId: string) {
    try {
      const alerts = await databases.listDocuments(
        appwriteConfig.databaseId,
        "alerts",
        [
          Query.equal("userId", userId),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ],
      );
      return alerts.documents as unknown as Alert[];
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      return [];
    }
  }

  async markAlertAsRead(alertId: string) {
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        "alerts",
        alertId,
        {
          isRead: true,
          readAt: new Date().toISOString(),
        },
      );
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  }

  // Helper method to clean up notifications for deleted ingredients
  async cleanupNotificationForIngredient(
    ingredientId: string,
    notificationId?: string,
  ) {
    if (notificationId) {
      await this.cancelNotification(notificationId);
    }

    // Also cleanup any alerts in database for this ingredient
    try {
      const alerts = await databases.listDocuments(
        appwriteConfig.databaseId,
        "alerts",
        [Query.equal("ingredientId", ingredientId)],
      );

      for (const alert of alerts.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          "alerts",
          alert.$id,
        );
      }
      console.log(
        `📋 Cleaned up ${alerts.documents.length} alerts for ingredient ${ingredientId}`,
      );
    } catch (error) {
      console.error("Failed to cleanup alerts for deleted ingredient:", error);
    }
  }

  // Helper method to clean up old alerts when rescheduling
  async cleanupOldAlertsForIngredient(ingredientId: string) {
    try {
      const alerts = await databases.listDocuments(
        appwriteConfig.databaseId,
        "alerts",
        [Query.equal("ingredientId", ingredientId)],
      );

      for (const alert of alerts.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          "alerts",
          alert.$id,
        );
      }
      console.log(
        `📋 Cleaned up ${alerts.documents.length} old alerts for rescheduling ingredient ${ingredientId}`,
      );
    } catch (error) {
      console.error("Failed to cleanup old alerts for rescheduling:", error);
    }
  }
}

export default new NotificationService();
