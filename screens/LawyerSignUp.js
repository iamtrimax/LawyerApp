import React, { useRef, useState } from "react";
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
  Lock,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import InputField from "../helper/InputField";
import { createInputChangeHandler } from "../helper/handleInputChange";
import summaryAPI from "../common";
import ModalError from "../components/ModalError";
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync } from "../helper/registerForPushNotificationsAsync";

export default function LawyerSignUp({ navigation }) {
  // --- States ---
  const [user, setUser] = useState({
    fullname: "",
    email: "",
    phone: "",
    lawyerId: "", // Số thẻ hành nghề
    firmName: "", // Văn phòng luật
    specialty: [], // Chuyên môn (mảng)
    password: "",
    lawyerCardImage: "",
    avatar: "",
    referralCode: ""
  });
  const [avatarLocal, setAvatarLocal] = useState(null); // URI ảnh avatar cục bộ
  const [cardImageLocal, setCardImageLocal] = useState(null); // URI ảnh thẻ hành nghề
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [serverError, setServerError] = useState("");

  const specialties = ["Hình sự", "Dân sự", "Đất đai", "Kinh tế", "Hôn nhân"];
  const handleInputChange = createInputChangeHandler(setUser, setErrors);
  const abortControllerRef = useRef(null);
  const validateForm = () => {
    let tempErrors = {};
    if (!user.fullname.trim()) tempErrors.fullname = "Vui lòng nhập họ tên";
    if (!user.email.includes("@")) tempErrors.email = "Email không hợp lệ";
    if (user.phone.length < 10) tempErrors.phone = "Số điện thoại không hợp lệ";
    if (!user.lawyerId.trim())
      tempErrors.lawyerId = "Vui lòng nhập số thẻ hành nghề";
    if (!user.specialty || user.specialty.length === 0)
      tempErrors.specialty = "Vui lòng chọn ít nhất một chuyên môn";
    if (user.password.length < 8)
      tempErrors.password = "Mật khẩu phải từ 8 ký tự trở lên";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const toggleSpecialty = (item) => {
    setUser(prev => {
      const current = Array.isArray(prev.specialty) ? prev.specialty : [];
      const isSelected = current.includes(item);
      const next = isSelected 
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, specialty: next };
    });
    if (errors.specialty) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.specialty;
        return newErrors;
      });
    }
  };
  const uploadToCloudinary = async (imageUri, signal) => {
    // 1. Tạo FormData để gửi file
    const cloudName = Constants.expoConfig?.extra?.cloudName || process.env.EXPO_PUBLIC_CLOUD_NAME;
    const data = new FormData();

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        data.append("file", blob, "lawyer_card.jpg");
      } catch (error) {
        console.error("Web Blob fetch error:", error);
        return null;
      }
    } else {
      data.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "lawyer_card.jpg",
      });
    }

    data.append("upload_preset", "lawyerPicture"); 
    data.append("cloud_name", cloudName); 

    try {
      // 2. Gọi API của Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: data,
          headers: {
            Accept: "application/json",
          },
          signal,
        }
      );

      const result = await response.json();

      // 3. Trả về URL ảnh chính thức
      return result.secure_url;
    } catch (error) {
      console.error("Lỗi upload ảnh lên Cloudinary:", error);
      return null;
    }
  };
  const handleRegister = async () => {
    if (!validateForm()) return;
    if (!cardImageLocal) {
      setErrors(prev => ({ ...prev, lawyerCardImage: "Vui lòng tải ảnh thẻ" }));
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    try {
      // 1. Upload song song cả 2 ảnh để tiết kiệm thời gian
      const uploadPromises = [
        uploadToCloudinary(cardImageLocal, controller.signal),
        avatarLocal ? uploadToCloudinary(avatarLocal, controller.signal) : Promise.resolve(null)
      ];

      const [cardUrl, avatarUrl] = await Promise.all(uploadPromises);

      if (!cardUrl) {
        throw new Error("Tải ảnh thẻ thất bại");
      }

      // 2. Lấy Push Token để nhận thông báo duyệt hồ sơ
      let pushToken = "";
      try {
        pushToken = await registerForPushNotificationsAsync();
      } catch (tokenErr) {
        console.log("Không lấy được Push Token:", tokenErr);
      }

      // 3. Gửi dữ liệu cuối cùng
      const finalData = {
        ...user,
        lawyerCardImage: cardUrl,
        avatar: avatarUrl || "", // Nếu không chọn avatar thì để rỗng
        pushToken: pushToken,
        referralCode: user.referralCode
      };

      const response = await fetch(summaryAPI.registerLawyer.url, {
        method: summaryAPI.registerLawyer.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const data = await response.json();
      if (data.success) {
        navigation.navigate("verify-email", { email: user.email, role: "lawyer" });
      } else {
        setServerError(data.message);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error(error);
      setServerError(`Lỗi xử lý: ${error.message}`);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  const pickCard = async () => {
    Alert.alert(
      "Tải lên thẻ hành nghề",
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
        setCardImageLocal(selectedUri);
      }
    } catch (error) {
      console.error("Lỗi khi chọn file:", error);
      Alert.alert("Lỗi", "Không thể mở trình chọn file.");
    }
  };

  const pickImage = async (type) => {
    try {
      console.log("Đang mở bộ chọn ảnh cho:", type);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        const { status: retryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (retryStatus !== "granted") {
          Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt điện thoại để tiếp tục.");
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
          setAvatarLocal(selectedUri);
        } else {
          setCardImageLocal(selectedUri);
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh. Vui lòng thử lại.");
    }
  };
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
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
            style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
          >
            <ArrowLeft size={24} color="#1D4ED8" />
          </TouchableOpacity>

          {/* Header Section */}
          <View style={tw`mt-6 mb-8`}>
            <Text style={tw`text-2xl font-black text-blue-900`}>
              Đăng ký Luật sư chuyên gia
            </Text>
            <Text style={tw`text-gray-500 mt-1 text-base`}>
              Cung cấp thông tin nghề nghiệp để xác thực tài khoản.
            </Text>
          </View>
          {/* Profile Avatar Selection */}
          <View style={tw`items-center mb-8`}>
            <TouchableOpacity
              onPress={() => pickImage('avatar')}
              style={tw`relative`}
            >
              <View style={tw`w-28 h-28 rounded-full bg-blue-50 border-2 border-blue-100 items-center justify-center overflow-hidden`}>
                {avatarLocal ? (
                  <Image source={{ uri: avatarLocal }} style={tw`w-full h-full`} />
                ) : (
                  <User size={40} color="#3B82F6" />
                )}
              </View>
              <View style={tw`absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-4 border-white`}>
                <Camera size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={tw`text-blue-900 font-bold mt-2`}>Ảnh đại diện</Text>
            <Text style={tw`text-gray-400 text-[10px]`}>Giúp khách hàng nhận diện bạn tốt hơn</Text>
          </View>
          {/* Part 1: Personal Info */}

          <Text
            style={tw`text-blue-700 font-bold mb-4 uppercase text-[10px] tracking-widest`}
          >
            Thông tin cá nhân
          </Text>
          <InputField
            label="Họ và tên"
            icon={User}
            user={user}
            field="fullname"
            placeholder="Luật sư Nguyễn Văn A"
            error={errors.fullname}
            handleInputChange={handleInputChange}
          />
          <InputField
            label="Email công việc"
            icon={Mail}
            user={user}
            field="email"
            placeholder="vpls@email.com"
            keyboardType="email-address"
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
            secureTextEntry={!passwordVisible} // Ẩn/hiện mật khẩu
            passwordVisible={passwordVisible} // Truyền xuống để hiển thị icon con mắt
            setPasswordVisible={setPasswordVisible}
            error={errors.password}
            handleInputChange={handleInputChange}
          />

          <View style={tw`h-px bg-gray-100 my-6`} />

          {/* Part 2: Professional Info */}
          <Text
            style={tw`text-blue-700 font-bold mb-4 uppercase text-[10px] tracking-widest`}
          >
            Hồ sơ năng lực
          </Text>

          <InputField
            label="Số thẻ hành nghề"
            icon={FileText}
            user={user}
            field="lawyerId"
            placeholder="Nhập mã số thẻ"
            error={errors.lawyerId}
            handleInputChange={handleInputChange}
          />

          {/* Specialty Selector */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>
              Chuyên môn chính
            </Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {specialties.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleSpecialty(item)}
                  style={tw`px-4 py-2 rounded-xl border ${user.specialty.includes(item)
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-200 bg-gray-50"
                    }`}
                >
                  <Text
                    style={tw`${user.specialty.includes(item) ? "text-white" : "text-gray-500"
                      } text-xs font-bold`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.specialty && (
              <Text style={tw`text-red-500 text-xs mt-1 ml-1`}>
                {errors.specialty}
              </Text>
            )}
          </View>

          <InputField
            label="Văn phòng luật"
            icon={MapPin}
            user={user}
            field="firmName"
            placeholder="Tên văn phòng hoặc công ty luật"
            handleInputChange={handleInputChange}
          />
          <InputField
            label="Mã giới thiệu (Nếu có)"
            icon={Phone}
            user={user}
            field="referralCode"
            placeholder="Số điện thoại người giới thiệu"
            keyboardType="phone-pad"
            handleInputChange={handleInputChange}
          />

          {/* Certification Upload UI */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>
              Ảnh thẻ hành nghề (Mặt trước)
            </Text>
            <TouchableOpacity
              onPress={pickCard} 
              style={[
                tw`border-2 border-dashed rounded-2xl h-44 items-center justify-center overflow-hidden`,
                cardImageLocal // Đổi từ image thành cardImageLocal
                  ? tw`border-blue-500 bg-white`
                  : tw`border-blue-100 bg-blue-50`,
              ]}
            >
              {cardImageLocal ? ( // Đổi từ image thành cardImageLocal
                <View style={tw`w-full h-full relative`}>
                  <Image
                    source={{ uri: cardImageLocal }} // Đổi từ image thành cardImageLocal
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                  <View style={tw`absolute bottom-2 right-2 bg-blue-600 p-2 rounded-full shadow-lg`}>
                    <Camera size={16} color="white" />
                  </View>
                </View>
              ) : (
                <>
                  <Camera size={32} color="#3B82F6" />
                  <Text style={tw`text-blue-400 mt-2 text-xs font-medium`}>
                    Tải ảnh hoặc Chụp hình
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {errors.lawyerCardImage && (
              <Text style={tw`text-red-500 text-xs mt-1 ml-1`}>
                {errors.lawyerCardImage}
              </Text>
            )}
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            style={tw`flex-row items-center mb-6`}
          >
            <CheckCircle2
              size={22}
              color={isAgreed ? "#1D4ED8" : "#E5E7EB"}
              fill={isAgreed ? "#EFF6FF" : "transparent"}
            />
            <Text style={tw`text-xs text-gray-500 ml-2 flex-1`}>
              Tôi xác nhận mọi thông tin nghề nghiệp trên là chính xác và tuân
              thủ quy tắc đạo đức hành nghề.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            disabled={!isAgreed || loading}
            onPress={handleRegister}
            style={tw`${isAgreed ? "bg-blue-800" : "bg-gray-300"
              } h-14 rounded-2xl items-center justify-center shadow-lg`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white text-lg font-bold`}>
                Gửi hồ sơ đăng ký
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <ModalError
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        serverError={serverError}
        typeError="Lỗi đăng ký"
      />
    </SafeAreaView>
  );
}
