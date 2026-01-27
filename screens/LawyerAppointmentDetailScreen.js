import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    Linking,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    CreditCard,
    Info,
    ExternalLink,
    X,
    File,
    CheckCircle
} from 'lucide-react-native';
import moment from 'moment';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LawyerAppointmentDetailScreen({ navigation, route }) {
    const { appointment } = route.params;
    const [currentAppointment, setCurrentAppointment] = useState(appointment);
    const customer = currentAppointment.userID || {};

    const [selectedDoc, setSelectedDoc] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const onRefresh = async () => {
        // Simple refresh logic
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Confirmed': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã xác nhận' };
            case 'Cancelled': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' };
            case 'Completed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn thành' };
            default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ xử lý' };
        }
    };

    const statusStyle = getStatusStyle(currentAppointment.status);

    const handleConfirmPayment = async () => {
        Alert.alert(
            "Xác nhận thanh toán",
            "Bạn có chắc chắn muốn xác nhận khách hàng này đã thanh toán thủ công?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async () => {
                        try {
                            setConfirming(true);
                            const token = await AsyncStorage.getItem("@AuthToken");
                            const response = await fetch(summaryAPI.confirmPayment.url.replace(':bookingId', currentAppointment._id), {
                                method: summaryAPI.confirmPayment.method,
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();
                            if (data.success) {
                                Alert.alert("Thành công", "Đã xác nhận thanh toán thành công.");
                                setCurrentAppointment({
                                    ...currentAppointment,
                                    paymentStatus: 'Paid',
                                    status: 'Confirmed' // Optional: auto confirm appointment if paid
                                });
                            } else {
                                Alert.alert("Lỗi", data.message || "Không thể xác nhận thanh toán.");
                            }
                        } catch (error) {
                            console.error("Confirm Payment Error:", error);
                            Alert.alert("Lỗi", "Đã xảy ra lỗi khi kết nối với máy chủ.");
                        } finally {
                            setConfirming(false);
                        }
                    }
                }
            ]
        );
    };

    const openLink = (url) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const handleDocPress = (doc) => {
        setSelectedDoc(doc);
        setModalVisible(true);
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Chi tiết yêu cầu</Text>
                </View>
                <View style={[tw`px-3 py-1 rounded-full`, tw`${statusStyle.bg}`]}>
                    <Text style={[tw`text-xs font-bold uppercase`, tw`${statusStyle.text}`]}>{statusStyle.label}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={tw`pb-10`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* 1. Customer Card */}
                <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                    <Text style={tw`text-slate-400 text-[10px] uppercase font-bold mb-3`}>Thông tin khách hàng</Text>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center overflow-hidden`}>
                            {customer.avatar ? (
                                <Image source={{ uri: customer.avatar }} style={tw`w-full h-full`} />
                            ) : (
                                <User size={30} color="#3B82F6" />
                            )}
                        </View>
                        <View style={tw`ml-4 flex-1`}>
                            <Text style={tw`text-xl font-bold text-slate-800`}>{customer.fullname || "Khách hàng"}</Text>
                            <Text style={tw`text-slate-500 text-sm`}>Hạng: Thành viên mới</Text>
                        </View>
                    </View>

                    <View style={tw`mt-5 space-y-4`}>
                        <View style={tw`flex-row items-center`}>
                            <View style={tw`bg-blue-50 p-2 rounded-xl`}>
                                <Phone size={18} color="#2563EB" />
                            </View>
                            <View style={tw`ml-3`}>
                                <Text style={tw`text-slate-400 text-[10px] uppercase font-bold`}>Số điện thoại</Text>
                                <Text style={tw`text-slate-700 font-medium`}>{currentAppointment.actualPhone || customer.phone || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={tw`flex-row items-center mt-3`}>
                            <View style={tw`bg-blue-50 p-2 rounded-xl`}>
                                <Mail size={18} color="#2563EB" />
                            </View>
                            <View style={tw`ml-3`}>
                                <Text style={tw`text-slate-400 text-[10px] uppercase font-bold`}>Email</Text>
                                <Text style={tw`text-slate-700 font-medium`}>{customer.email || "N/A"}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment Status row */}
                    <View style={tw`mt-4 pt-4 border-t border-slate-50 flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center`}>
                            <CreditCard size={18} color="#64748B" />
                            <Text style={tw`ml-2 text-slate-600 font-medium`}>Trạng thái thanh toán:</Text>
                        </View>
                        <View style={[
                            tw`px-3 py-1 rounded-full`,
                            currentAppointment.paymentStatus === 'Paid' ? tw`bg-green-100` : tw`bg-yellow-100`
                        ]}>
                            <Text style={[
                                tw`text-xs font-bold uppercase`,
                                currentAppointment.paymentStatus === 'Paid' ? tw`text-green-700` : tw`text-yellow-700`
                            ]}>
                                {currentAppointment.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 2. Schedule Info */}
                <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-4`}>Thông tin lịch hẹn</Text>

                    <View style={tw`flex-row items-center mb-4 bg-slate-50 p-3 rounded-2xl`}>
                        <Calendar size={20} color="#64748B" />
                        <View style={tw`ml-3`}>
                            <Text style={tw`text-slate-400 text-[10px] uppercase font-bold`}>Ngày hẹn</Text>
                            <Text style={tw`text-slate-800 font-bold`}>{moment(currentAppointment.date).format('dddd, DD/MM/YYYY')}</Text>
                        </View>
                    </View>

                    <View style={tw`flex-row items-center mb-4 bg-slate-50 p-3 rounded-2xl`}>
                        <Clock size={20} color="#64748B" />
                        <View style={tw`ml-3`}>
                            <Text style={tw`text-slate-400 text-[10px] uppercase font-bold`}>Thời gian</Text>
                            <Text style={tw`text-slate-800 font-bold`}>{currentAppointment.timeSlot?.start} - {currentAppointment.timeSlot?.end}</Text>
                        </View>
                    </View>

                    <View style={tw`flex-row items-center bg-slate-50 p-3 rounded-2xl`}>
                        <MapPin size={20} color="#64748B" />
                        <View style={tw`ml-3 flex-1`}>
                            <Text style={tw`text-slate-400 text-[10px] uppercase font-bold`}>Địa điểm tư vấn</Text>
                            <Text style={tw`text-slate-800 font-bold`}>{currentAppointment.addressMeeting}</Text>
                        </View>
                    </View>
                </View>

                {/* 3. Notes & Documents */}
                {(currentAppointment.note || (currentAppointment.documents && currentAppointment.documents.length > 0)) && (
                    <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                        <Text style={tw`font-bold text-slate-800 text-lg mb-4`}>Hồ sơ & Ghi chú</Text>

                        {currentAppointment.note && (
                            <View style={tw`mb-5 bg-blue-50 p-4 rounded-2xl border border-blue-100`}>
                                <View style={tw`flex-row items-center mb-1`}>
                                    <Info size={16} color="#2563EB" />
                                    <Text style={tw`ml-2 font-bold text-blue-800 text-xs uppercase`}>Ghi chú từ khách hàng:</Text>
                                </View>
                                <Text style={tw`text-slate-700 italic`}>{currentAppointment.note}</Text>
                            </View>
                        )}

                        {currentAppointment.documents && currentAppointment.documents.length > 0 && (
                            <View>
                                <View style={tw`flex-row items-center mb-3`}>
                                    <FileText size={18} color="#64748B" />
                                    <Text style={tw`ml-2 text-slate-700 font-semibold`}>Tài liệu đính kèm ({currentAppointment.documents.length})</Text>
                                </View>
                                <View style={tw`flex-row flex-wrap`}>
                                    {currentAppointment.documents.map((doc, idx) => {
                                        const isImage = typeof doc === 'string' && (doc.includes('.jpg') || doc.includes('.jpeg') || doc.includes('.png') || doc.includes('.webp'));
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => handleDocPress(doc)}
                                                style={tw`mr-3 mb-3`}
                                            >
                                                {isImage ? (
                                                    <Image
                                                        source={{ uri: doc }}
                                                        style={tw`w-20 h-20 rounded-xl bg-slate-100 border border-slate-200`}
                                                    />
                                                ) : (
                                                    <View style={tw`w-20 h-20 rounded-xl bg-blue-50 items-center justify-center border border-blue-100`}>
                                                        <File size={24} color="#2563EB" />
                                                        <Text style={tw`text-[8px] text-blue-600 mt-1 font-bold`}>VĂN BẢN</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* 4. Action Buttons */}
                {currentAppointment.paymentStatus !== 'Paid' && (
                    <View style={tw`mt-8 mx-4`}>
                        <TouchableOpacity
                            onPress={handleConfirmPayment}
                            disabled={confirming}
                            style={tw`bg-blue-600 flex-row items-center justify-center p-4 rounded-2xl shadow-lg ${confirming ? 'opacity-70' : ''}`}
                        >
                            {confirming ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <CheckCircle size={20} color="white" />
                                    <Text style={tw`text-white font-bold ml-2 text-lg`}>Xác nhận đã thanh toán</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={tw`text-slate-400 text-[10px] text-center mt-3 uppercase font-bold tracking-wider`}>
                            Chỉ xác nhận khi bạn chắc chắn đã nhận được tiền
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Document Preview Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black/95`}>
                    <SafeAreaView style={tw`flex-1`}>
                        <View style={tw`flex-row justify-between items-center px-4 py-2`}>
                            <Text style={tw`text-white font-bold`}>Hồ sơ tài liệu</Text>
                            <TouchableOpacity
                                style={tw`bg-white/10 p-2 rounded-full`}
                                onPress={() => setModalVisible(false)}
                            >
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View style={tw`flex-1 justify-center items-center p-4`}>
                            {selectedDoc && (
                                typeof selectedDoc === 'string' && (selectedDoc.includes('.jpg') || selectedDoc.includes('.jpeg') || selectedDoc.includes('.png') || selectedDoc.includes('.webp')) ? (
                                    <Image
                                        source={{ uri: selectedDoc }}
                                        style={{ width: '100%', height: '80%', borderRadius: 12 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={tw`flex-1 w-full bg-white rounded-3xl overflow-hidden`}>
                                        <WebView
                                            source={{
                                                uri: (Platform.OS === 'android' && typeof selectedDoc === 'string' && selectedDoc.toLowerCase().includes('.pdf'))
                                                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(selectedDoc)}`
                                                    : selectedDoc
                                            }}
                                            style={tw`flex-1`}
                                            startInLoadingState={true}
                                            renderLoading={() => (
                                                <ActivityIndicator size="large" color="#2563EB" style={tw`absolute inset-0`} />
                                            )}
                                        />
                                    </View>
                                )
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
