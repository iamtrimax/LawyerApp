import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import summaryAPI from "../common";

export default function VerifyOTPScreen({ navigation, route }) {
  // FINAL_DEBUG: Kiểm tra toàn bộ params
  const { email, role, mode = 'registration' } = route.params || {};
  
  console.log("VERIFY_DEBUG: Params received:", JSON.stringify(route.params));
  console.log("VERIFY_DEBUG: Email:", email);
  console.log("VERIFY_DEBUG: Role:", role);
  console.log("VERIFY_DEBUG: Mode:", mode);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      Alert.alert("Thông báo", "Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setLoading(true);
    try {
      const api = mode === 'forgotPassword'
        ? summaryAPI.verifyOTPForgotPassword
        : summaryAPI.verifyEmail;

      console.log("VERIFY_DEBUG: Calling API with role:", role);

      const response = await fetch(api.url, {
        method: api.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString, role }),
      });

      const data = await response.json();

      if (data.success) {
        if (mode === 'forgotPassword') {
          navigation.navigate("ResetPassword", { email, otp: otpString,role });
        } else {
          if (role === "lawyer") {
            Alert.alert("Thành công", "Tài khoản luật sư đã kích hoạt!");
            navigation.navigate("LawyerLogin"); // Đã sửa tên đúng
          } else {
            Alert.alert("Thành công", "Tài khoản đã kích hoạt!");
            navigation.navigate("Login");
          }
        }
      } else {
        Alert.alert("Lỗi", data.message || "Mã OTP không hợp lệ");
      }
    } catch (error) {
      console.error("Verify OTP Error:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1 px-6`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`mt-4 w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>

        <View style={tw`items-center mt-10`}>
          <View style={tw`w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-6`}>
            <ShieldCheck size={40} color="#1D4ED8" />
          </View>
          <Text style={tw`text-2xl font-bold text-gray-800`}>
            {mode === 'forgotPassword' ? 'Khôi phục mật khẩu' : 'Xác thực tài khoản'}
          </Text>
          <Text style={tw`text-gray-500 text-center mt-2 px-4`}>
            Email: <Text style={tw`font-bold text-gray-700`}>{email}</Text> ({role})
          </Text>
        </View>

        <View style={tw`flex-row justify-between mt-10`}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              style={tw`w-12 h-14 border-2 ${digit ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'} rounded-xl text-center text-xl font-bold text-gray-800`}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={loading}
          style={tw`bg-blue-600 h-14 rounded-2xl items-center justify-center mt-10 shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white text-lg font-bold`}>Xác nhận</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={tw`mt-6 items-center`}>
          <Text style={tw`text-gray-500`}>
            Chưa nhận được mã? <Text style={tw`text-blue-700 font-bold`}>Gửi lại</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}