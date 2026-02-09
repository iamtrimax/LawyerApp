import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    TextInput,
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
    Sparkles,
    Eye,
    EyeOff,
    MapPin,
    Calendar,
} from "lucide-react-native";
import summaryAPI from "../common";
import ModalError from "../components/ModalError";
import { createInputChangeHandler } from "../helper/handleInputChange";

// Custom Input Component for Premium Feel
const PremiumInput = ({ label, icon: Icon, value, onChangeText, placeholder, error, secureTextEntry, isPassword, setVisible, visible, ...props }) => (
    <View style={tw`mb-5`}>
        <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>{label}</Text>
        <View style={[
            tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`,
            error ? tw`border-red-400` : tw`border-blue-50`
        ]}>
            <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                <Icon size={20} color={error ? "#F87171" : "#3B82F6"} />
            </View>
            <View style={tw`flex-1`}>
                <TextInput
                    style={tw`flex-1 text-blue-900 text-base font-medium`}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={secureTextEntry}
                    {...props}
                />
            </View>
            {isPassword && (
                <TouchableOpacity onPress={() => setVisible(!visible)} style={tw`p-2`}>
                    {visible ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                </TouchableOpacity>
            )}
        </View>
        {error && (
            <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{error}</Text>
        )}
    </View>
);

// Note: Replacing 3rd party <input> with React Native <TextInput> for the actual file
// I will rewrite this to use properly defined React Native components.

export default function MemberSignUpScreen({ navigation }) {
    const [user, setUser] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleInputChange = createInputChangeHandler(setUser, setErrors);

    const validateForm = () => {
        let tempErrors = {};
        const emailRegex = /\S+@\S+\.\S+/;

        if (!user.fullName.trim()) tempErrors.fullName = "Vui lòng nhập họ và tên";
        if (!user.email.trim()) tempErrors.email = "Vui lòng nhập email";
        else if (!emailRegex.test(user.email)) tempErrors.email = "Email không hợp lệ";
        if (!user.phone.trim()) tempErrors.phone = "Vui lòng nhập số điện thoại";
        if (user.password.length < 8) tempErrors.password = "Mật khẩu tối thiểu 8 ký tự";

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
                    role: "member"
                }),
            });

            const data = await response.json();
            console.log("data", data);
            if (response.ok && data.success) {
                navigation.navigate("verify-email", { email: user.email, role: "member" });
            } else {
                setServerError(data.message || "Đăng ký không thành công");
                setShowErrorModal(true);
            }
        } catch (error) {
            setServerError("Lỗi kết nối server. Vui lòng thử lại sau.");
            setShowErrorModal(true);
            console.log("error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-[#F8FAFC]`}>
            <StatusBar barStyle="dark-content" />

            {/* Background Decorative Elements */}
            <View style={[tw`absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full`, { transform: [{ translateX: 100 }, { translateY: -100 }] }]} />
            <View style={[tw`absolute bottom-0 left-0 w-80 h-80 bg-blue-50/50 rounded-full`, { transform: [{ translateX: -100 }, { translateY: 100 }] }]} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`flex-grow px-7 pt-4 pb-12`}
                >
                    {/* Header Navigation */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`w-12 h-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-blue-50`}
                    >
                        <ArrowLeft size={24} color="#1E3A8A" />
                    </TouchableOpacity>

                    {/* Welcome Section */}
                    <View style={tw`mt-10 mb-10`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <View style={tw`bg-blue-600 p-1.5 rounded-lg mr-2`}>
                                <Sparkles size={16} color="white" fill="white" />
                            </View>
                            <Text style={tw`text-blue-600 font-bold text-sm tracking-widest uppercase`}>Thành viên mới</Text>
                        </View>
                        <Text style={tw`text-4xl font-black text-blue-950 leading-tight`}>
                            Bắt đầu hành trình <Text style={tw`text-blue-600`}>Pháp lý</Text> của bạn
                        </Text>
                        <Text style={tw`text-slate-500 mt-3 text-base leading-6 font-medium`}>
                            Đăng ký tài khoản để nhận hỗ trợ tư vấn từ các chuyên gia hàng đầu.
                        </Text>
                    </View>

                    {/* Input Form */}
                    <View style={tw`mt-2`}>
                        <View style={tw`mb-5`}>
                            <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Họ và tên</Text>
                            <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.fullName ? tw`border-red-400` : tw`border-blue-50`]}>
                                <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                    <User size={20} color={errors.fullName ? "#F87171" : "#3B82F6"} />
                                </View>
                                <TextInput
                                    style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                    placeholder="Nguyễn Văn A"
                                    placeholderTextColor="#94A3B8"
                                    value={user.fullName}
                                    onChangeText={(val) => handleInputChange("fullName", val)}
                                />
                            </View>
                            {errors.fullName && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.fullName}</Text>}
                        </View>

                        <View style={tw`mb-5`}>
                            <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Email</Text>
                            <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.email ? tw`border-red-400` : tw`border-blue-50`]}>
                                <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                    <Mail size={20} color={errors.email ? "#F87171" : "#3B82F6"} />
                                </View>
                                <TextInput
                                    style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                    placeholder="vidu@email.com"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={user.email}
                                    onChangeText={(val) => handleInputChange("email", val)}
                                />
                            </View>
                            {errors.email && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.email}</Text>}
                        </View>

                        <View style={tw`mb-5`}>
                            <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Số điện thoại</Text>
                            <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.phone ? tw`border-red-400` : tw`border-blue-50`]}>
                                <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                    <Phone size={20} color={errors.phone ? "#F87171" : "#3B82F6"} />
                                </View>
                                <TextInput
                                    style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                    placeholder="09xx xxx xxx"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                    value={user.phone}
                                    onChangeText={(val) => handleInputChange("phone", val)}
                                />
                            </View>
                            {errors.phone && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.phone}</Text>}
                        </View>

                        <View style={tw`mb-5`}>
                            <Text style={tw`text-blue-900/60 text-xs font-bold mb-2 ml-1 uppercase tracking-wider`}>Mật khẩu</Text>
                            <View style={[tw`flex-row items-center bg-white rounded-3xl px-5 h-16 shadow-lg shadow-blue-100/50 border`, errors.password ? tw`border-red-400` : tw`border-blue-50`]}>
                                <View style={tw`bg-blue-50 p-2 rounded-2xl mr-3`}>
                                    <Lock size={20} color={errors.password ? "#F87171" : "#3B82F6"} />
                                </View>
                                <TextInput
                                    style={tw`flex-1 text-blue-950 text-base font-semibold`}
                                    placeholder="Tối thiểu 8 ký tự"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!passwordVisible}
                                    value={user.password}
                                    onChangeText={(val) => handleInputChange("password", val)}
                                />
                                <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={tw`p-2`}>
                                    {passwordVisible ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={tw`text-red-500 text-[10px] font-bold mt-1 ml-4`}>{errors.password}</Text>}
                        </View>
                    </View>

                    {/* Agreement */}
                    <TouchableOpacity
                        onPress={() => setIsAgreed(!isAgreed)}
                        style={tw`flex-row items-center mt-4 px-2`}
                    >
                        <View style={[
                            tw`w-6 h-6 rounded-lg items-center justify-center border-2`,
                            isAgreed ? tw`bg-blue-600 border-blue-600` : tw`border-slate-200 bg-white`
                        ]}>
                            {isAgreed && <CheckCircle2 size={16} color="white" />}
                        </View>
                        <Text style={tw`text-sm text-slate-500 flex-1 ml-3 font-medium`}>
                            Tôi đồng ý với các{" "}
                            <Text style={tw`text-blue-600 font-bold underline`}>Điều khoản</Text> &{" "}
                            <Text style={tw`text-blue-600 font-bold underline`}>Chính sách bảo mật</Text>.
                        </Text>
                    </TouchableOpacity>

                    {/* Action Buttons */}
                    <TouchableOpacity
                        disabled={!isAgreed || loading}
                        onPress={handleRegister}
                        style={[
                            tw`h-16 rounded-3xl items-center justify-center mt-10 shadow-xl`,
                            isAgreed ? tw`bg-blue-600 shadow-blue-300` : tw`bg-slate-300 shadow-none`
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <View style={tw`flex-row items-center`}>
                                <Text style={tw`text-white text-lg font-black mr-2`}>Đăng ký ngay</Text>
                                <Sparkles size={20} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={tw`flex-row justify-center mt-10`}>
                        <Text style={tw`text-slate-400 font-medium`}>Bạn đã có tài khoản rồi? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                            <Text style={tw`text-blue-700 font-black`}>Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>
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
