import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    Alert,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import {
    User,
    Mail,
    Phone,
    FileText,
    MapPin,
    ArrowLeft,
    Camera,
    CheckCircle2,
    Sparkles,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import InputField from "../helper/InputField";
import { createInputChangeHandler } from "../helper/handleInputChange";
import summaryAPI from "../common";
import ModalError from "../components/ModalError";
import { useAuth } from "../contextAPI/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LawyerUpgradeScreen({ navigation }) {
    const { user: currentUser, updateUser } = useAuth();

    // Professional info state
    const [user, setUser] = useState({
        lawyerId: "", // Số thẻ hành nghề
        firmName: "", // Văn phòng luật
        specialty: "", // Chuyên môn
        lawyerCardImage: "",
        avatar: "",
        bankInfo: {
            bankName: "",
            accountNumber: "",
            accountName: "",
        }
    });

    const [cardImageLocal, setCardImageLocal] = useState(null);
    const [avatarLocal, setAvatarLocal] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [serverError, setServerError] = useState("");

    const specialties = ["Hình sự", "Dân sự", "Đất đai", "Kinh tế", "Hôn nhân"];

    const handleInputChange = createInputChangeHandler(setUser, setErrors);

    const validateForm = () => {
        let tempErrors = {};
        if (!user.lawyerId.trim()) tempErrors.lawyerId = "Vui lòng nhập số thẻ hành nghề";
        if (!user.specialty) tempErrors.specialty = "Vui lòng chọn chuyên môn";
        if (!user.firmName.trim()) tempErrors.firmName = "Vui lòng nhập nơi công tác";
        if (!cardImageLocal) tempErrors.lawyerCardImage = "Vui lòng tải ảnh thẻ";

        // Bank Info validation
        if (!user.bankInfo.bankName.trim()) tempErrors["bankInfo.bankName"] = "Vui lòng nhập tên ngân hàng";
        if (!user.bankInfo.accountNumber.trim()) tempErrors["bankInfo.accountNumber"] = "Vui lòng nhập số tài khoản";
        if (!user.bankInfo.accountName.trim()) tempErrors["bankInfo.accountName"] = "Vui lòng nhập tên chủ tài khoản";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const uploadToCloudinary = async (imageUri, fileName) => {
        if (!imageUri) return "";
        const cloudName = process.env.EXPO_PUBLIC_CLOUD_NAME;
        const data = new FormData();
        data.append("file", {
            uri: imageUri,
            type: "image/jpeg",
            name: fileName,
        });
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
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const result = await response.json();
            return result.secure_url;
        } catch (error) {
            console.error(`Lỗi upload ảnh ${fileName}:`, error);
            return null;
        }
    };

    const handleUpgrade = async () => {
        if (!validateForm()) return;
        if (!isAgreed) {
            Alert.alert("Thông báo", "Vui lòng đồng ý với điều khoản");
            return;
        }

        setLoading(true);
        try {
            // Upload images in parallel
            const uploadPromises = [
                uploadToCloudinary(cardImageLocal, "lawyer_card_upgrade.jpg"),
                avatarLocal ? uploadToCloudinary(avatarLocal, "lawyer_avatar_upgrade.jpg") : Promise.resolve("")
            ];

            const [cardUrl, avatarUrl] = await Promise.all(uploadPromises);

            if (!cardUrl) throw new Error("Tải ảnh thẻ thất bại");

            const token = await AsyncStorage.getItem("@AuthToken");
            const response = await fetch(summaryAPI.registerLawyer.url, {
                method: summaryAPI.registerLawyer.method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: currentUser.email,
                    password: currentUser.password,
                    fullname: currentUser.fullname,
                    phone: currentUser.phone,
                    lawyerId: user.lawyerId,
                    firmName: user.firmName,
                    specialty: user.specialty,
                    lawyerCardImage: cardUrl,
                    avatar: avatarUrl || currentUser.avatar || "",
                    bankInfo: user.bankInfo,
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Cập nhật role locally nếu backend trả về user mới
                if (data.user) {
                    updateUser(data.user);
                }
                Alert.alert("Thành công", "Hồ sơ của bạn đã được gửi xác thực. Chúng tôi sẽ phản hồi sớm nhất qua email.", [
                    { text: "OK", onPress: () => navigation.navigate("Home") }
                ]);
            } else {
                setServerError(data.message || "Yêu cầu nâng cấp thất bại");
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error(error);
            setServerError("Có lỗi xảy ra trong quá trình xử lý yêu cầu.");
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (type) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Quyền truy cập", "Chúng tôi cần quyền truy cập thư viện ảnh!");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'avatar' ? [1, 1] : [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            const selectedUri = result.assets[0].uri;
            if (type === 'avatar') {
                setAvatarLocal(selectedUri);
            } else {
                setCardImageLocal(selectedUri);
                if (errors.lawyerCardImage) {
                    setErrors(prev => ({ ...prev, lawyerCardImage: null }));
                }
            }
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-[#F8FAFC]`}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`px-6 pt-4 pb-12`}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`w-12 h-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-blue-50`}
                    >
                        <ArrowLeft size={24} color="#1E3A8A" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={tw`mt-8 mb-8`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <View style={tw`bg-blue-600 p-1.5 rounded-lg mr-2`}>
                                <Sparkles size={16} color="white" fill="white" />
                            </View>
                            <Text style={tw`text-blue-600 font-bold text-sm tracking-widest uppercase`}>Nâng cấp tài khoản</Text>
                        </View>
                        <Text style={tw`text-3xl font-black text-blue-950 leading-tight`}>
                            Trở thành <Text style={tw`text-blue-600`}>Luật sư</Text> cộng tác
                        </Text>
                        <Text style={tw`text-slate-500 mt-2 text-base font-medium`}>
                            Chia sẻ chuyên môn của bạn và tiếp cận hàng ngàn khách hàng tiềm năng.
                        </Text>
                    </View>

                    {/* User Preview & Avatar Selection */}
                    <View style={tw`bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 mb-8`}>
                        <Text style={tw`text-blue-900/60 text-[10px] font-bold mb-4 uppercase tracking-widest`}>Thông tin hiện tại</Text>
                        <View style={tw`flex-row items-center`}>
                            <TouchableOpacity
                                onPress={() => pickImage('avatar')}
                                style={tw`relative mr-4`}
                            >
                                <View style={tw`w-16 h-16 bg-white rounded-2xl items-center justify-center border border-blue-100 shadow-sm overflow-hidden`}>
                                    {avatarLocal || currentUser?.avatar ? (
                                        <Image source={{ uri: avatarLocal || currentUser?.avatar }} style={tw`w-full h-full`} />
                                    ) : (
                                        <User size={32} color="#3B82F6" />
                                    )}
                                </View>
                                <View style={tw`absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-lg border-2 border-white shadow-sm`}>
                                    <Camera size={12} color="white" />
                                </View>
                            </TouchableOpacity>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-blue-950 font-black text-lg`}>{currentUser?.fullname}</Text>
                                <Text style={tw`text-slate-500 font-medium`}>{currentUser?.email}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Form */}
                    <Text style={tw`text-blue-900/60 text-[10px] font-bold mb-4 uppercase tracking-widest`}>Hồ sơ năng lực</Text>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Số thẻ hành nghề</Text>
                        <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.lawyerId ? tw`border-red-400` : tw`border-blue-50`]}>
                            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                <FileText size={20} color={errors.lawyerId ? "#F87171" : "#3B82F6"} />
                            </View>
                            <TextInput
                                style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                placeholder="Mã số thẻ luật sư"
                                placeholderTextColor="#94A3B8"
                                value={user.lawyerId}
                                onChangeText={(val) => handleInputChange("lawyerId", val)}
                            />
                        </View>
                        {errors.lawyerId && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.lawyerId}</Text>}
                    </View>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Chuyên môn</Text>
                        <View style={tw`flex-row flex-wrap gap-2 mt-2`}>
                            {specialties.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => handleInputChange("specialty", item)}
                                    style={tw`px-4 py-2 rounded-xl border-2 ${user.specialty === item
                                        ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-200"
                                        : "border-blue-50 bg-white"
                                        }`}
                                >
                                    <Text
                                        style={tw`${user.specialty === item ? "text-white" : "text-blue-700"} font-bold text-sm`}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.specialty && <Text style={tw`text-red-500 text-[10px] font-bold mt-2 ml-4`}>{errors.specialty}</Text>}
                    </View>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Văn phòng luật sư</Text>
                        <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.firmName ? tw`border-red-400` : tw`border-blue-50`]}>
                            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                <MapPin size={20} color={errors.firmName ? "#F87171" : "#3B82F6"} />
                            </View>
                            <TextInput
                                style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                placeholder="Tên văn phòng đang công tác"
                                placeholderTextColor="#94A3B8"
                                value={user.firmName}
                                onChangeText={(val) => handleInputChange("firmName", val)}
                            />
                        </View>
                        {errors.firmName && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.firmName}</Text>}
                    </View>

                    {/* Part 3: Bank Info */}
                    <Text style={tw`text-blue-900/60 text-[10px] font-bold mb-4 uppercase tracking-widest mt-4`}>Thông tin ngân hàng</Text>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Tên ngân hàng</Text>
                        <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors["bankInfo.bankName"] ? tw`border-red-400` : tw`border-blue-50`]}>
                            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                <FileText size={20} color={errors["bankInfo.bankName"] ? "#F87171" : "#3B82F6"} />
                            </View>
                            <TextInput
                                style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                placeholder="Ví dụ: Vietcombank, BIDV..."
                                placeholderTextColor="#94A3B8"
                                value={user.bankInfo.bankName}
                                onChangeText={(val) => handleInputChange("bankInfo.bankName", val)}
                            />
                        </View>
                        {errors["bankInfo.bankName"] && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors["bankInfo.bankName"]}</Text>}
                    </View>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Số tài khoản</Text>
                        <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors["bankInfo.accountNumber"] ? tw`border-red-400` : tw`border-blue-50`]}>
                            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                <FileText size={20} color={errors["bankInfo.accountNumber"] ? "#F87171" : "#3B82F6"} />
                            </View>
                            <TextInput
                                style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                placeholder="Nhập số tài khoản ngân hàng"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={user.bankInfo.accountNumber}
                                onChangeText={(val) => handleInputChange("bankInfo.accountNumber", val)}
                            />
                        </View>
                        {errors["bankInfo.accountNumber"] && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors["bankInfo.accountNumber"]}</Text>}
                    </View>

                    <View style={tw`mb-5`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Tên chủ tài khoản</Text>
                        <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors["bankInfo.accountName"] ? tw`border-red-400` : tw`border-blue-50`]}>
                            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                <User size={20} color={errors["bankInfo.accountName"] ? "#F87171" : "#3B82F6"} />
                            </View>
                            <TextInput
                                style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                placeholder="Ví dụ: NGUYEN VAN A"
                                placeholderTextColor="#94A3B8"
                                autoCapitalize="characters"
                                value={user.bankInfo.accountName}
                                onChangeText={(val) => handleInputChange("bankInfo.accountName", val)}
                            />
                        </View>
                        {errors["bankInfo.accountName"] && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors["bankInfo.accountName"]}</Text>}
                    </View>

                    {/* Card Upload */}
                    <View style={tw`mb-10`}>
                        <Text style={tw`text-blue-900/60 text-xs font-bold mb-3 ml-1 uppercase tracking-wider`}>Ảnh thẻ hành nghề</Text>
                        <TouchableOpacity
                            onPress={() => pickImage('card')}
                            style={[
                                tw`border-2 border-dashed rounded-3xl h-48 items-center justify-center overflow-hidden`,
                                cardImageLocal ? tw`border-blue-500 bg-white shadow-xl shadow-blue-100` : tw`border-blue-200 bg-white`,
                            ]}
                        >
                            {cardImageLocal ? (
                                <View style={tw`w-full h-full`}>
                                    <Image
                                        source={{ uri: cardImageLocal }}
                                        style={tw`w-full h-full`}
                                        resizeMode="cover"
                                    />
                                    <View style={tw`absolute inset-0 bg-blue-950/20 items-center justify-center`}>
                                        <View style={tw`bg-blue-600 p-3 rounded-2xl`}>
                                            <Camera size={24} color="white" />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={tw`items-center`}>
                                    <View style={tw`bg-blue-50 p-4 rounded-3xl mb-3`}>
                                        <Camera size={32} color="#3B82F6" />
                                    </View>
                                    <Text style={tw`text-blue-600 font-bold`}>Tải ảnh lên</Text>
                                    <Text style={tw`text-slate-400 text-xs mt-1`}>Chụp mặt trước thẻ luật sư của bạn</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {errors.lawyerCardImage && <Text style={tw`text-red-500 text-[10px] font-bold mt-2 ml-4`}>{errors.lawyerCardImage}</Text>}
                    </View>

                    {/* Terms */}
                    <TouchableOpacity
                        onPress={() => setIsAgreed(!isAgreed)}
                        style={tw`flex-row items-center mb-8 px-2`}
                    >
                        <View style={[
                            tw`w-6 h-6 rounded-lg items-center justify-center border-2`,
                            isAgreed ? tw`bg-blue-600 border-blue-600` : tw`border-slate-200 bg-white`
                        ]}>
                            {isAgreed && <CheckCircle2 size={16} color="white" />}
                        </View>
                        <Text style={tw`text-xs text-slate-500 ml-3 flex-1 font-medium`}>
                            Tôi xác nhận mọi thông tin trên là chính xác. Tôi đồng ý tuân thủ quy tắc đạo đức nghề nghiệp luật sư.
                        </Text>
                    </TouchableOpacity>

                    {/* Submit */}
                    <TouchableOpacity
                        disabled={loading}
                        onPress={handleUpgrade}
                        style={[
                            tw`h-16 rounded-3xl items-center justify-center shadow-xl shadow-blue-300`,
                            isAgreed ? tw`bg-blue-600` : tw`bg-slate-300 shadow-none`
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <View style={tw`flex-row items-center`}>
                                <Text style={tw`text-white text-lg font-black mr-2`}>Gửi hồ sơ nâng cấp</Text>
                                <CheckCircle2 size={20} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <ModalError
                showErrorModal={showErrorModal}
                setShowErrorModal={setShowErrorModal}
                serverError={serverError}
                typeError="Lỗi xác thực"
            />
        </SafeAreaView>
    );
}
