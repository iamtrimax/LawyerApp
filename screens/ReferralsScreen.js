import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { ArrowLeft, Users, Gift, ChevronRight, UserCheck, Calendar } from "lucide-react-native";
import summaryAPI from "../common";
import storage from "../utils/storage";

const ReferralItem = ({ item }) => (
  <View style={tw`bg-white p-4 rounded-2xl mb-3 flex-row items-center justify-between border border-slate-50 shadow-sm`}>
    <View style={tw`flex-row items-center flex-1`}>
      <View style={tw`w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-4`}>
        <UserCheck size={24} color="#3B82F6" />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-slate-800 font-bold text-base`} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={tw`flex-row items-center mt-1`}>
          <Calendar size={12} color="#94A3B8" />
          <Text style={tw`text-slate-400 text-xs ml-1 font-medium`}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </View>
    <View style={tw`bg-green-50 px-3 py-1.5 rounded-full flex-row items-center`}>
      <Gift size={12} color="#10B981" />
      <Text style={tw`text-green-600 text-xs font-bold ml-1`}>+100</Text>
    </View>
  </View>
);

export default function ReferralsScreen({ navigation }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const token = await storage.getItem("@AuthToken");
      if (!token) {
        setError("Vui lòng đăng nhập để xem thông tin");
        setLoading(false);
        return;
      }

      const response = await fetch(summaryAPI.getReferrals.url, {
        method: summaryAPI.getReferrals.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setReferrals(data.data || []);
      } else {
        setError(data.message || "Không thể tải danh sách giới thiệu");
      }
    } catch (err) {
      console.error("Lỗi fetch referrals:", err);
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F8FAFC]`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={tw`px-6 py-4 flex-row items-center bg-white border-b border-slate-100`}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 items-center justify-center rounded-full bg-slate-50`}
        >
          <ArrowLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={tw`flex-1 text-center mr-10 text-xl font-black text-blue-900`}>
          Giới thiệu bạn bè
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={tw`pb-10`}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={tw`m-6 bg-blue-600 rounded-[40px] p-8 shadow-xl shadow-blue-200 overflow-hidden relative`}>
            {/* Background pattern circles */}
            <View style={[tw`absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full`]} />
            <View style={[tw`absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full`]} />
            
            <View style={tw`flex-row justify-between items-center`}>
                <View>
                    <Text style={tw`text-blue-100 text-sm font-bold uppercase tracking-widest mb-1`}>Tổng lượt giới thiệu</Text>
                    <View style={tw`flex-row items-end`}>
                        <Text style={tw`text-white text-5xl font-black`}>{referrals.length}</Text>
                        <Text style={tw`text-blue-100 text-lg font-bold ml-2 mb-1`}>Thành công</Text>
                    </View>
                </View>
                <View style={tw`bg-white/20 p-4 rounded-3xl`}>
                    <Users size={40} color="white" />
                </View>
            </View>
            
            <View style={tw`h-px bg-white/20 my-6`} />
            
            <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <View style={tw`bg-amber-400 p-2 rounded-lg mr-3 shadow-lg`}>
                        <Gift size={16} color="white" />
                    </View>
                    <Text style={tw`text-white font-bold`}>Kiếm 100 điểm / lượt</Text>
                </View>
                <ChevronRight size={20} color="white" opacity={0.5} />
            </View>
        </View>

        {/* List Section */}
        <View style={tw`px-6`}>
          <Text style={tw`text-slate-800 text-lg font-black mb-4 uppercase tracking-wider`}>Lịch sử giới thiệu</Text>
          
          {loading ? (
            <View style={tw`py-10 items-center`}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={tw`text-slate-400 mt-4 font-bold`}>Đang tải dữ liệu...</Text>
            </View>
          ) : error ? (
            <View style={tw`bg-red-50 p-6 rounded-3xl items-center`}>
              <Text style={tw`text-red-600 font-bold text-center`}>{error}</Text>
              <TouchableOpacity 
                onPress={fetchReferrals}
                style={tw`mt-4 bg-white px-6 py-2 rounded-full border border-red-100 shadow-sm`}
              >
                <Text style={tw`text-red-500 font-bold`}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : referrals.length === 0 ? (
            <View style={tw`bg-white p-10 rounded-[40px] items-center border border-slate-100 shadow-sm`}>
              <View style={tw`bg-slate-50 p-6 rounded-full mb-6`}>
                <Users size={48} color="#94A3B8" />
              </View>
              <Text style={tw`text-slate-800 text-xl font-black mb-2 text-center`}>Chưa có ai!</Text>
              <Text style={tw`text-slate-400 text-center font-medium leading-5`}>
                Hãy chia sẻ mã giới thiệu là số điện thoại của bạn để nhận ngay 100 điểm thưởng khi bạn bè đăng ký thành công.
              </Text>
            </View>
          ) : (
            referrals.map((item, index) => (
              <ReferralItem key={index} item={item} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
