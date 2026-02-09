import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, User, Mail, Phone, Shield, Save, Edit2 } from 'lucide-react-native';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

const InfoRow = ({ icon: Icon, label, value, field, editable, isEditing, formData, setFormData }) => (
    <View style={tw`mb-5`}>
        <View style={tw`flex-row items-center mb-1`}>
            <Icon size={16} color="#64748B" />
            <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>{label}</Text>
        </View>
        {isEditing && editable ? (
            <TextInput
                style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold`}
                value={formData[field]}
                onChangeText={(text) => setFormData({ ...formData, [field]: text })}
                placeholder={`Nhập ${label.toLowerCase()}`}
                keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
            />
        ) : (
            <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                <Text style={tw`text-slate-800 font-bold`}>{value || "Chưa cập nhật"}</Text>
            </View>
        )}
    </View>
);

export default function UserProfileScreen({ navigation }) {
    const { user, updateUser, fetchUserDetail } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullname: user?.fullname || '',
        phone: user?.phone || ''
    });

    // Đồng bộ formData khi dữ liệu user trong AuthContext thay đổi
    useEffect(() => {
        if (user) {
            setFormData({
                fullname: user.fullname || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleUpdate = async () => {
        if (!formData.fullname.trim()) {
            Alert.alert("Lỗi", "Họ tên không được để trống");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            const response = await fetch(summaryAPI.updateUser.url, {
                method: summaryAPI.updateUser.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                // Cập nhật ngay lập tức vào context bằng hàm updateUser hỗ trợ gộp dữ liệu
                await updateUser(data.data);

                Alert.alert("Thành công", "Cập nhật thông tin thành công");
                setIsEditing(false);
            } else {
                Alert.alert("Lỗi", data.message || "Cập nhật thất bại");
            }
        } catch (error) {
            console.error("Update User Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
        } finally {
            setLoading(false);
        }
    };



    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Thông tin cá nhân</Text>
                </View>
                {!isEditing && (
                    <TouchableOpacity
                        onPress={() => setIsEditing(true)}
                        style={tw`bg-blue-50 p-2 rounded-full`}
                    >
                        <Edit2 size={20} color="#2563EB" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={tw`p-6 pb-32`}>
                {/* Avatar Section */}
                <View style={tw`items-center mb-8`}>
                    <View style={tw`w-24 h-24 rounded-full bg-blue-100 items-center justify-center border-4 border-white shadow-md`}>
                        {
                            user.role === "lawyer" ? (
                                <Image source={{ uri: user.avatar }} style={tw`w-24 h-24 rounded-full`} />
                            ) : (
                                <User size={48} color="#2563EB" />
                            )
                        }
                    </View>
                    <Text style={tw`mt-3 text-xl font-bold text-slate-800`}>{user?.fullname}</Text>
                    <View style={tw`mt-1 bg-blue-50 px-3 py-1 rounded-full`}>
                        <Text style={tw`text-blue-600 text-xs font-bold uppercase tracking-wider`}>
                            {user?.role === 'lawyer' ? 'Luật sư' : user?.role === 'member' ? 'Thành viên' : 'Khách hàng'}
                        </Text>
                    </View>
                </View>

                {/* Form Section */}
                <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100`}>
                    <InfoRow
                        icon={User}
                        label="Họ và tên"
                        value={user?.fullname}
                        field="fullname"
                        editable={true}
                        isEditing={isEditing}
                        formData={formData}
                        setFormData={setFormData}
                    />
                    <InfoRow
                        icon={Mail}
                        label="Địa chỉ Email"
                        value={user?.email}
                        editable={false}
                        isEditing={isEditing}
                        formData={formData}
                        setFormData={setFormData}
                    />
                    <InfoRow
                        icon={Phone}
                        label="Số điện thoại"
                        value={user?.phone}
                        field="phone"
                        editable={true}
                        isEditing={isEditing}
                        formData={formData}
                        setFormData={setFormData}
                    />
                    <InfoRow
                        icon={Shield}
                        label="Vai trò"
                        value={user?.role === 'lawyer' ? 'Luật sư' : user?.role === 'member' ? 'Thành viên' : 'Khách hàng'}
                        editable={false}
                        isEditing={isEditing}
                        formData={formData}
                        setFormData={setFormData}
                    />
                </View>

                {/* Nâng cấp tài khoản link (chỉ dành cho Member) */}
                {!isEditing && user?.role === 'member' && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("LawyerUpgrade")}
                        style={tw`mt-4 flex-row items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200`}
                    >
                        <Shield size={20} color="white" />
                        <Text style={tw`ml-2 text-white font-bold`}>Nâng cấp lên Luật sư cộng tác</Text>
                    </TouchableOpacity>
                )}

                {/* Đổi mật khẩu link */}
                {!isEditing && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("ChangePassword")}
                        style={tw`mt-6 flex-row items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm`}
                    >
                        <Shield size={20} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600 font-bold`}>Đổi mật khẩu</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            {isEditing && (
                <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex-row gap-4`}>
                    <TouchableOpacity
                        onPress={() => {
                            setIsEditing(false);
                            setFormData({ fullname: user?.fullname, phone: user?.phone });
                        }}
                        style={tw`flex-1 py-4 rounded-2xl bg-slate-100 items-center justify-center`}
                        disabled={loading}
                    >
                        <Text style={tw`text-slate-600 font-bold text-lg`}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleUpdate}
                        style={tw`flex-[2] py-4 rounded-2xl bg-blue-600 shadow-lg shadow-blue-300 items-center justify-center flex-row`}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text style={tw`text-white font-bold text-lg ml-2`}>Lưu thay đổi</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
