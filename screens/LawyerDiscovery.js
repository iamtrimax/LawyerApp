import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert
} from 'react-native';
import tw from 'twrnc';
import { Search, Filter, Star, ChevronRight, ArrowLeft, MessageSquare } from 'lucide-react-native';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = ['Tất cả', 'Hôn nhân', 'Đất đai', 'Hình sự', 'Doanh nghiệp'];

export default function LawyerDiscovery({ navigation }) {
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState('Tất cả');
    const [searchText, setSearchText] = useState('');

    // Gọi API lấy danh sách luật sư
    const fetchLawyers = async () => {
        setLoading(true);
        try {
            // Thay đổi URL tùy theo cấu trúc API của bạn (ví dụ có query params)
            const url = `${summaryAPI.filterLawyers.url}?specialization=${selectedCat === 'Tất cả' ? '' : selectedCat}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setLawyers(data.data);
            }
        } catch (error) {
            console.error("Lỗi fetch luật sư:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLawyers();
    }, [selectedCat]); // Gọi lại khi đổi lĩnh vực

    const handleStartChat = async (lawyer) => {
        try {
            console.log("Starting chat with lawyer:", lawyer.userID?._id);
            const token = await AsyncStorage.getItem('@AuthToken');
            if (!token) {
                Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để bắt đầu trò chuyện.");
                return;
            }

            if (!summaryAPI.startConversation) {
                Alert.alert("Lỗi", "API bắt đầu trò chuyện chưa được cấu hình.");
                return;
            }

            const response = await fetch(summaryAPI.startConversation.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetID: lawyer.userID?._id
                })
            });

            const data = await response.json();
            console.log("Chat Start Response:", data);

            if (data.success) {
                navigation.navigate('ChatDetail', {
                    conversationID: data.data._id,
                    otherUser: lawyer.userID
                });
            } else {
                Alert.alert("Lỗi", data.message || "Không thể bắt đầu cuộc trò chuyện.");
            }
        } catch (error) {
            console.error("Start Chat Error:", error);
            Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
        }
    };

    const renderLawyerCard = ({ item }) => (
        <View style={tw`bg-white p-4 mb-4 rounded-3xl shadow-sm border border-slate-100 flex-row`}>
            {/* Main Clickable Area (to Booking) */}
            <TouchableOpacity
                onPress={() => navigation.navigate('BookingScreen', { lawyer: item })}
                style={tw`flex-row flex-1`}
            >
                {/* Ảnh đại diện */}
                <View style={tw`w-20 h-20 bg-slate-200 rounded-2xl overflow-hidden`}>
                    <Image
                        source={{ uri: item.avatar || 'https://via.placeholder.com/150' }}
                        style={tw`w-full h-full`}
                    />
                </View>

                {/* Thông tin chính */}
                <View style={tw`flex-1 ml-4 justify-between`}>
                    <View>
                        <Text style={tw`text-base font-bold text-slate-800`}>{item.userID?.fullname || 'Luật sư chuyên gia'}</Text>
                        <Text style={tw`text-xs text-blue-600 font-medium mt-1`}>{item.specialty}</Text>
                    </View>

                    <View style={tw`flex-row items-center mt-2`}>
                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                        <Text style={tw`text-xs font-bold text-slate-700 ml-1`}>4.9</Text>
                        <Text style={tw`text-xs text-slate-400 ml-1`}>(120+ đánh giá)</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Actions Area (Self-contained) */}
            <View style={tw`justify-center ml-2 border-l border-slate-50 pl-2`}>
                <TouchableOpacity
                    onPress={() => {
                        console.log("Chat button pressed for:", item.userID?.fullname);
                        handleStartChat(item);
                    }}
                    style={tw`bg-indigo-50 p-3 rounded-2xl mb-2`}
                >
                    <MessageSquare size={22} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('BookingScreen', { lawyer: item })}
                    style={tw`bg-slate-50 p-3 rounded-2xl`}
                >
                    <ChevronRight size={22} color="#CBD5E1" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 pt-12 pb-6 rounded-b-3xl shadow-sm`}>
                <View style={tw`flex-row`}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`w-10 h-10 items-center justify-center rounded-full bg-gray-50`}
                    >
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={tw`text-2xl font-bold text-slate-800 mb-4`}>Chọn Luật Sư</Text>
                </View>
                {/* Thanh tìm kiếm */}
                <View style={tw`flex-row items-center bg-slate-100 px-4 py-3 rounded-2xl`}>
                    <Search size={20} color="#94A3B8" />
                    <TextInput
                        placeholder="Tìm theo tên luật sư..."
                        style={tw`flex-1 ml-3 text-slate-700`}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
            </View>

            {/* Danh mục lọc (ngang) */}
            <View style={tw`py-4`}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={CATEGORIES}
                    contentContainerStyle={tw`px-4`}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedCat(item)}
                            style={tw`px-5 py-2.5 mr-2 rounded-full border ${selectedCat === item ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                        >
                            <Text style={tw`font-bold ${selectedCat === item ? 'text-white' : 'text-slate-500'}`}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Danh sách luật sư */}
            {loading ? (
                <ActivityIndicator size="large" color="#2563EB" style={tw`mt-10`} />
            ) : (
                <FlatList
                    data={lawyers.filter(l => l.userID?.fullname.toLowerCase().includes(searchText.toLowerCase()))}
                    renderItem={renderLawyerCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={tw`px-4 pb-10`}
                    ListEmptyComponent={
                        <View style={tw`items-center mt-20`}>
                            <Text style={tw`text-slate-400`}>Không tìm thấy luật sư nào phù hợp.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}