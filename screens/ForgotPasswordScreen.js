import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Mail, ArrowLeft, Send } from "lucide-react-native";
import summaryAPI from "../common";

export default function ForgotPasswordScreen({ navigation, route }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    // Lấy role từ params (lawyer hoặc customer)
    const roleFromParams = route.params?.role || "customer";

    const handleSendOTP = async () => {
        if (!email.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập địa chỉ email");
            return;
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            Alert.alert("Lỗi", "Email không đúng định dạng");
            return;
        }

        setLoading(true);
        try {
            console.log("FORGOT_DEBUG_1: Sending OTP to", email.trim(), "with role", roleFromParams);

            const response = await fetch(summaryAPI.checkEmailForgotPassword.url, {
                method: summaryAPI.checkEmailForgotPassword.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), role: roleFromParams }),
            });

            const data = await response.json();

            if (data.success) {
                console.log("FORGOT_DEBUG_2: Success! Navigating with role:", roleFromParams);
                Alert.alert(
                    "Thành công",
                    "Mã OTP đã được gửi đến email của bạn.",
                    [{
                        text: "OK",
                        onPress: () => {
                            navigation.navigate("verify-email", {
                                email: email.trim(),
                                mode: 'forgotPassword',
                                role: roleFromParams // TRUYỀN ROLE Ở ĐÂY
                            });
                        }
                    }]
                );
            } else {
                Alert.alert("Lỗi", data.message || "Email không tồn tại hoặc chưa được xác thực");
            }
        } catch (error) {
            console.error("Forgot Password Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView contentContainerStyle={tw`flex-grow px-6 pt-4`}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
                    >
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>

                    <View style={tw`mt-8 mb-10`}>
                        <Text style={tw`text-3xl font-extrabold text-blue-800`}>
                            Quên mật khẩu?
                        </Text>
                        <Text style={tw`text-gray-500 mt-2 text-base`}>
                            Nhập email của bạn để nhận mã OTP khôi phục mật khẩu. ({roleFromParams})
                        </Text>
                    </View>

                    <View style={tw`gap-y-6`}>
                        <View>
                            <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>
                                Email
                            </Text>
                            <View style={tw`flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-14`}>
                                <Mail size={20} color="#9CA3AF" />
                                <TextInput
                                    style={tw`flex-1 ml-3 text-gray-800`}
                                    placeholder="Nhập email của bạn"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={tw`bg-blue-600 h-14 rounded-2xl items-center justify-center mt-4 shadow-lg shadow-blue-300 ${loading ? "opacity-70" : ""}`}
                            onPress={handleSendOTP}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View style={tw`flex-row items-center`}>
                                    <Send size={20} color="white" />
                                    <Text style={tw`text-white text-lg font-bold ml-2`}>
                                        Gửi mã OTP
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
