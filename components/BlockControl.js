import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import tw from "twrnc";
import { ChevronRight, Lock } from "lucide-react-native"; // Thêm Lock icon để đẹp hơn

const { width } = Dimensions.get("window");
const gridWidth = (width - 48) / 2;

export default function BlockControl({
  title,
  subtitle,
  icon: IconComponent,
  color = "blue",
  mode = "list",
  onPress,
  disabled,
  isAuthenticated, // Lưu ý: khớp với tên biến bạn truyền từ HomeScreen
  badge
}) {

  const handleOnPress = () => {
    if (disabled && isAuthenticated) {
      // Nếu disable = true, hiện alert và DỪNG LẠI (không chạy onPress)
      alert("Tính năng chỉ dành cho Luật sư đã được phê duyệt");
      return
    } else if (disabled && !isAuthenticated) {
      alert("Vui lòng đăng nhập để sử dụng tính năng này");
      return
    } else if (disabled) {
      alert("Tính năng này hiện chưa được mở");
      return
    } else {
      // Nếu không disable, kiểm tra nếu có hàm onPress thì mới chạy
      if (onPress) {
        onPress();
      }
    }
  };

  // KIỂU 1: DẠNG LƯỚI (GRID)
  if (mode === "grid") {
    return (
      <TouchableOpacity
        onPress={handleOnPress}
        activeOpacity={0.7}
        // QUAN TRỌNG: Không dùng prop disabled của TouchableOpacity 
        // để hàm handleOnPress có thể bắt được sự kiện click
        style={[
          tw`bg-white p-4 mb-4 rounded-3xl shadow-sm border border-gray-100 items-center justify-center`,
          { width: gridWidth },
          disabled && tw`opacity-50` // Làm mờ giao diện nếu bị khóa
        ]}
      >
        <View style={tw`bg-${color}-50 p-4 rounded-2xl mb-3`}>
          {IconComponent && <IconComponent size={26} color={tw.color(`${color}-600`)} />}
          {disabled && (
            <View style={tw`absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm`}>
              <Lock size={12} color="#9CA3AF" />
            </View>
          )}
          {badge > 0 && !disabled && (
            <View style={tw`absolute -top-1.5 -right-1.5 bg-red-500 min-w-[18px] h-[18px] rounded-full border-2 border-white items-center justify-center px-0.5`}>
              <Text style={tw`text-white text-[9px] font-bold`}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={tw`text-sm font-bold text-gray-800 text-center`}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // KIỂU 2: DẠNG DANH SÁCH (LIST)
  return (
    <TouchableOpacity
      onPress={handleOnPress}
      activeOpacity={0.7}
      style={[
        tw`flex-row items-center bg-white p-4 mb-3 rounded-2xl border border-gray-100 shadow-sm`,
        disabled && tw`opacity-50`
      ]}
    >
      <View style={tw`bg-${color}-50 p-3 rounded-xl mr-4`}>
        {IconComponent && <IconComponent size={22} color={tw.color(`${color}-600`)} />}
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-base font-bold text-gray-800`}>{title}</Text>
        {subtitle && <Text style={tw`text-xs text-gray-500`}>{subtitle}</Text>}
      </View>
      {disabled ? (
        <Lock size={18} color="#9CA3AF" />
      ) : (
        <ChevronRight size={18} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );
}