import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Mail, Lock, ArrowLeft } from "lucide-react-native";
import { createInputChangeHandler } from "../helper/handleInputChange";
import summaryAPI from "../common";
import InputField from "../helper/InputField";
import { useAuth } from "../contextAPI/AuthProvider";
import ModalError from "../components/ModalError";

export default function LawerLoginScreen({ navigation }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [user, setUser] = useState({
    email: "",
    password: "",
  });
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const handleInputChange = createInputChangeHandler(setUser, setErrors);
  const [serverError, setServerError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const validateForm = () => {
    let tempErrors = {};
    const emailRegex = /\S+@\S+\.\S+/;

    if (!user.email.trim()) tempErrors.email = "Email không được để trống";
    else if (!emailRegex.test(user.email))
      tempErrors.email = "Email không đúng định dạng";
    if (!user.password.trim())
      tempErrors.password = "Mật khẩu không được để trống";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(summaryAPI.login.url, {
        method: summaryAPI.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          role: "lawyer",
        }),
      });

      const data = await response.json();
      console.log("data", data);

      if (response.ok && data.success) {
        console.log("user: ", data.user);

        login(data.user, data.accessToken, data.refreshToken);
        navigation.navigate("Home");
      } else {
        setServerError(data.message || "Đăng Nhập thất bại. Vui lòng thử lại.");
        setShowErrorModal(true);
      }
    } catch (error) {
      setServerError("Lỗi kết nối server. Vui lòng kiểm tra Wi-Fi hoặc IP.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={tw`flex-1 bg-blue-200`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <ScrollView contentContainerStyle={tw`flex-grow px-6 pt-4`}>
          {/* Nút quay lại */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>

          {/* Header Chào mừng */}
          <View style={tw`mt-8 mb-10`}>
            <Text style={tw`text-3xl font-extrabold text-blue-800`}>
              Chào mừng Luật sư trở lại!
            </Text>
            <Text style={tw`text-gray-500 mt-2 text-base`}>
              Đăng nhập hỗ trợ để tiếp tục kết nối với khách hàng của bạn.
            </Text>
          </View>

          {/* Form Nhập liệu */}
          <View style={tw`gap-y-4`}>
            {/* Email Input */}
            <InputField
              label="Email"
              icon={Mail}
              user={user}
              field="email"
              placeholder="email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              handleInputChange={handleInputChange}
              style={[
                tw`flex-1 ml-3`,
                { height: "100%", textAlignVertical: "center" },
              ]}
            />
            {/* Password Input */}
            <InputField
              label="Mật khẩu"
              icon={Lock}
              user={user}
              field="password"
              placeholder="Mật khẩu"
              secureTextEntry={!passwordVisible}
              error={errors.password}
              passwordVisible={passwordVisible}
              setPasswordVisible={setPasswordVisible}
              handleInputChange={handleInputChange}
              style={[
                tw`flex-1 ml-3`,
                { height: "100%", textAlignVertical: "center" },
              ]}
            />

            {/* Quên mật khẩu */}
            <TouchableOpacity
              onPress={() => {
                console.log("LawerLogin: Navigating to ForgotPassword with role: lawyer");
                navigation.navigate("ForgotPassword", { role: "lawyer" });
              }}
              style={tw`items-end`}
            >
              <Text style={tw`text-blue-600 font-semibold text-sm`}>
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>

            {/* Nút Đăng nhập chính */}
            <TouchableOpacity
              style={tw`bg-blue-600 h-14 rounded-2xl items-center justify-center mt-4 shadow-lg shadow-blue-300`}
              onPress={handleLogin}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={tw`text-white text-lg font-bold`}>Đăng nhập</Text>
              )}
            </TouchableOpacity>
          </View>
          {/* Link chuyển sang Đăng ký */}
          <View style={tw`flex-row justify-center mt-10 mb-6`}>
            <Text style={tw`text-gray-500`}>Chưa có tài khoản? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignUp", { navigation })}
            >
              <Text style={tw`text-blue-700 font-bold`}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ModalError
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        serverError={serverError}
        typeError="Lỗi đăng nhập"
      />
    </SafeAreaView>
  );
}
