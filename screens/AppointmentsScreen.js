import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, MapPin, FileText, CreditCard, File } from 'lucide-react-native';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export default function AppointmentsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            const response = await fetch(summaryAPI.getBookings.url, {
                method: summaryAPI.getBookings.method,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setBookings(data.data);
            }
        } catch (error) {
            console.error("Fetch Bookings Error:", error);
            Alert.alert("Lỗi", "Không thể tải danh sách cuộc hẹn. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const renderItem = ({ item }) => {
        const lawyer = item.lawyerID || {};
        const lawyerInfo = lawyer.userID || {};

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
                style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100`}
            >
                <View style={tw`flex-row items-center mb-3 pb-3 border-b border-slate-50`}>
                    {/* Ảnh đại diện */}
                    <View style={tw`w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-100 items-center justify-center overflow-hidden`}>
                        {lawyer.avatar ? (
                            <Image source={{ uri: lawyer.avatar }} style={tw`w-full h-full`} />
                        ) : (
                            <User size={40} color="#3B82F6" />
                        )}
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                        <Text style={tw`text-lg font-bold text-slate-800`}>{lawyerInfo.fullname || "Luật sư"}</Text>
                        <Text style={tw`text-slate-500 text-sm`}>{lawyer.specialty || "Chuyên gia pháp lý"}</Text>
                    </View>
                    <View style={tw`items-end`}>
                        <View style={[
                            tw`px-2 py-1 rounded-full mb-1`,
                            item.status === 'Confirmed' ? tw`bg-green-100` :
                                item.status === 'Cancelled' ? tw`bg-red-100` :
                                    item.status === 'Completed' ? tw`bg-blue-100` : tw`bg-yellow-100`
                        ]}>
                            <Text style={[
                                tw`text-[10px] font-bold uppercase`,
                                item.status === 'Confirmed' ? tw`text-green-700` :
                                    item.status === 'Cancelled' ? tw`text-red-700` :
                                        item.status === 'Completed' ? tw`text-blue-700` : tw`text-yellow-700`
                            ]}>{item.status || "Chờ xử lý"}</Text>
                        </View>
                        <View style={[
                            tw`px-2 py-1 rounded-full`,
                            item.paymentStatus === 'Paid' ? tw`bg-green-100` :
                                item.paymentStatus === 'Failed' ? tw`bg-red-100` : tw`bg-slate-100`
                        ]}>
                            <Text style={[
                                tw`text-[10px] font-bold uppercase`,
                                item.paymentStatus === 'Paid' ? tw`text-green-700` :
                                    item.paymentStatus === 'Failed' ? tw`text-red-700` : tw`text-slate-600`
                            ]}>{item.paymentStatus || "Chưa trả"}</Text>
                        </View>
                    </View>
                </View>

                <View style={tw`space-y-2`}>
                    <View style={tw`flex-row items-center`}>
                        <Mail size={16} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600`}>{lawyerInfo.email || "N/A"}</Text>
                    </View>
                    <View style={tw`flex-row items-center mt-1`}>
                        <Phone size={16} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600`}>{item.actualPhone || lawyerInfo.phone || "N/A"}</Text>
                    </View>
                    <View style={tw`flex-row items-center mt-1`}>
                        <MapPin size={16} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600 text-xs flex-1`} numberOfLines={1}>
                            {item.addressMeeting || "N/A"}
                        </Text>
                    </View>

                    <View style={tw`mt-3 pt-3 border-t border-slate-50`}>
                        <View style={tw`flex-row items-center mb-1`}>
                            <Calendar size={16} color="#2563EB" />
                            <Text style={tw`ml-2 font-semibold text-slate-800`}>Thời gian hẹn:</Text>
                        </View>
                        <View style={tw`flex-row items-center ml-6`}>
                            <Clock size={14} color="#64748B" />
                            <Text style={tw`ml-1 text-slate-600`}>
                                {item.timeSlot?.start} - {item.timeSlot?.end} - {item.date ? moment(item.date).format('DD/MM/YYYY') : 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View style={tw`mt-2`}>
                        <View style={tw`flex-row items-center mb-1`}>
                            <Clock size={16} color="#64748B" />
                            <Text style={tw`ml-2 text-slate-500 text-xs`}>Ngày đặt:</Text>
                            <Text style={tw`ml-1 text-slate-500 text-xs italic`}>
                                {item.createdAt ? moment(item.createdAt).format('HH:mm DD/MM/YYYY') : 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {item.documents && item.documents.length > 0 && (
                        <View style={tw`mt-3 pt-3 border-t border-slate-50`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <FileText size={16} color="#64748B" />
                                <Text style={tw`ml-2 text-slate-700 text-sm font-semibold`}>Tài liệu đính kèm:</Text>
                            </View>
                            <View style={tw`flex-row flex-wrap`}>
                                {item.documents.map((doc, idx) => {
                                    const isImage = typeof doc === 'string' && (doc.includes('.jpg') || doc.includes('.jpeg') || doc.includes('.png') || doc.includes('.webp'));
                                    return (
                                        <View key={idx} style={tw`mr-2 mb-2`}>
                                            {isImage ? (
                                                <Image
                                                    source={{ uri: doc }}
                                                    style={tw`w-12 h-12 rounded-lg bg-slate-100 border border-slate-100`}
                                                />
                                            ) : (
                                                <View style={tw`w-12 h-12 rounded-lg bg-blue-50 items-center justify-center border border-blue-100`}>
                                                    <File size={20} color="#2563EB" />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    <View style={tw`mt-2 flex-row items-center justify-between pt-2`}>
                        <View style={tw`flex-row items-center`}>
                            <CreditCard size={14} color="#64748B" />
                            <Text style={tw`ml-2 text-slate-700 font-bold`}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0)}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Cuộc hẹn của tôi</Text>
                </View>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={tw`p-4`}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center mt-20`}>
                            <Calendar size={64} color="#CBD5E1" />
                            <Text style={tw`text-slate-400 mt-4 text-lg`}>Bạn chưa có cuộc hẹn nào</Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate("LawyerDiscovery")}
                                style={tw`mt-4 bg-blue-600 px-6 py-2 rounded-full`}
                            >
                                <Text style={tw`text-white font-bold`}>Tìm luật sư ngay</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#2563EB" />
                    }
                />
            )}
        </SafeAreaView>
    );
}
