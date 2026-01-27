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
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';

export default function ChangePasswordScreen({ navigation }) {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false,
        confirm: false
    });
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChangePassword = async () => {
        // Validation
        if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
            return;
        }

        if (formData.newPassword === formData.oldPassword) {
            Alert.alert("Lỗi", "Mật khẩu mới không được trùng với mật khẩu cũ");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            const response = await fetch(summaryAPI.changePassword.url, {
                method: summaryAPI.changePassword.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword,
                    confirmPassword: formData.confirmPassword
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Cập nhật token mới và gộp dữ liệu user
                // Theo yêu cầu: dữ liệu trả về có user, accessToken, refreshToken
                await login(data.user, data.accessToken, data.refreshToken);

                Alert.alert(
                    "Thành công",
                    "Đổi mật khẩu thành công. Các thiết bị khác đã bị đăng xuất.",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Lỗi", data.message || "Đổi mật khẩu thất bại");
            }
        } catch (error) {
            console.error("Change Password Error:", error);
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
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Đổi mật khẩu</Text>
                </View>

                <ScrollView contentContainerStyle={tw`p-6`}>
                    <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100`}>
                        <Text style={tw`text-slate-500 text-sm mb-6`}>
                            Mật khẩu mới của bạn phải có ít nhất 6 ký tự và khác với mật khẩu cũ để đảm bảo an toàn.
                        </Text>

                        {/* Old Password */}
                        <View style={tw`mb-5`}>
                            <Text style={tw`text-slate-700 font-semibold mb-2 ml-1`}>Mật khẩu hiện tại</Text>
                            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4`}>
                                <Lock size={20} color="#64748B" />
                                <TextInput
                                    placeholder="Nhập mật khẩu cũ"
                                    secureTextEntry={!showPassword.old}
                                    style={tw`flex-1 h-14 ml-3 text-slate-800`}
                                    value={formData.oldPassword}
                                    onChangeText={(text) => setFormData({ ...formData, oldPassword: text })}
                                    placeholderTextColor="#94A3B8"
                                />
                                <TouchableOpacity onPress={() => toggleShow('old')}>
                                    {showPassword.old ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                                </TouchableOpacity>
                            </View>
                        </View>

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
                            onPress={handleChangePassword}
                            disabled={loading}
                            style={tw`bg-blue-600 h-14 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <CheckCircle2 size={20} color="white" />
                                    <Text style={tw`text-white font-bold text-lg ml-2`}>Cập nhật mật khẩu</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
