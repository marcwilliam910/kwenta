import { AuthProvider } from "@/context/AuthContext";
import { ExpensesSalesProvider } from "@/context/ExpensesSalesContext";
import { IngredientsProvider } from "@/context/IngredientsContext";
import { ReadAlertProvider } from "@/context/ReadAlertContext";
import RecipeContextProvider from "@/context/RecipesContext";
import { Stack } from "expo-router";
import FlashMessage from "react-native-flash-message";
import "react-native-url-polyfill/auto";
import "../global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <IngredientsProvider>
        <RecipeContextProvider>
          <ExpensesSalesProvider>
            <ReadAlertProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
              </Stack>
              <FlashMessage position="top" hideStatusBar={true} duration={5000} />
            </ReadAlertProvider>
          </ExpensesSalesProvider>
        </RecipeContextProvider>
      </IngredientsProvider>
    </AuthProvider>
  );
}
