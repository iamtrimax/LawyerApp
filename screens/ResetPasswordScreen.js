import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';
import summaryAPI from '../common';

export default function ResetPasswordScreen({ navigation, route }) {
    const { email, otp, role } = route.params;
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        new: false,
        confirm: false
    });
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const handleResetPassword = async () => {
        if (!formData.newPassword || !formData.confirmPassword) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
            return;
        }

        if (formData.newPassword.length < 8) {
            Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(summaryAPI.resetPassword.url, {
                method: summaryAPI.resetPassword.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword: formData.newPassword,
                    confirmPassword: formData.confirmPassword,
                    role
                })
            });

            const data = await response.json();
        
            
            if (data.success) {
                Alert.alert(
                    "Thành công",
                    "Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.",
                    [{ text: "Đăng nhập", onPress: () => role==="customer" ? navigation.navigate("Login"): navigation.navigate("LawyerLogin") }]
                );
            } else {
                Alert.alert("Lỗi", data.message || "Đặt lại mật khẩu thất bại");
            }
        } catch (error) {
            console.error("Reset Password Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
        } finally {
            setLoading(false);
        }
    };

    const toggleShow = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
            >
                {/* Header */}
                <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Đặt lại mật khẩu</Text>
                </View>

                <ScrollView contentContainerStyle={tw`p-6`}>
                    <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100`}>
                        <Text style={tw`text-slate-500 text-sm mb-6`}>
                            Vui lòng nhập mật khẩu mới cho tài khoản:{"\n"}
                            <Text style={tw`font-bold text-slate-700`}>{email}</Text>
                        </Text>

                        {/* New Password */}
                        <View style={tw`mb-5`}>
                            <Text style={tw`text-slate-700 font-semibold mb-2 ml-1`}>Mật khẩu mới</Text>
                            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4`}>
                                <Lock size={20} color="#2563EB" />
                                <TextInput
                                    placeholder="Nhập mật khẩu mới"
                                    secureTextEntry={!showPassword.new}
                                    style={tw`flex-1 h-14 ml-3 text-slate-800`}
                                    value={formData.newPassword}
                                    onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                                    placeholderTextColor="#94A3B8"
                                />
                                <TouchableOpacity onPress={() => toggleShow('new')}>
                                    {showPassword.new ? <EyeOff size={20} color="#2563EB" /> : <Eye size={20} color="#2563EB" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={tw`mb-8`}>
                            <Text style={tw`text-slate-700 font-semibold mb-2 ml-1`}>Xác nhận mật khẩu mới</Text>
                            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4`}>
                                <Lock size={20} color="#2563EB" />
                                <TextInput
                                    placeholder="Nhập lại mật khẩu mới"
                                    secureTextEntry={!showPassword.confirm}
                                    style={tw`flex-1 h-14 ml-3 text-slate-800`}
                                    value={formData.confirmPassword}
                                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                    placeholderTextColor="#94A3B8"
                                />
                                <TouchableOpacity onPress={() => toggleShow('confirm')}>
                                    {showPassword.confirm ? <EyeOff size={20} color="#2563EB" /> : <Eye size={20} color="#2563EB" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleResetPassword}
                            disabled={loading}
                            style={tw`bg-blue-600 h-14 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <CheckCircle2 size={20} color="white" />
                                    <Text style={tw`text-white font-bold text-lg ml-2`}>Đặt lại mật khẩu</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
