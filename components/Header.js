import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User } from "lucide-react-native";
import tw from "twrnc";
import { useAuth } from "../contextAPI/AuthProvider";

export default function Header() {
  const navigation = useNavigation();
  const { user, isAuthenticated, logout } = useAuth();
  // Tính toán chiều cao thanh trạng thái (StatusBar) để Header không bị che
  // Trên iOS Safe Area thường được xử lý ở màn hình lớn, nhưng ở đây ta đệm thêm
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight : 30;
  return (
    <View
      style={[
        tw`bg-white border-b border-gray-100 shadow-sm`,
        { paddingTop: statusBarHeight },
      ]}
    >
      <View style={tw`w-full h-16 flex-row items-center justify-between px-4`}>
        {/* LOGO */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.7}
        >
          <Text style={tw`text-xl font-extrabold text-blue-700`}>
            LuatSu<Text style={tw`text-yellow-500`}>Online</Text>
          </Text>
        </TouchableOpacity>

        {/* CỤM NÚT BẤM */}
        <View style={tw`flex-row items-center`}>
          {!isAuthenticated ? (
            <>
              {/* Nút Đăng ký */}
              <TouchableOpacity
                // hitSlop: Giúp vùng bấm rộng hơn 20px ra xung quanh, cực kỳ nhạy
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
                style={tw`mr-2 px-3 py-2`}
                onPress={() => navigation.navigate("SignUp")}
              >
                <Text style={tw`text-blue-600 font-semibold text-sm`}>
                  Đăng ký
                </Text>
              </TouchableOpacity>

              {/* Nút Đăng nhập */}
              <TouchableOpacity
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                style={tw`bg-blue-600 px-4 py-2 rounded-full`}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={tw`text-white font-bold text-sm`}>Đăng nhập</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Nút Đăng xuẩt */}
              <TouchableOpacity
                // hitSlop: Giúp vùng bấm rộng hơn 20px ra xung quanh, cực kỳ nhạy
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
                style={tw`ml-2py-2`}
                onPress={() => logout()}
              >
                <Text style={tw`text-blue-600 font-semibold text-sm`}>
                  Đăng xuất
                </Text>
              </TouchableOpacity>
              {/* Nút Profile / User */}
              <TouchableOpacity
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                style={tw`ml-2 px-3 py-1.5 flex-row items-center max-w-[150px]`} // Giới hạn chiều rộng nút
                onPress={() => navigation.navigate("UserProfile")}
              >
                <Text
                  numberOfLines={1} // Ép chỉ hiển thị trên 1 dòng
                  ellipsizeMode="tail" // Thêm dấu ... ở cuối nếu quá dài
                  style={tw`text-blue-600 font-semibold text-sm mr-1`}
                >
                  {user?.fullname}
                </Text>
                <User size={20} color="#1D4ED8" strokeWidth={2.5} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// Nếu bạn muốn Header luôn cố định ở trên cùng màn hình mà không bị Scroll đi:
const styles = StyleSheet.create({
  headerContainer: {
    zIndex: 1000, // Đảm bảo luôn nằm trên các thành phần khác
    elevation: 5, // Đổ bóng cho Android
  },
});
