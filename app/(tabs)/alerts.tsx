import {useAuth} from "@/context/AuthContext";
import {useReadAlert} from "@/context/ReadAlertContext";
import NotificationService, {Alert} from "@/lib/services/notificationService";
import {Ionicons} from "@expo/vector-icons";
import {JSX, useEffect, useState} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Alerts(): JSX.Element {
  const {user} = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {setUnreadCount, unreadCount} = useReadAlert();
  const [loadingMark, setLoadingMark] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const usableHeight = height - insets.top - insets.bottom;

  const fetchAlerts = async (): Promise<void> => {
    if (!user?.$id) return;

    const userAlerts = await NotificationService.getAlertsFromDatabase(
      user.$id,
    );

    // Filter alerts to only show those that are actually 3 days or less from expiration
    const now = new Date();
    const activeAlerts = userAlerts.filter((alert) => {
      if (!alert.expirationDate) return false;

      const expirationDate = new Date(alert.expirationDate);
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Only show alerts for ingredients that expire in 3 days or less (including expired)
      const shouldShow = daysUntilExpiry <= 3;

      return shouldShow;
    });

    // Sort by expiration date - most urgent first
    activeAlerts.sort((a, b) => {
      const aExpiry = new Date(a.expirationDate!).getTime();
      const bExpiry = new Date(b.expirationDate!).getTime();
      return aExpiry - bExpiry; // Earliest expiry first
    });

    setAlerts(activeAlerts);
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const markAsRead = async (alertId: string): Promise<void> => {
    setLoadingMark(true);
    await NotificationService.markAlertAsRead(alertId);
    setAlerts((alerts: Alert[]) =>
      alerts.map((a) => (a.$id === alertId ? {...a, isRead: true} : a)),
    );
    setUnreadCount((count: number) => count - 1);
    setLoadingMark(false);
  };

  useEffect(() => {
    const loadAlerts = async () => {
      setIsFetching(true);
      await fetchAlerts();
      setIsFetching(false);
    };

    loadAlerts();
  }, [user]);

  if (isFetching) {
    return (
      // loading indicator
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
    <View className="flex-1">
      {alerts.length === 0 ? (
        <View
          className="items-center justify-center px-8"
          style={{height: usableHeight - 100}}
        >
          {/* Icon Container */}
          <View className="items-center justify-center w-24 h-24 mb-6 bg-gray-100 rounded-full">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="#9CA3AF"
            />
          </View>
          {/* Main Message */}
          <Text className="mb-2 text-xl font-semibold text-center text-gray-800">
            No Urgent Alerts
          </Text>
          {/* Subtitle */}
          <Text className="mb-8 text-base leading-6 text-center text-gray-500">
            You'll see expiration warnings for ingredients expiring within 3
            days here
          </Text>
        </View>
      ) : (
        <View className="flex-1 p-4">
          <View className="mb-4">
            <Text className="text-xl font-bold text-gray-900">Alerts</Text>
            <Text className="text-sm text-gray-500">
              Ingredients expiring within 3 days
            </Text>
          </View>

          {loadingMark && (
            // show loading line with color back and forth
            <View className="flex-row items-center justify-center gap-2">
              <View className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" />
              <View className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce delay-150" />
              <View className="w-2.5 h-2.5 bg-green-300 rounded-full animate-bounce delay-300" />
            </View>
          )}

          <FlatList
            data={alerts}
            keyExtractor={(item) => item.$id}
            renderItem={({item}) => (
              <AlertCard alert={item} markAsRead={markAsRead} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#007AFF" // iOS spinner color
                colors={["#007AFF"]} // Android spinner color
                progressBackgroundColor="#ffffff"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingHorizontal: 5,
              gap: 15,
              paddingBottom: 40 + insets.bottom + 16,
            }}
          />
        </View>
      )}
    </View>
  );
}

function AlertCard({
  alert,
  markAsRead,
}: {
  alert: Alert;
  markAsRead: (id: string) => void;
}) {
  const now = new Date();
  const expirationDate = new Date(alert.expirationDate);
  const createdDate = new Date(alert.$createdAt);

  // Calculate days until expiry (can be negative if expired)
  const msUntilExpiry = expirationDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

  // Calculate days since alert was created
  const msSinceCreated = now.getTime() - createdDate.getTime();
  const daysSinceCreated = Math.floor(msSinceCreated / (1000 * 60 * 60 * 24));

  // Determine urgency level
  const urgency =
    daysUntilExpiry <= 0
      ? "expired"
      : daysUntilExpiry === 1
        ? "urgent"
        : "warning";

  // Style based on urgency and read status
  const getBorderStyle = () => {
    if (alert.isRead) return "bg-gray-50 border-gray-300";
    switch (urgency) {
      case "expired":
        return "bg-red-50 border-red-500";
      case "urgent":
        return "bg-orange-50 border-orange-500";
      default:
        return "bg-yellow-50 border-yellow-400";
    }
  };

  const getIconColor = () => {
    if (alert.isRead) return "#9ca3af";
    switch (urgency) {
      case "expired":
        return "#ef4444";
      case "urgent":
        return "#f97316";
      default:
        return "#eab308";
    }
  };

  const getExpiryText = () => {
    if (daysUntilExpiry < 0) {
      const daysExpired = Math.abs(daysUntilExpiry);
      return `Expired ${daysExpired} day${daysExpired > 1 ? "s" : ""} ago`;
    } else if (daysUntilExpiry === 0) {
      return "Expires today";
    } else if (daysUntilExpiry === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${daysUntilExpiry} days`;
    }
  };

  return (
    <Pressable
      onPress={() => {
        if (!alert.isRead) markAsRead(alert.$id);
      }}
      className={`p-4 rounded-xl border-l-4 ${getBorderStyle()} active:opacity-90`}
    >
      <View className="flex-row items-start justify-between">
        {/* Content */}
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center mb-2">
            <Ionicons
              name={urgency === "expired" ? "alert-circle" : "warning"}
              size={20}
              color={getIconColor()}
            />
            <Text
              className={`ml-2 text-base font-semibold ${
                alert.isRead ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {alert.ingredientName}
            </Text>
          </View>

          {/* Expiration status */}
          <Text
            className={`text-lg mb-3 font-medium ${
              alert.isRead
                ? "text-gray-600"
                : urgency === "expired"
                  ? "text-red-700"
                  : urgency === "urgent"
                    ? "text-orange-700"
                    : "text-yellow-700"
            }`}
          >
            {getExpiryText()}
          </Text>

          {/* Dates info */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              Alert created{" "}
              {daysSinceCreated === 0
                ? "today"
                : `${daysSinceCreated} day${daysSinceCreated > 1 ? "s" : ""} ago`}
            </Text>
            <Text className="text-xs text-gray-500">
              Exp: {formatDate(alert.expirationDate)}
            </Text>
          </View>

          {/* Progress indicator for non-expired items */}
          {daysUntilExpiry > 0 && (
            <View className="mt-3">
              <View className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, ((3 - daysUntilExpiry) / 3) * 100))}%`,
                  }}
                  className={`h-full ${
                    daysUntilExpiry === 1 ? "bg-orange-500" : "bg-yellow-400"
                  }`}
                />
              </View>
            </View>
          )}
        </View>

        {/* Right-side controls */}
        <View className="items-end ml-4">
          {!alert.isRead && (
            <View className="w-3 h-3 mb-2 bg-orange-500 rounded-full" />
          )}
          {!alert.isRead && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                markAsRead(alert.$id);
              }}
              className="px-3 py-1.5 bg-gray-100 rounded-md"
            >
              <Text className="text-xs font-medium text-gray-700">
                Mark Read
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
