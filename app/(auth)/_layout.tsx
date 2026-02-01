import {useAuth} from "@/context/AuthContext";
import {Redirect, Stack} from "expo-router";

export default function AuthLayout() {
  const {user} = useAuth();

  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
