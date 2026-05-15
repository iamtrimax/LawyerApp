import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, User, Mail, Phone, Shield, Save, Edit2, Briefcase, CreditCard, Camera, Star, MapPin, FileText } from 'lucide-react-native';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI from '../common';
import storage from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';

const InfoRow = ({ icon: Icon, label, value, field, editable, isEditing, formData, setFormData, keyboardType = 'default' }) => (
    <View style={tw`mb-5`}>
        <View style={tw`flex-row items-center mb-1`}>
            <Icon size={16} color="#64748B" />
            <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>{label}</Text>
        </View>
        {isEditing && editable ? (
            <AppTextInput
                style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold`}
                value={formData[field]}
                onChangeText={(text) => setFormData({ ...formData, [field]: text })}
                placeholder={`Nhập ${label.toLowerCase()}`}
                keyboardType={keyboardType}
            />
        ) : (
            <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                <Text style={tw`text-slate-800 font-bold`}>{value || "Chưa cập nhật"}</Text>
            </View>
        )}
    </View>
);

const SectionTitle = ({ title, icon: Icon }) => (
    <View style={tw`flex-row items-center mb-4 mt-2 px-1`}>
        <View style={tw`w-1 h-6 bg-blue-600 rounded-full mr-3`} />
        {Icon && <Icon size={18} color="#1E3A8A" style={tw`mr-2`} />}
        <Text style={tw`text-base font-black text-blue-900 uppercase tracking-wider`}>{title}</Text>
    </View>
);

export default function LawyerProfileScreen({ navigation }) {
    const { user, updateUser, fetchUserDetail } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        fullname: user?.fullname || '',
        phone: user?.phone || '',
        specialty: Array.isArray(user?.specialty) ? user.specialty : (user?.specialty ? user.specialty.split(',').map(s => s.trim()) : []),
        firmName: user?.firmName || '',
        lawyerId: user?.lawyerId || '',
        bankInfo: {
            bankName: user?.bankInfo?.bankName || '',
            accountNumber: user?.bankInfo?.accountNumber || '',
            accountName: user?.bankInfo?.accountName || ''
        },
        avatar: user?.avatar || '',
        lawyerCardImage: user?.lawyerCardImage || ''
    });

    const specialties = [
        'Dân sự', 'Hình sự', 'Đất đai', 'Hôn nhân', 'Lao động', 'Kinh doanh',
        'Bồi thường & Giải phóng mặt bằng', 'Giá đất & Nghĩa vụ tài chính', 
        'Thủ tục hành chính & Cấp sổ đỏ', 'Quy hoạch & Kế hoạch sử dụng đất', 'Khác'
    ];

    useEffect(() => {
        if (user) {
            setFormData({
                fullname: user.fullname || '',
                phone: user.phone || '',
                specialty: Array.isArray(user.specialty) ? user.specialty : (user.specialty ? user.specialty.split(',').map(s => s.trim()) : []),
                firmName: user.firmName || '',
                lawyerId: user.lawyerId || '',
                bankInfo: {
                    bankName: user.bankInfo?.bankName || '',
                    accountNumber: user.bankInfo?.accountNumber || '',
                    accountName: user.bankInfo?.accountName || ''
                },
                avatar: user.avatar || '',
                lawyerCardImage: user.lawyerCardImage || ''
            });
        }
    }, [user]);

    const uploadToCloudinary = async (imageUri, type) => {
        if (!imageUri || imageUri.startsWith('http')) return imageUri;

        const cloudName = Constants.expoConfig?.extra?.cloudName || process.env.EXPO_PUBLIC_CLOUD_NAME;
        const data = new FormData();

        if (Platform.OS === 'web') {
            try {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                data.append("file", blob, type === 'avatar' ? "lawyer_avatar.jpg" : "lawyer_card.jpg");
            } catch (error) {
                console.error("Web Blob fetch error:", error);
                return null;
            }
        } else {
            data.append("file", {
                uri: imageUri,
                type: "image/jpeg",
                name: type === 'avatar' ? "lawyer_avatar.jpg" : "lawyer_card.jpg",
            });
        }
        
        data.append("upload_preset", "lawyerPicture");
        data.append("cloud_name", cloudName);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: data,
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            const result = await response.json();
            return result.secure_url;
        } catch (error) {
            console.error(`Lỗi upload ảnh ${type}:`, error);
            return null;
        }
    };

    const pickCard = async () => {
        if (!isEditing) {
            Alert.alert("Thông báo", "Vui lòng nhấn nút 'Chỉnh sửa' ở góc trên bên phải để thay đổi thông tin.");
            return;
        }
        Alert.alert(
            "Cập nhật thẻ hành nghề",
            "Bạn muốn chọn ảnh hay file tài liệu?",
            [
                { text: "Chọn Ảnh", onPress: () => pickImage('card') },
                { text: "Chọn File (PDF/Word)", onPress: () => pickDocument('card') },
                { text: "Hủy", style: "cancel" }
            ]
        );
    };

    const pickDocument = async (type) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'image/*'
                ],
            });

            if (!result.canceled) {
                const selectedUri = result.assets[0].uri;
                setFormData({ ...formData, lawyerCardImage: selectedUri });
            }
        } catch (error) {
            console.error("Lỗi khi chọn file:", error);
            Alert.alert("Lỗi", "Không thể mở trình chọn file.");
        }
    };

    const pickImage = async (type) => {
        if (!isEditing) {
            Alert.alert("Thông báo", "Vui lòng nhấn nút 'Chỉnh sửa' ở góc trên bên phải để thay đổi ảnh.");
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            const { status: retryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (retryStatus !== "granted") {
                Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt điện thoại!");
                return;
            }
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: type === 'avatar' ? [1, 1] : [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            const selectedUri = result.assets[0].uri;
            if (type === 'avatar') {
                setFormData({ ...formData, avatar: selectedUri });
            } else {
                setFormData({ ...formData, lawyerCardImage: selectedUri });
            }
        }
    };

    const toggleSpecialty = (item) => {
        setFormData(prev => {
            const current = Array.isArray(prev.specialty) ? prev.specialty : [];
            const isSelected = current.includes(item);
            const next = isSelected 
                ? current.filter(i => i !== item)
                : [...current, item];
            return { ...prev, specialty: next };
        });
    };

    const handleUpdate = async () => {
        if (!formData.fullname.trim()) {
            Alert.alert("Lỗi", "Họ tên không được để trống");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload ảnh nếu có thay đổi
            let avatarUrl = formData.avatar;
            let cardUrl = formData.lawyerCardImage;

            if (formData.avatar !== user?.avatar) {
                const uploadedAvatar = await uploadToCloudinary(formData.avatar, 'avatar');
                if (uploadedAvatar) avatarUrl = uploadedAvatar;
            }

            if (formData.lawyerCardImage !== user?.lawyerCardImage) {
                const uploadedCard = await uploadToCloudinary(formData.lawyerCardImage, 'card');
                if (uploadedCard) cardUrl = uploadedCard;
            }

            const token = await storage.getAuthToken();
            if (!token) return;

            const response = await fetch(summaryAPI.UpdateLawyerProfile.url, {
                method: summaryAPI.UpdateLawyerProfile.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    avatar: avatarUrl,
                    lawyerCardImage: cardUrl
                })
            });

            if (response.status === 401) {
                return; // AuthProvider handles logout
            }

            const data = await response.json();
            if (data.success) {
                await fetchUserDetail();
                Alert.alert("Thành công", "Cập nhật hồ sơ chuyên gia thành công");
                setIsEditing(false);
            } else {
                Alert.alert("Lỗi", data.message || "Cập nhật thất bại");
            }
        } catch (error) {
            console.error("Update Lawyer Profile Error:", error);
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
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Hồ sơ chuyên gia</Text>
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

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView contentContainerStyle={tw`p-6 pb-32`}>
                    {/* Avatar Section */}
                    <View style={tw`items-center mb-8`}>
                        <TouchableOpacity
                            onPress={() => pickImage('avatar')}
                            style={tw`relative`}
                        >
                            <View style={tw`w-28 h-28 rounded-3xl bg-blue-100 items-center justify-center border-4 border-white shadow-lg overflow-hidden`}>
                                {formData.avatar ? (
                                    <Image 
                                        key={formData.avatar}
                                        source={{ uri: formData.avatar.replace('http://', 'https://') }} 
                                        style={tw`w-full h-full`} 
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <User size={48} color="#2563EB" />
                                )}
                            </View>
                            {isEditing && (
                                <View style={tw`absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl border-2 border-white shadow-md`}>
                                    <Camera size={16} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={tw`mt-4 text-xl font-black text-slate-800`}>{user?.fullname}</Text>
                        <View style={tw`mt-1 flex-row items-center`}>
                            <Star size={14} color="#F59E0B" fill="#F59E0B" />
                            <Text style={tw`ml-1 text-slate-500 font-bold text-xs uppercase tracking-wider`}>Chuyên gia pháp lý</Text>
                        </View>
                    </View>

                    {/* Section: Thông tin cá nhân */}
                    <SectionTitle title="Thông tin cá nhân" icon={User} />
                    <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6`}>
                        <InfoRow
                            icon={User}
                            label="Họ và tên"
                            value={formData.fullname}
                            field="fullname"
                            editable={false}
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
                            value={formData.phone}
                            field="phone"
                            editable={false}
                            isEditing={isEditing}
                            formData={formData}
                            setFormData={setFormData}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Section: Hồ sơ năng lực */}
                    <SectionTitle title="Hồ sơ năng lực" icon={Briefcase} />
                    <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6`}>
                        <InfoRow
                            icon={FileText}
                            label="Số thẻ hành nghề"
                            value={formData.lawyerId}
                            field="lawyerId"
                            editable={true}
                            isEditing={isEditing}
                            formData={formData}
                            setFormData={setFormData}
                        />

                        <View style={tw`mb-5`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <Shield size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>Chuyên môn chính</Text>
                            </View>
                            {isEditing ? (
                                <View style={tw`flex-row flex-wrap gap-2 mt-2`}>
                                    {specialties.map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            onPress={() => toggleSpecialty(item)}
                                            style={tw`px-4 py-2 rounded-xl border ${Array.isArray(formData.specialty) && formData.specialty.includes(item) ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'}`}
                                        >
                                            <Text style={tw`font-bold text-sm ${Array.isArray(formData.specialty) && formData.specialty.includes(item) ? 'text-white' : 'text-slate-500'}`}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                                    <Text style={tw`text-slate-800 font-bold`}>{Array.isArray(formData.specialty) ? formData.specialty.join(', ') : (formData.specialty || "Chưa cập nhật")}</Text>
                                </View>
                            )}
                        </View>

                        <InfoRow
                            icon={MapPin}
                            label="Văn phòng luật sư"
                            value={formData.firmName}
                            field="firmName"
                            editable={true}
                            isEditing={isEditing}
                            formData={formData}
                            setFormData={setFormData}
                        />

                        {/* Thẻ hành nghề Preview */}
                        <View style={tw`mb-2`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <Camera size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>Ảnh thẻ hành nghề</Text>
                            </View>
                            <TouchableOpacity
                                onPress={pickCard}
                                style={tw`w-full h-40 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden items-center justify-center`}
                            >
                                {formData.lawyerCardImage ? (
                                    <Image 
                                        key={formData.lawyerCardImage}
                                        source={{ uri: formData.lawyerCardImage }} 
                                        style={tw`w-full h-full`} 
                                        resizeMode="contain" // Đổi sang contain để thấy toàn bộ thẻ
                                    />
                                ) : (
                                    <View style={tw`items-center`}>
                                        <Camera size={24} color="#94A3B8" />
                                        <Text style={tw`text-slate-400 text-xs mt-1`}>Chưa có ảnh</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Section: Thông tin ngân hàng */}
                    <SectionTitle title="Thông tin ngân hàng" icon={CreditCard} />
                    <View style={tw`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6`}>
                        <View style={tw`mb-5`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <Briefcase size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>Tên ngân hàng</Text>
                            </View>
                            {isEditing ? (
                                <AppTextInput
                                    style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold`}
                                    value={formData.bankInfo.bankName}
                                    onChangeText={(text) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, bankName: text } })}
                                    placeholder="Ví dụ: Vietcombank"
                                />
                            ) : (
                                <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                                    <Text style={tw`text-slate-800 font-bold`}>{formData.bankInfo.bankName || "Chưa cập nhật"}</Text>
                                </View>
                            )}
                        </View>

                        <View style={tw`mb-5`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <CreditCard size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>Số tài khoản</Text>
                            </View>
                            {isEditing ? (
                                <AppTextInput
                                    style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold`}
                                    value={formData.bankInfo.accountNumber}
                                    onChangeText={(text) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountNumber: text } })}
                                    keyboardType="numeric"
                                    placeholder="Nhập số tài khoản"
                                />
                            ) : (
                                <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                                    <Text style={tw`text-slate-800 font-bold`}>{formData.bankInfo.accountNumber || "Chưa cập nhật"}</Text>
                                </View>
                            )}
                        </View>

                        <View style={tw`mb-5`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <User size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-500 text-sm font-medium`}>Tên chủ tài khoản</Text>
                            </View>
                            {isEditing ? (
                                <AppTextInput
                                    style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold`}
                                    value={formData.bankInfo.accountName}
                                    onChangeText={(text) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountName: text.toUpperCase() } })}
                                    autoCapitalize="characters"
                                    placeholder="Ví dụ: NGUYEN VAN A"
                                />
                            ) : (
                                <View style={tw`bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm`}>
                                    <Text style={tw`text-slate-800 font-bold`}>{formData.bankInfo.accountName || "Chưa cập nhật"}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Actions */}
            {
                isEditing && (
                    <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex-row gap-4`}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsEditing(false);
                                // Reset formData to current user data
                                setFormData({
                                    fullname: user?.fullname || '',
                                    phone: user?.phone || '',
                                    specialty: Array.isArray(user?.specialty) ? user.specialty : (user?.specialty ? user.specialty.split(',').map(s => s.trim()) : []),
                                    firmName: user?.firmName || '',
                                    lawyerId: user?.lawyerId || '',
                                    bankInfo: {
                                        bankName: user?.bankInfo?.bankName || '',
                                        accountNumber: user?.bankInfo?.accountNumber || '',
                                        accountName: user?.bankInfo?.accountName || ''
                                    },
                                    avatar: user?.avatar || '',
                                    lawyerCardImage: user?.lawyerCardImage || ''
                                });
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
                )
            }
        </SafeAreaView >
    );
}
