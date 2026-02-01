import {useAuth} from "@/context/AuthContext";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {router} from "expo-router";
import React, {useRef, useState} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {showMessage} from "react-native-flash-message";

type FormType = {
  email: string;
  password: string;
};

const validateForm = (form: FormType, setErrors: any) => {
  const newErrors = {email: "", password: ""};
  let isValid = true;

  if (!form.email) {
    newErrors.email = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    newErrors.email = "Please enter a valid email";
    isValid = false;
  }

  if (!form.password) {
    newErrors.password = "Password is required";
    isValid = false;
  } else if (form.password.length < 8) {
    newErrors.password = "Password must be at least 8 characters";
    isValid = false;
  }

  setErrors(newErrors);
  return isValid;
};

export default function LoginScreen() {
  const {login} = useAuth();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!validateForm(form, setErrors)) return;

    Keyboard.dismiss();

    setSubmitting(true);

    try {
      const {success} = await login(form.email, form.password);

      if (success) {
        showMessage({
          message: "Login Successful",
          description: "Welcome back!",
          type: "success",
        });
      }
    } catch (error: any) {
      // Check if the error is an AppwriteException
      if (error.code === 401) {
        showMessage({
          message: "Login Failed",
          description: "Invalid email or password",
          type: "danger",
        });
      } else {
        showMessage({
          message: "Error",
          description: error.message || "An unexpected error occurred",
          type: "danger",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: "#fff"}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust offset as needed
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            justifyContent: "center",
            paddingBlock: 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="justify-center flex-1 min-h-full px-8">
            <View className="items-center gap-6">
              <View className="items-center ">
                {/* Logo */}

                <Image
                  source={require("../../assets/new-icon.png")}
                  style={{width: 150, height: 140}}
                  contentFit="cover"
                />

                {/* Header */}
                <View className="items-center gap-2">
                  <Text className="text-2xl font-bold text-gray-900">
                    Kwenta
                  </Text>
                  <Text className="text-base text-center text-gray-600 ">
                    Smart Costing & Inventory Tracker
                  </Text>
                </View>
              </View>

              {/* Form */}
              <View className="w-full max-w-sm gap-4 mx-auto">
                {/* Email Input */}
                <View className="gap-2">
                  <Text className="text-base font-medium text-gray-700">
                    Email
                  </Text>
                  <View className="flex-row items-center px-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      returnKeyType="next"
                      className="flex-1 ml-3 text-base text-gray-900"
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      value={form.email}
                      onChangeText={(email) => setForm({...form, email})}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                  {errors.email && (
                    <Text className="text-sm text-red-500">{errors.email}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View className="gap-2">
                  <Text className="text-base font-medium text-gray-700">
                    Password
                  </Text>
                  <View className="flex-row items-center px-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                    <TextInput
                      ref={passwordInputRef}
                      className="flex-1 ml-3 text-base text-gray-900"
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={form.password}
                      onChangeText={(password) => setForm({...form, password})}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#9CA3AF"
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  </View>
                  {errors.password && (
                    <Text className="text-sm text-red-500">
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Sign In Button */}
                <Pressable
                  className="items-center py-3 mt-2 rounded-lg bg-emerald-500"
                  onPress={handleLogin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white ">
                      Sign In
                    </Text>
                  )}
                </Pressable>

                {/* Sign Up Link */}
                <Pressable
                  className="items-center py-2"
                  onPress={() => router.replace("/register")}
                >
                  {({pressed}) => (
                    <Text
                      className={`text-base font-medium text-emerald-500 ${pressed ? "underline" : ""}`}
                    >
                      Don't have an account? Sign Up
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
