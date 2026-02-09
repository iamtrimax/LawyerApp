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
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react-native";
import InputField from "../helper/InputField";
import summaryAPI from "../common";
import ModalError from "../components/ModalError";
import { createInputChangeHandler } from "../helper/handleInputChange";

export default function SignUpScreen({ navigation }) {
  // --- States ---
  const [user, setUser] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // States quản lý lỗi
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleInputChange = createInputChangeHandler(setUser, setErrors);
  // --- Logic Xử lý ---

  const validateForm = () => {
    let tempErrors = {};
    const emailRegex = /\S+@\S+\.\S+/;

    if (!user.fullName.trim())
      tempErrors.fullName = "Họ và tên không được để trống";
    if (!user.email.trim()) tempErrors.email = "Email không được để trống";
    else if (!emailRegex.test(user.email))
      tempErrors.email = "Email không đúng định dạng";
    if (!user.phone.trim())
      tempErrors.phone = "Số điện thoại không được để trống";
    if (user.password.length < 8)
      tempErrors.password = "Mật khẩu phải từ 8 ký tự trở lên";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(summaryAPI.registerUser.url, {
        method: summaryAPI.registerUser.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: user.fullName,
          email: user.email,
          password: user.password,
          phone: user.phone,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigation.navigate("verify-email", { email: user.email, role: "customer" });
      } else {
        setServerError(data.message || "Đăng ký thất bại");
        setShowErrorModal(true);
      }
    } catch (error) {
      setServerError("Lỗi kết nối server. Vui lòng kiểm tra Wi-Fi hoặc IP.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Giao diện Helper ---

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`flex-grow px-6 pt-4 pb-10`}
        >
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>

          <View style={tw`mt-6 mb-8`}>
            <Text style={tw`text-3xl font-extrabold text-blue-700`}>
              Tạo tài khoản
            </Text>
            <Text style={tw`text-gray-500 mt-2 text-base`}>
              Đăng ký để bắt đầu tư vấn pháp luật ngay.
            </Text>
          </View>

          <InputField
            label="Họ và tên"
            icon={User}
            user={user}
            field="fullName"
            placeholder="Nguyễn Văn A"
            error={errors.fullName}
            handleInputChange={handleInputChange}
          />
          <InputField
            label="Email"
            icon={Mail}
            user={user}
            field="email"
            placeholder="vidu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            handleInputChange={handleInputChange}
          />
          <InputField
            label="Số điện thoại"
            icon={Phone}
            user={user}
            field="phone"
            placeholder="09xx xxx xxx"
            keyboardType="phone-pad"
            error={errors.phone}
            handleInputChange={handleInputChange}
          />
          <InputField
            label="Mật khẩu"
            icon={Lock}
            user={user}
            field="password"
            placeholder="Tối thiểu 8 ký tự"
            secureTextEntry={!passwordVisible}
            error={errors.password}
            passwordVisible={passwordVisible}
            setPasswordVisible={setPasswordVisible}
            handleInputChange={handleInputChange}
          />

          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            style={tw`flex-row items-center mt-2`}
          >
            <CheckCircle2
              size={22}
              color={isAgreed ? "#1D4ED8" : "#E5E7EB"}
              fill={isAgreed ? "#EFF6FF" : "transparent"}
            />
            <Text style={tw`text-sm text-gray-500 flex-1 ml-2`}>
              Tôi đồng ý với{" "}
              <Text style={tw`text-blue-700 font-bold`}>Điều khoản</Text> &{" "}
              <Text style={tw`text-blue-700 font-bold`}>Bảo mật</Text>.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isAgreed || loading}
            onPress={handleRegister}
            style={tw`${isAgreed ? "bg-blue-600" : "bg-gray-300"
              } h-14 rounded-2xl items-center justify-center mt-8 shadow-lg shadow-blue-200`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white text-lg font-bold`}>Đăng ký ngay</Text>
            )}
          </TouchableOpacity>

          <View style={tw`flex-row justify-center mt-8`}>
            <Text style={tw`text-gray-500`}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={tw`text-blue-700 font-bold`}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- Error Modal --- */}
      <ModalError
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        serverError={serverError}
        typeError="Lỗi đăng ký"
      />
    </SafeAreaView>
  );
}
