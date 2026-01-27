import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, MapPin, FileText, CreditCard, File } from 'lucide-react-native';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { useAuth } from '../contextAPI/AuthProvider';
import { useFocusEffect } from '@react-navigation/native';

export default function LawyerAppointmentsScreen({ navigation }) {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            console.log("Retrieved AuthToken:", token ? "Exist" : "Not Found");
            if (!token) {
                setLoading(false);
                return;
            }
            console.log("Fetching from URL:", summaryAPI.getLawyerBookings.url);
            const response = await fetch(summaryAPI.getLawyerBookings.url, {
                method: summaryAPI.getLawyerBookings.method,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log("Fetch Lawyer Bookings Response Status:", response.status);
            const data = await response.json();
            console.log("Lawyer Bookings Data:", JSON.stringify(data, null, 2));
            if (data.success) {
                setBookings(data.data);
            } else {
                Alert.alert("Thông báo", data.message || "Không thể lấy danh sách lịch hẹn.");
            }
        } catch (error) {
            console.error("Fetch Lawyer Bookings Error:", error);
            Alert.alert("Lỗi", "Không thể tải danh sách lịch hẹn.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            console.log("LawyerAppointmentsScreen Focused - triggering fetchBookings");
            fetchBookings();
        }, [])
    );
    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const renderItem = ({ item }) => {
        // For lawyer screen, the "other party" is always the customer (item.userID)
        const customer = item.userID || {};

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('LawyerAppointmentDetail', { appointment: item })}
                style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100`}
            >
                <View style={tw`flex-row items-center mb-3 pb-3 border-b border-slate-50`}>
                    <View style={tw`w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 items-center justify-center overflow-hidden`}>
                        {customer.avatar ? (
                            <Image source={{ uri: customer.avatar }} style={tw`w-full h-full`} />
                        ) : (
                            <User size={30} color="#3B82F6" />
                        )}
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                        <Text style={tw`text-lg font-bold text-slate-800`}>{customer.fullname || "Khách hàng"}</Text>
                        <Text style={tw`text-slate-500 text-sm`}>Khách hàng tiềm năng</Text>
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
                    <View style={tw`flex-row items-center mb-1`}>
                        <Calendar size={14} color="#2563EB" />
                        <Text style={tw`ml-2 font-bold text-slate-700 text-sm`}>
                            {moment(item.date).format('DD/MM/YYYY')} | {item.timeSlot?.start} - {item.timeSlot?.end}
                        </Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600 text-xs flex-1`} numberOfLines={1}>
                            {item.addressMeeting || "N/A"}
                        </Text>
                    </View>
                    <View style={tw`flex-row items-center mt-1`}>
                        <Phone size={14} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-600 text-xs`}>{item.actualPhone || customer.phone || "N/A"}</Text>
                    </View>
                </View>

                {item.documents && item.documents.length > 0 && (
                    <View style={tw`mt-3 pt-3 border-t border-slate-50 flex-row items-center`}>
                        <FileText size={14} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-500 text-xs italic`}>Có {item.documents.length} tài liệu đính kèm</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Quản lý lịch hẹn</Text>
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
                            <Text style={tw`text-slate-400 mt-4 text-lg`}>Chưa có yêu cầu đặt lịch nào</Text>
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
