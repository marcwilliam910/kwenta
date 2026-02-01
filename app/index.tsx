import {useAuth} from "@/context/AuthContext";
import {Redirect} from "expo-router";
import {ActivityIndicator, View} from "react-native";

export default function Index() {
  const {user, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
