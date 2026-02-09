import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';

import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { ArrowLeft, CreditCard, Building2, CheckCircle2, Calendar, Clock, MapPin } from 'lucide-react-native';
import io from "socket.io-client/dist/socket.io.js";
import { useState, useEffect } from 'react';

const PAYMENT_METHODS = [
    { id: 'banking', name: 'Chuyển khoản ngân hàng', icon: Building2, color: '#16A34A' },
    { id: 'card', name: 'Thẻ quốc tế (Visa/Master)', icon: CreditCard, color: '#2563EB' },
];


export default function PaymentScreen({ navigation, route }) {
    const { lawyer, selectedDate, selectedSlot, bookingType, address, bookingId, price = 500000 } = route.params;
    const [selectedMethod, setSelectedMethod] = useState('banking');
    const [loading, setLoading] = useState(false);



    const handlePayment = async () => {
        if (!selectedMethod) {
            Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán");
            return;
        }

        const totalAmount = price + 1500;

        // If card payment is selected, navigate to card payment screen
        if (selectedMethod === 'card') {
            navigation.navigate('CardPaymentScreen', {
                bookingId: bookingId,
                amount: totalAmount,
                lawyer: lawyer,
                selectedDate: selectedDate,
                selectedSlot: selectedSlot,
                bookingType: bookingType,
                address: address
            });
            return;
        }

        // Banking payment flow (QR Code)
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem("@AuthToken");

            const response = await fetch(summaryAPI.createUrlPayment.url, {
                method: summaryAPI.createUrlPayment.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: totalAmount,
                    description: `Thanh toán ${bookingId}`,
                })
            });

            const data = await response.json();

            if (data.success) {
                // Navigate to QR Code Screen
                navigation.navigate('QRCodeScreen', {
                    qrUrl: data.qrUrl,
                    bookingId: bookingId,
                    amount: totalAmount
                });
            } else {
                Alert.alert("Lỗi", data.message || "Tạo giao dịch thất bại.");
            }

        } catch (error) {
            console.error("Payment Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến cổng thanh toán.");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        // Use the IP address provided by the user
        const socket = io("http://98.89.3.141", {
            transports: ['websocket'], // Force websocket for better reliability in RN
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            // Join vào phòng riêng của booking này sau khi kết nối thành công
            socket.emit("join", bookingId);
        });

        socket.on("connect_error", (error) => {
            console.error("Socket connect_error:", error);
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
        });

        // Khi nhận được tín hiệu thành công
        socket.on("payment_success", (data) => {
            console.log("Payment success received:", data);
            Alert.alert("Thành công", "Thanh toán thành công!");
            navigation.navigate("Home");
        });

        return () => {
            socket.off("connect");
            socket.off("connect_error");
            socket.off("disconnect");
            socket.off("payment_success");
            socket.disconnect();
        };
    }, [bookingId]);

    return (
        <View style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-12 pb-4 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Thanh toán</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-32`}>
                {/* 1. Booking Summary */}
                <Text style={tw`text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider`}>Thông tin đặt lịch</Text>
                <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6`}>
                    <View style={tw`flex-row items-center border-b border-slate-100 pb-4 mb-4`}>
                        <Image
                            source={{ uri: lawyer.avatar || 'https://via.placeholder.com/100' }}
                            style={tw`w-14 h-14 rounded-full bg-slate-200`}
                        />
                        <View style={tw`ml-3 flex-1`}>
                            <Text style={tw`font-bold text-slate-800 text-base`}>{lawyer.userID?.fullname || "Luật sư"}</Text>
                            <Text style={tw`text-slate-500 text-sm`}>{lawyer.specialty}</Text>
                        </View>
                    </View>

                    <View style={tw`mb-3 flex-row items-center`}>
                        <Calendar size={16} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-700`}>{selectedDate.replaceAll?.('/', '-') || selectedDate}</Text>
                        {/* selectedDate might be DD/MM/YYYY string or Date object string depending on how passed. We'll handle string. */}
                    </View>
                    <View style={tw`mb-3 flex-row items-center`}>
                        <Clock size={16} color="#64748B" />
                        <Text style={tw`ml-2 text-slate-700`}>{selectedSlot.time}</Text>
                    </View>
                    <View style={tw`flex-row items-start`}>
                        <MapPin size={16} color="#64748B" style={tw`mt-0.5`} />
                        <Text style={tw`ml-2 text-slate-700 flex-1`}>
                            {bookingType === 'office' ? `Văn phòng: ${lawyer.firmName || 'Tại văn phòng'}` : `Tại nhà: ${address}`}
                        </Text>
                    </View>
                </View>

                {/* 2. Payment Method Selection */}
                <Text style={tw`text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider`}>Phương thức thanh toán</Text>
                <View style={tw`mb-6`}>
                    {PAYMENT_METHODS.map((method) => {
                        const IconComponent = method.icon;
                        const isSelected = selectedMethod === method.id;
                        return (
                            <TouchableOpacity
                                key={method.id}
                                onPress={() => setSelectedMethod(method.id)}
                                style={tw`bg-white rounded-2xl p-4 mb-3 border-2 ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-200' : 'border-slate-100'}`}
                            >
                                <View style={tw`flex-row items-center`}>
                                    <View style={tw`w-12 h-12 rounded-full items-center justify-center`} backgroundColor={`${method.color}15`}>
                                        <IconComponent size={24} color={method.color} />
                                    </View>
                                    <View style={tw`flex-1 ml-3`}>
                                        <Text style={tw`font-semibold text-slate-800 text-base`}>{method.name}</Text>
                                    </View>
                                    {isSelected && (
                                        <CheckCircle2 size={24} color="#3B82F6" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 3. Price Breakdown */}
                <View style={tw`mt-6 bg-white rounded-2xl p-4 border border-slate-100`}>
                    <View style={tw`flex-row justify-between mb-2`}>
                        <Text style={tw`text-slate-500`}>Phí tư vấn</Text>
                        <Text style={tw`font-medium text-slate-800`}>{price.toLocaleString('vi-VN')} đ</Text>
                    </View>
                    <View style={tw`flex-row justify-between mb-4`}>
                        <Text style={tw`text-slate-500`}>Phí dịch vụ</Text>
                        <Text style={tw`font-medium text-slate-800`}>15.000 đ</Text>
                    </View>
                    <View style={tw`border-t border-dashed border-slate-200 pt-3 flex-row justify-between items-center`}>
                        <Text style={tw`font-bold text-lg text-slate-800`}>Tổng cộng</Text>
                        <Text style={tw`font-bold text-xl text-blue-600`}>{(price + 15000).toLocaleString('vi-VN')} đ</Text>
                    </View>
                </View>

            </ScrollView>

            {/* Bottom Button */}
            <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100`}>
                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={loading}
                    style={tw`w-full py-4 rounded-2xl flex-row justify-center items-center ${loading ? 'bg-slate-300' : 'bg-blue-600 shadow-lg shadow-blue-300'}`}
                >
                    {loading ? (
                        <Text style={tw`text-white font-bold text-lg`}>Đang xử lý...</Text>
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="white" />
                            <Text style={tw`text-white font-bold text-lg ml-2`}>Thanh toán ngay</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
