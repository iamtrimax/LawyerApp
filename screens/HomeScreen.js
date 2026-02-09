import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import tw from "twrnc";
import {
  Calendar,
  Users,
  Gavel,
  Award,
  Briefcase,
  Search,
  Clock,
  FileTextIcon,
  Globe,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";

// Import các component đã tạo ở trên
import Header from "../components/Header";
import BlockControl from "../components/BlockControl";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contextAPI/AuthProvider";
import { registerForPushNotificationsAsync } from "../helper/registerForPushNotificationsAsync";
import summaryAPI, { socket_url } from "../common";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

const SOCKET_URL = socket_url;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { isAuthenticated, user, fetchUserDetail } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useRef(null);
  const updateToken = async () => {
    const token = await registerForPushNotificationsAsync();
    console.log("Token:", token);
    await fetch(summaryAPI.updateToken.url, {
      method: summaryAPI.updateToken.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user._id,
        token: token,
      }),
    });
  }
  // HomeScreen.js
  useEffect(() => {
    const initHome = async () => {
      if (isAuthenticated) {
        await fetchUserDetail(); // Đợi lấy dữ liệu mới nhất về isApproved trước
      }
    };
    initHome();
  }, [isAuthenticated]); // Chạy khi trạng thái login được xác nhận

  useEffect(() => {
    // Chỉ update token khi đã có đủ thông tin user và user._id
    if (isAuthenticated && user?._id) {
      updateToken();
    }
  }, [isAuthenticated, user?._id]);

  const checkUnreadMessages = async () => {
    if (!isAuthenticated) return;
    try {
      const token = await AsyncStorage.getItem("@AuthToken");
      const response = await fetch(summaryAPI.getConversations.url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        let totalUnread = 0;
        data.data.forEach(conv => {
          if (conv.lastMessage && !conv.lastMessage.isRead && conv.lastMessage.senderID !== user._id) {
            totalUnread += 1;
          }
        });
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error("Check Unread Error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkUnreadMessages();
    }, [isAuthenticated])
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    socket.current = io(SOCKET_URL);

    socket.current.on('connect', () => {
      console.log('Home Socket connected');
    });

    socket.current.on('receive_message', (newMessage) => {
      console.log("Home: New Message Received:", newMessage);
      if (newMessage.senderID !== user._id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [isAuthenticated]);
  return (
    <SafeAreaProvider>
      <View style={tw`flex-1 bg-blue-200`}>
        <StatusBar barStyle="dark-content" />

        {/* 1. Header luôn cố định ở trên */}
        <Header />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`mt-5 pb-10`}
        >
          {/* KHỐI KHÁCH HÀNG & THÀNH VIÊN */}
          {(!isAuthenticated || user?.role === "customer" || user?.role === "member") && (
            <>
              {/* 2. Phần chào hỏi người dùng */}
              <View style={tw`px-4 pt-6 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-2xl font-black text-blue-950`}>
                    {user?.role === "member" ? "Chào Thành viên!" : "Xin chào!"}
                  </Text>
                  <Text style={tw`text-slate-500 font-medium mt-1`}>
                    {user?.role === "member"
                      ? "Bạn có các dịch vụ đặc quyền hôm nay."
                      : "Hôm nay chúng tôi có thể giúp gì cho bạn?"}
                  </Text>
                </View>
                {user?.role === "member" && (
                  <View style={tw`bg-blue-600/10 px-3 py-1.5 rounded-2xl border border-blue-200 flex-row items-center`}>
                    <ShieldCheck size={16} color="#2563EB" />
                    <Text style={tw`ml-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider`}>Thành viên</Text>
                  </View>
                )}
              </View>

              {/* Banner Nâng cấp (Chỉ dành cho Member) */}
              {user?.role === "member" && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("LawyerUpgrade")}
                  style={tw`mx-4 mt-6 bg-blue-600 rounded-3xl p-5 shadow-xl shadow-blue-300 relative overflow-hidden`}
                >
                  <View style={tw`absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full`} />
                  <View style={tw`absolute -left-2 -bottom-2 bg-white/10 w-16 h-16 rounded-full`} />

                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-1`}>
                      <View style={tw`flex-row items-center mb-1`}>
                        <Sparkles size={16} color="white" fill="white" />
                        <Text style={tw`ml-2 text-white/80 font-bold text-[10px] uppercase tracking-widest`}>Cơ hội nghề nghiệp</Text>
                      </View>
                      <Text style={tw`text-white font-black text-xl leading-tight`}>Nâng cấp trở thành Luật sư cộng tác</Text>
                    </View>
                    <View style={tw`bg-white/20 p-2 rounded-xl`}>
                      <ChevronRight size={24} color="white" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* 3. KHỐI GRID DỊCH VỤ */}
              <View style={tw`px-4 mt-8`}>
                <View style={tw`flex-row items-center justify-between mb-5 px-1`}>
                  <Text style={tw`text-lg font-black text-blue-950`}>
                    {user?.role === "member" ? "Dịch vụ đặc quyền" : "Dịch vụ của bạn"}
                  </Text>
                </View>

                <View style={tw`flex-row flex-wrap justify-between`}>
                  <BlockControl
                    mode="grid"
                    title="Lịch của tôi"
                    icon={Calendar}
                    color="blue"
                    disabled={!isAuthenticated}

                    onPress={() => navigation.navigate("Appointments")}
                  />
                  <BlockControl
                    mode="grid"
                    title="Đặt luật sư"
                    icon={Users}
                    color="emerald"
                    disabled={!isAuthenticated}
                    onPress={() => navigation.navigate("LawyerDiscovery")}
                  />
                  {/* Thêm một block trống hoặc tìm kiếm nhanh */}
                  <BlockControl
                    mode="grid"
                    title="Tìm kiếm luật sư"
                    icon={Search}
                    color="purple"
                    onPress={() => navigation.navigate("LawyerDiscovery")}

                  />
                  <BlockControl
                    title="Thư viện pháp luật"
                    subtitle="Tra cứu văn bản, đơn từ mẫu"
                    icon={Gavel}
                    mode="grid"
                    color="slate"
                    onPress={() => navigation.navigate("LegalLibrary")}
                  />
                  <BlockControl
                    mode="grid"
                    title="Bài viết pháp luật"
                    icon={FileTextIcon}
                    color="indigo"
                    onPress={() => navigation.navigate("LegalArticles")}
                  />
                  <BlockControl
                    mode="grid"
                    title="Legal Resources"
                    icon={Globe}
                    color="sky"
                    onPress={() => navigation.navigate("LegalResources")}
                  />
                  <BlockControl
                    mode="grid"
                    title="Tư vấn Chat"
                    icon={MessageSquare}
                    color="rose"
                    onPress={() => navigation.navigate("ChatList")}
                    badge={unreadCount}
                  />
                </View>
              </View>
            </>
          )}
          {/* KHU VỰC TÍNH NĂNG LUẬT SƯ */}
          {isAuthenticated && user?.role === "lawyer" && (
            <View style={tw`px-4`}>
              {/* Banner thông báo chờ duyệt (Nếu có) */}
              {!user.isApproved && (
                <View
                  style={tw`mb-4 p-4 bg-orange-100 border border-orange-200 rounded-2xl flex-row items-center`}
                >
                  <Clock size={20} color="#F97316" />
                  <Text style={tw`ml-2 text-orange-800 text-xs flex-1`}>
                    Hồ sơ đang chờ duyệt. Các tính năng dưới đây sẽ khả dụng sau
                    khi bạn được xác thực thẻ hành nghề.
                  </Text>
                </View>
              )}

              {/* Nhóm 1: Quản lý công việc */}
              <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
                Quản lý công việc
              </Text>
              <View style={tw`opacity-${user.isApproved ? "100" : "50"}`}>
                <View style={tw`flex-row flex-wrap justify-between`}>
                  <BlockControl
                    mode="grid"
                    title="Lịch hẹn"
                    icon={Calendar}
                    color="blue"
                    disabled={!user.isApproved}
                    onPress={() => navigation.navigate("LawyerAppointments")}
                  />
                  <BlockControl
                    mode="grid"
                    title="Tư vấn Chat"
                    icon={MessageSquare}
                    color="rose"
                    disabled={!user.isApproved}
                    onPress={() => navigation.navigate("ChatList")}
                    badge={unreadCount}
                  />
                  <BlockControl
                    title="Cài đặt lịch rảnh"
                    subtitle="Thiết lập khung giờ tiếp khách"
                    icon={Calendar}
                    mode="grid"
                    color="rose"
                    disabled={!user.isApproved}
                    onPress={() => navigation.navigate("ManageAvailability")}
                  />
                </View>
              </View>

              {/* Nhóm 2: Tài chính & Thương hiệu */}
              <Text style={tw`text-lg font-bold text-gray-800 mt-4 mb-3`}>
                Thương hiệu
              </Text>
              <View style={tw`opacity-${user.isApproved ? "100" : "50"}`}>
                <BlockControl
                  title="Hồ sơ chuyên gia"
                  subtitle="Cập nhật Profile & Đánh giá"
                  icon={Award}
                  color="amber"
                  disabled={!user.isApproved}
                  onPress={() => navigation.navigate("LawyerProfile")}
                />
              </View>

              {/* Nhóm 3: Công cụ hỗ trợ */}
              <Text style={tw`text-lg font-bold text-gray-800 mt-4 mb-3`}>
                Công cụ hỗ trợ
              </Text>
              <View
                style={tw`opacity-${user.isApproved ? "100" : "50"
                  } flex-row flex-wrap justify-between`}
              >
                <BlockControl
                  title="Thư viện pháp luật"
                  subtitle="Tra cứu văn bản, đơn từ mẫu"
                  icon={Gavel}
                  mode="grid"
                  color="slate"
                  disabled={!user.isApproved}
                  onPress={() => navigation.navigate("LegalLibrary")}
                />
                <BlockControl
                  mode="grid"
                  title="Bài viết pháp luật"
                  icon={FileTextIcon}
                  color="indigo"
                  disabled={!user.isApproved}
                  onPress={() => navigation.navigate("LegalArticles")}
                />
                <BlockControl
                  mode="grid"
                  title="Legal Resources"
                  icon={Globe}
                  color="sky"
                  disabled={!user.isApproved}
                  onPress={() => navigation.navigate("LegalResources")}
                />
              </View>
            </View>
          )}
          {/* 4. KHỐI LUẬT SƯ (Dạng LIST) */}
          {!isAuthenticated && (
            <View style={tw`px-4 mt-6`}>
              <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>
                Dành cho đối tác Luật sư
              </Text>

              <BlockControl
                title="Bạn là Luật sư?"
                subtitle="Tham gia cộng đồng luật sư uy tín"
                icon={Award}
                color="indigo"
                onPress={() => navigation.navigate("lawyer-signup")}
              />

              <BlockControl
                title="Cổng Đăng nhập Luật sư"
                subtitle="Quản lý lịch hẹn và hồ sơ khách hàng"
                icon={Briefcase}
                color="slate"
                onPress={() => navigation.navigate("LawyerLogin")}
              />

            </View>
          )}

          {/* 5. Banner thông báo nhỏ */}
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}
