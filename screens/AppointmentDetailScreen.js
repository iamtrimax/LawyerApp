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
    TextInput,
    KeyboardAvoidingView,
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
    Briefcase,
    Home,
    File,
    Info,
    ExternalLink,
    X,
    AlertCircle,
    ShieldAlert,
    Landmark,
    CheckCircle2
} from 'lucide-react-native';
import moment from 'moment';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export default function AppointmentDetailScreen({ navigation, route }) {
    const { appointment } = route.params;
    const lawyer = appointment.lawyerID || {};
    const lawyerInfo = lawyer.userID || {};

    const [selectedDoc, setSelectedDoc] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // States cho tính năng hủy
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [bankAccount, setBankAccount] = useState("");
    const [bankName, setBankName] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [cancelling, setCancelling] = useState(false);

    // Success Modal states
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [refundSuccessInfo, setRefundSuccessInfo] = useState(null);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Confirmed': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã xác nhận' };
            case 'Cancelled': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' };
            case 'Completed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn thành' };
            default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ xử lý' };
        }
    };

    const getPaymentStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã thanh toán' };
            case 'Failed': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Thất bại' };
            case 'Refunded': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn tiền' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Chưa thanh toán' };
        }
    };

    const statusStyle = getStatusStyle(appointment.status);
    const paymentStyle = getPaymentStatusStyle(appointment.paymentStatus);

    const openLink = (url) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const handleDocPress = (doc) => {
        setSelectedDoc(doc);
        setModalVisible(true);
    };

    const handleCancelBooking = async () => {
        if (!bankAccount.trim() || !bankName.trim() || !refundReason.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin để nhận tiền hoàn trả");
            return;
        }

        setCancelling(true);
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            const response = await fetch(summaryAPI.cancelBooking.url.replace(":bookingId", appointment._id), {
                method: summaryAPI.cancelBooking.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bankAccount,
                    bankName,
                    refundReason
                })
            });

            const data = await response.json();
            if (data.success) {
                setRefundSuccessInfo(data.data.refundInfo);
                setCancelModalVisible(false);
                setSuccessModalVisible(true);
            } else {
                Alert.alert("Lỗi", data.message || "Không thể hủy cuộc hẹn");
            }
        } catch (error) {
            console.error("Cancel Booking Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ");
        } finally {
            setCancelling(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Chi tiết cuộc hẹn</Text>
                </View>
                <View style={[tw`px-3 py-1 rounded-full`, tw`${statusStyle.bg}`]}>
                    <Text style={[tw`text-xs font-bold uppercase`, tw`${statusStyle.text}`]}>{statusStyle.label}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`pb-10`}>
                {/* 1. Lawyer Card */}
                <View style={tw`bg-white mt-4 mx-4 p-4 rounded-3xl shadow-sm border border-slate-100`}>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-100 items-center justify-center overflow-hidden`}>
                            {lawyer.avatar ? (
                                <Image source={{ uri: lawyer.avatar }} style={tw`w-full h-full`} />
                            ) : (
                                <User size={40} color="#3B82F6" />
                            )}
                        </View>
                        <View style={tw`ml-4 flex-1`}>
                            <Text style={tw`text-xl font-bold text-slate-800`}>{lawyerInfo.fullname || "Luật sư"}</Text>
                            <Text style={tw`text-blue-600 font-medium mb-1`}>{lawyer.specialty || "Chuyên gia pháp lý"}</Text>
                            <View style={tw`flex-row items-center`}>
                                <Briefcase size={14} color="#64748B" />
                                <Text style={tw`text-slate-500 text-xs ml-1`}>{lawyer.firmName || "Văn phòng luật"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2. Schedule Info */}
                <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-4`}>Thông tin lịch hẹn</Text>

                    <View style={tw`flex-row items-center mb-4 bg-slate-50 p-3 rounded-2xl`}>
                        <View style={tw`bg-blue-600 p-2 rounded-xl`}>
                            <Calendar size={20} color="white" />
                        </View>
                        <View style={tw`ml-3`}>
                            <Text style={tw`text-slate-400 text-xs uppercase font-bold`}>Ngày hẹn</Text>
                            <Text style={tw`text-slate-800 font-bold`}>{moment(appointment.date).format('dddd, DD/MM/YYYY')}</Text>
                        </View>
                    </View>

                    <View style={tw`flex-row items-center mb-4 bg-slate-50 p-3 rounded-2xl`}>
                        <View style={tw`bg-blue-600 p-2 rounded-xl`}>
                            <Clock size={20} color="white" />
                        </View>
                        <View style={tw`ml-3`}>
                            <Text style={tw`text-slate-400 text-xs uppercase font-bold`}>Thời gian</Text>
                            <Text style={tw`text-slate-800 font-bold`}>{appointment.timeSlot?.start} - {appointment.timeSlot?.end}</Text>
                        </View>
                    </View>

                    <View style={tw`flex-row items-center bg-slate-50 p-3 rounded-2xl`}>
                        <View style={tw`bg-blue-600 p-2 rounded-xl`}>
                            <MapPin size={20} color="white" />
                        </View>
                        <View style={tw`ml-3 flex-1`}>
                            <Text style={tw`text-slate-400 text-xs uppercase font-bold`}>Địa điểm</Text>
                            <Text style={tw`text-slate-800 font-bold`} numberOfLines={2}>
                                {appointment.addressMeeting}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 3. Contact & Payment Info */}
                <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-4`}>Thông tin thanh toán & Liên hệ</Text>

                    <View style={tw`flex-row justify-between items-center mb-4 pb-4 border-b border-slate-50`}>
                        <View style={tw`flex-row items-center`}>
                            <CreditCard size={18} color="#64748B" />
                            <Text style={tw`ml-2 text-slate-600`}>Tổng chi phí:</Text>
                        </View>
                        <Text style={tw`text-lg font-bold text-blue-700`}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appointment.price || 0)}
                        </Text>
                    </View>

                    <View style={tw`flex-row justify-between items-center mb-4 pb-4 border-b border-slate-50`}>
                        <Text style={tw`text-slate-600`}>Trạng thái:</Text>
                        <View style={[tw`px-3 py-1 rounded-full`, tw`${paymentStyle.bg}`]}>
                            <Text style={[tw`text-xs font-bold uppercase`, tw`${paymentStyle.text}`]}>{paymentStyle.label}</Text>
                        </View>
                    </View>

                    <View style={tw`flex-row items-center mb-3`}>
                        <Phone size={18} color="#64748B" />
                        <Text style={tw`ml-3 text-slate-700 font-medium`}>{appointment.actualPhone || "Chưa có số điện thoại"}</Text>
                    </View>

                    <View style={tw`flex-row items-center`}>
                        <Mail size={18} color="#64748B" />
                        <Text style={tw`ml-3 text-slate-700 font-medium`}>{lawyerInfo.email || "N/A"}</Text>
                    </View>
                </View>

                {/* 4. Documents & Notes */}
                {(appointment.note || (appointment.documents && appointment.documents.length > 0)) && (
                    <View style={tw`bg-white mt-4 mx-4 p-5 rounded-3xl shadow-sm border border-slate-100`}>
                        <Text style={tw`font-bold text-slate-800 text-lg mb-4`}>Ghi chú & Tài liệu</Text>

                        {appointment.note && (
                            <View style={tw`mb-4 bg-yellow-50 p-4 rounded-2xl border border-yellow-100`}>
                                <View style={tw`flex-row items-center mb-1`}>
                                    <Info size={16} color="#B45309" />
                                    <Text style={tw`ml-2 font-bold text-yellow-800 text-xs uppercase`}>Ghi chú của bạn:</Text>
                                </View>
                                <Text style={tw`text-yellow-900`}>{appointment.note}</Text>
                            </View>
                        )}

                        {appointment.documents && appointment.documents.length > 0 && (
                            <View>
                                <View style={tw`flex-row items-center mb-3`}>
                                    <FileText size={18} color="#64748B" />
                                    <Text style={tw`ml-2 text-slate-700 font-semibold`}>Tài liệu đính kèm ({appointment.documents.length})</Text>
                                </View>
                                <View style={tw`flex-row flex-wrap`}>
                                    {appointment.documents.map((doc, idx) => {
                                        const isImage = typeof doc === 'string' && (doc.includes('.jpg') || doc.includes('.jpeg') || doc.includes('.png') || doc.includes('.webp'));
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => handleDocPress(doc)}
                                                style={tw`mr-3 mb-3 relative`}
                                            >
                                                {isImage ? (
                                                    <Image
                                                        source={{ uri: doc }}
                                                        style={tw`w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200`}
                                                    />
                                                ) : (
                                                    <View style={tw`w-24 h-24 rounded-2xl bg-blue-50 items-center justify-center border border-blue-100`}>
                                                        <File size={32} color="#2563EB" />
                                                        <Text style={tw`text-[10px] text-blue-600 mt-2 font-bold`}>XEM TÀI LIỆU</Text>
                                                    </View>
                                                )}
                                                <View style={tw`absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100`}>
                                                    <ExternalLink size={12} color="#64748B" />
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Cancel Booking Button */}
                {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                    <TouchableOpacity
                        onPress={() => setCancelModalVisible(true)}
                        style={tw`mx-4 mt-8 flex-row items-center justify-center p-4 bg-red-50 rounded-2xl border border-red-100`}
                    >
                        <ShieldAlert size={20} color="#EF4444" />
                        <Text style={tw`ml-2 text-red-600 font-bold`}>Hủy cuộc hẹn</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Document Preview Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 bg-black/95`}>
                    <SafeAreaView style={tw`flex-1`}>
                        {/* Modal Header */}
                        <View style={tw`flex-row justify-between items-center px-4 py-2`}>
                            <Text style={tw`text-white font-bold`}>Xem tài liệu</Text>
                            <TouchableOpacity
                                style={tw`bg-white/10 p-2 rounded-full`}
                                onPress={() => setModalVisible(false)}
                            >
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={tw`flex-1 justify-center items-center p-4`}>
                            {selectedDoc && (
                                typeof selectedDoc === 'string' && (selectedDoc.includes('.jpg') || selectedDoc.includes('.jpeg') || selectedDoc.includes('.png') || selectedDoc.includes('.webp')) ? (
                                    <Image
                                        source={{ uri: selectedDoc }}
                                        style={{ width: '100%', height: '80%', borderRadius: 12 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={tw`flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-2xl`}>
                                        <WebView
                                            source={{
                                                uri: (Platform.OS === 'android' && typeof selectedDoc === 'string' && selectedDoc.toLowerCase().includes('.pdf'))
                                                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(selectedDoc)}`
                                                    : selectedDoc
                                            }}
                                            style={tw`flex-1`}
                                            startInLoadingState={true}
                                            scalesPageToFit={true}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            originWhitelist={['*']}
                                            renderLoading={() => (
                                                <View style={tw`absolute inset-0 justify-center items-center bg-white`}>
                                                    <ActivityIndicator size="large" color="#2563EB" />
                                                </View>
                                            )}
                                        />
                                        <View style={tw`bg-slate-50 p-4 flex-row items-center justify-between border-t border-slate-200`}>
                                            <TouchableOpacity
                                                style={tw`bg-blue-600 px-4 py-2 rounded-xl flex-row items-center`}
                                                onPress={() => openLink(selectedDoc)}
                                            >
                                                <ExternalLink size={16} color="white" />
                                                <Text style={tw`text-white font-bold ml-2 text-xs`}>Mở trình duyệt</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={tw`bg-slate-200 px-4 py-2 rounded-xl`}
                                                onPress={() => setModalVisible(false)}
                                            >
                                                <Text style={tw`text-slate-700 font-bold text-xs`}>Đóng</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Cancel & Refund Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={cancelModalVisible}
                onRequestClose={() => setCancelModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={tw`flex-1`}
                >
                    <View style={tw`flex-1 bg-black/60 justify-end`}>
                        <TouchableOpacity
                            style={tw`flex-1`}
                            activeOpacity={1}
                            onPress={() => !cancelling && setCancelModalVisible(false)}
                        />
                        <View style={tw`bg-white rounded-t-[40px] px-6 pt-8 pb-10 shadow-2xl`}>
                            <View style={tw`items-center mb-6`}>
                                <View style={tw`w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4`}>
                                    <AlertCircle size={32} color="#EF4444" />
                                </View>
                                <Text style={tw`text-2xl font-black text-slate-800`}>Hủy cuộc hẹn</Text>
                                <Text style={tw`text-slate-500 text-center mt-2`}>Bạn có chắc chắn muốn hủy cuộc hẹn này? Vui lòng cung cấp thông tin để chúng tôi hoàn tiền.</Text>
                            </View>

                            <View style={tw`bg-slate-50 rounded-3xl p-4 mb-6`}>
                                <View style={tw`flex-row items-center mb-4 bg-white p-3 rounded-2xl border border-slate-100`}>
                                    <Landmark size={20} color="#3B82F6" />
                                    <TextInput
                                        placeholder="Tên ngân hàng (vd: Vietcombank)"
                                        style={tw`flex-1 ml-3 text-slate-800 font-medium`}
                                        value={bankName}
                                        onChangeText={setBankName}
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>

                                <View style={tw`flex-row items-center mb-4 bg-white p-3 rounded-2xl border border-slate-100`}>
                                    <CreditCard size={20} color="#3B82F6" />
                                    <TextInput
                                        placeholder="Số tài khoản ngân hàng"
                                        style={tw`flex-1 ml-3 text-slate-800 font-medium`}
                                        value={bankAccount}
                                        onChangeText={setBankAccount}
                                        keyboardType="number-pad"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>

                                <View style={tw`flex-row items-start bg-white p-3 rounded-2xl border border-slate-100`}>
                                    <Info size={20} color="#3B82F6" style={tw`mt-1`} />
                                    <TextInput
                                        placeholder="Lý do hủy..."
                                        style={tw`flex-1 ml-3 text-slate-800 font-medium h-24`}
                                        multiline
                                        textAlignVertical="top"
                                        value={refundReason}
                                        onChangeText={setRefundReason}
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                            </View>

                            <View style={tw`flex-row gap-4`}>
                                <TouchableOpacity
                                    disabled={cancelling}
                                    onPress={() => setCancelModalVisible(false)}
                                    style={tw`flex-1 bg-slate-100 h-14 rounded-2xl items-center justify-center`}
                                >
                                    <Text style={tw`text-slate-600 font-bold text-lg`}>Đóng</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    disabled={cancelling}
                                    onPress={handleCancelBooking}
                                    style={tw`flex-[2] bg-red-600 h-14 rounded-2xl items-center justify-center shadow-lg shadow-red-200`}
                                >
                                    {cancelling ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={tw`text-white font-bold text-lg`}>Xác nhận hủy</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Success Refund Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={successModalVisible}
                onRequestClose={() => {
                    setSuccessModalVisible(false);
                    navigation.goBack();
                }}
            >
                <View style={tw`flex-1 bg-black/60 justify-center items-center px-6`}>
                    <View style={tw`bg-white w-full rounded-[40px] p-8 items-center shadow-2xl`}>
                        <View style={tw`w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6`}>
                            <CheckCircle2 size={40} color="#10B981" />
                        </View>

                        <Text style={tw`text-2xl font-black text-slate-800 mb-2`}>Hủy thành công!</Text>
                        <Text style={tw`text-slate-500 text-center mb-8`}>Yêu cầu hoàn tiền của bạn đã được ghi nhận hệ thống.</Text>

                        <View style={tw`w-full bg-slate-50 rounded-3xl p-6 mb-8`}>
                            <View style={tw`flex-row justify-between mb-4`}>
                                <Text style={tw`text-slate-500 font-medium`}>Số tiền gốc:</Text>
                                <Text style={tw`text-slate-800 font-bold`}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refundSuccessInfo?.originalAmount || 0)}</Text>
                            </View>

                            <View style={tw`flex-row justify-between mb-4`}>
                                <Text style={tw`text-slate-500 font-medium`}>Phần trăm hoàn:</Text>
                                <View style={tw`bg-green-100 px-3 py-1 rounded-full`}>
                                    <Text style={tw`text-green-700 font-black text-xs`}>{refundSuccessInfo?.refundPercentage}%</Text>
                                </View>
                            </View>

                            <View style={tw`h-px bg-slate-200 mb-4`} />

                            <View style={tw`flex-row justify-between`}>
                                <Text style={tw`text-slate-500 font-medium`}>Số tiền hoàn trả:</Text>
                                <Text style={tw`text-green-600 font-black text-lg`}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refundSuccessInfo?.refundAmount || 0)}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setSuccessModalVisible(false);
                                navigation.goBack();
                            }}
                            style={tw`w-full bg-blue-600 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-200`}
                        >
                            <Text style={tw`text-white font-extrabold text-lg`}>Đã hiểu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
