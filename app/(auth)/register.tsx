"use client";

import {useAuth} from "@/context/AuthContext";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {router} from "expo-router";
import {useRef, useState} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {showMessage} from "react-native-flash-message";
import {SafeAreaView} from "react-native-safe-area-context";

type FormType = {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
};

const validateForm = (form: FormType, setErrors: any) => {
  const newErrors = {
    fullName: "", // Changed from 'username'
    email: "",
    password: "",
    businessName: "", // Keep this
  };
  let isValid = true;

  if (!form.fullName.trim()) {
    newErrors.fullName = "Name is required"; // Changed from 'username'
    isValid = false;
  } else if (form.fullName.length < 3) {
    newErrors.fullName = "Name must be at least 3 characters"; // Changed from 'username'
    isValid = false;
  }

  if (!form.email) {
    newErrors.email = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    newErrors.email = "Please enter a valid email";
    isValid = false;
  }

  if (!form.businessName.trim()) {
    newErrors.businessName = "Business name is required";
    isValid = false;
  } else if (form.businessName.length < 2) {
    newErrors.businessName = "Business name must be at least 2 characters";
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

export default function RegisterScreen() {
  const [form, setForm] = useState<FormType>({
    email: "",
    password: "",
    fullName: "",
    businessName: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    fullName: "",
    businessName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);
  const businessNameInputRef = useRef<TextInput>(null);
  const fullNameInputRef = useRef<TextInput>(null);

  const {register} = useAuth();

  const handleRegister = async () => {
    if (!validateForm(form, setErrors)) return;

    Keyboard.dismiss();

    setSubmitting(true);

    try {
      const {success} = await register(
        form.email,
        form.password,
        form.fullName,
        form.businessName,
      );

      if (success) {
        showMessage({
          message: "Registration Successful",
          description: "Welcome! Your account has been created.",
          type: "success",
        });
      }
    } catch (error: any) {
      if (error.code === 400) {
        showMessage({
          message: "Registration Failed",
          description: "Invalid input. Please check your details.",
          type: "danger",
        });
      } else if (error.code === 409) {
        showMessage({
          message: "Registration Failed",
          description: "This email is already registered.",
          type: "danger",
        });
      } else {
        showMessage({
          message: "Registration Failed",
          description: "An unexpected error occurred. Please try again.",
          type: "danger",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm({...form, [field]: value});
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust offset as needed
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingBlock: 50, // Extra padding for keyboard
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true} // iOS only
        >
          <View className="justify-center flex-1 px-8">
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
                  <Text className="text-sm font-medium text-gray-700">
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
                      onChangeText={(value) =>
                        handleInputChange("email", value)
                      }
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
                  <Text className="text-sm font-medium text-gray-700">
                    Password
                  </Text>
                  <View className="flex-row items-center px-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                    <TextInput
                      className="flex-1 ml-3 text-base text-gray-900"
                      ref={passwordInputRef}
                      onSubmitEditing={() => fullNameInputRef.current?.focus()}
                      returnKeyType="next"
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={form.password}
                      onChangeText={(value) =>
                        handleInputChange("password", value)
                      }
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                    />

                    <Ionicons
                      name={!showPassword ? "eye-off-outline" : "eye-outline"}
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

                {/* Full Name Input */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Full Name
                  </Text>
                  <View className="flex-row items-center px-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      className="flex-1 ml-3 text-base text-gray-900"
                      ref={fullNameInputRef}
                      onSubmitEditing={() =>
                        businessNameInputRef.current?.focus()
                      }
                      returnKeyType="next"
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      value={form.fullName}
                      onChangeText={(value) =>
                        handleInputChange("fullName", value)
                      }
                      autoComplete="name"
                    />
                  </View>
                  {errors.fullName && (
                    <Text className="text-sm text-red-500">
                      {errors.fullName}
                    </Text>
                  )}
                </View>

                {/* Business Name Input */}
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Business Name
                  </Text>
                  <View className="flex-row items-center px-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                    <TextInput
                      className="flex-1 ml-3 text-base text-gray-900"
                      ref={businessNameInputRef}
                      placeholder="Enter your business name"
                      placeholderTextColor="#9CA3AF"
                      value={form.businessName}
                      onChangeText={(value) =>
                        handleInputChange("businessName", value)
                      }
                      autoComplete="organization"
                    />
                  </View>
                  {errors.businessName && (
                    <Text className="text-sm text-red-500">
                      {errors.businessName}
                    </Text>
                  )}
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  className="items-center py-3 mt-2 rounded-lg bg-emerald-500"
                  onPress={handleRegister}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Sign In Link */}
                <Pressable
                  className="items-center py-2"
                  onPress={() => {
                    router.replace("/login");
                  }}
                >
                  {({pressed}) => (
                    <Text
                      className={`text-base font-medium text-emerald-500 ${pressed ? "underline" : ""}`}
                    >
                      Already have an account? Sign In
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
