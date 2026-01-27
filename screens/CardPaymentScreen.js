import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { ArrowLeft, CreditCard, Calendar, Lock, User, CheckCircle2 } from 'lucide-react-native';

export default function CardPaymentScreen({ navigation, route }) {
    const { bookingId, amount, lawyer, selectedDate, selectedSlot } = route.params;

    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [loading, setLoading] = useState(false);

    // Format card number with spaces (XXXX XXXX XXXX XXXX)
    const formatCardNumber = (text) => {
        const cleaned = text.replace(/\s/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted.substring(0, 19); // Max 16 digits + 3 spaces
    };

    // Format expiry date (MM/YY)
    const formatExpiryDate = (text) => {
        const cleaned = text.replace(/\//g, '');
        if (cleaned.length >= 2) {
            return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }
        return cleaned;
    };

    const validateCard = () => {
        const cleanedCardNumber = cardNumber.replace(/\s/g, '');

        if (cleanedCardNumber.length !== 16) {
            Alert.alert("Lỗi", "Số thẻ phải có 16 chữ số");
            return false;
        }

        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            Alert.alert("Lỗi", "Ngày hết hạn không hợp lệ (MM/YY)");
            return false;
        }

        const [month, year] = expiryDate.split('/');
        if (parseInt(month) < 1 || parseInt(month) > 12) {
            Alert.alert("Lỗi", "Tháng không hợp lệ");
            return false;
        }

        if (cvv.length < 3 || cvv.length > 4) {
            Alert.alert("Lỗi", "CVV phải có 3 hoặc 4 chữ số");
            return false;
        }

        if (cardholderName.trim().length < 3) {
            Alert.alert("Lỗi", "Vui lòng nhập tên chủ thẻ");
            return false;
        }

        return true;
    };

    const handlePayment = async () => {
        if (!validateCard()) {
            return;
        }

        setLoading(true);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // In a real app, you would call your payment gateway API here
            // const response = await fetch(summaryAPI.processCardPayment.url, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         cardNumber: cardNumber.replace(/\s/g, ''),
            //         expiryDate,
            //         cvv,
            //         cardholderName,
            //         amount,
            //         bookingId
            //     })
            // });

            Alert.alert(
                "Thành công",
                "Thanh toán thành công!",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.navigate('Home')
                    }
                ]
            );

        } catch (error) {
            console.error("Payment Error:", error);
            Alert.alert("Lỗi", "Không thể xử lý thanh toán. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={tw`flex-1 bg-slate-50`}
        >
            {/* Header */}
            <View style={tw`bg-white pt-12 pb-4 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Thanh toán thẻ</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-32`}>
                {/* Payment Amount */}
                <View style={tw`bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 shadow-lg`}>
                    <Text style={tw`text-white text-sm mb-2 opacity-90`}>Số tiền thanh toán</Text>
                    <Text style={tw`text-white text-3xl font-bold`}>{amount.toLocaleString('vi-VN')} đ</Text>
                    <Text style={tw`text-white text-sm mt-2 opacity-75`}>Mã đặt lịch: {bookingId}</Text>
                </View>

                {/* Card Number */}
                <View style={tw`mb-4`}>
                    <Text style={tw`text-slate-700 font-semibold mb-2`}>Số thẻ</Text>
                    <View style={tw`bg-white rounded-xl border-2 border-slate-200 flex-row items-center px-4 py-3`}>
                        <CreditCard size={20} color="#64748B" />
                        <TextInput
                            style={tw`flex-1 ml-3 text-slate-800 text-base`}
                            placeholder="1234 5678 9012 3456"
                            keyboardType="numeric"
                            value={cardNumber}
                            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                            maxLength={19}
                        />
                    </View>
                </View>

                {/* Expiry Date and CVV */}
                <View style={tw`flex-row mb-4`}>
                    <View style={tw`flex-1 mr-2`}>
                        <Text style={tw`text-slate-700 font-semibold mb-2`}>Ngày hết hạn</Text>
                        <View style={tw`bg-white rounded-xl border-2 border-slate-200 flex-row items-center px-4 py-3`}>
                            <Calendar size={20} color="#64748B" />
                            <TextInput
                                style={tw`flex-1 ml-3 text-slate-800 text-base`}
                                placeholder="MM/YY"
                                keyboardType="numeric"
                                value={expiryDate}
                                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                                maxLength={5}
                            />
                        </View>
                    </View>

                    <View style={tw`flex-1 ml-2`}>
                        <Text style={tw`text-slate-700 font-semibold mb-2`}>CVV</Text>
                        <View style={tw`bg-white rounded-xl border-2 border-slate-200 flex-row items-center px-4 py-3`}>
                            <Lock size={20} color="#64748B" />
                            <TextInput
                                style={tw`flex-1 ml-3 text-slate-800 text-base`}
                                placeholder="123"
                                keyboardType="numeric"
                                value={cvv}
                                onChangeText={setCvv}
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                    </View>
                </View>

                {/* Cardholder Name */}
                <View style={tw`mb-4`}>
                    <Text style={tw`text-slate-700 font-semibold mb-2`}>Tên chủ thẻ</Text>
                    <View style={tw`bg-white rounded-xl border-2 border-slate-200 flex-row items-center px-4 py-3`}>
                        <User size={20} color="#64748B" />
                        <TextInput
                            style={tw`flex-1 ml-3 text-slate-800 text-base`}
                            placeholder="NGUYEN VAN A"
                            value={cardholderName}
                            onChangeText={(text) => setCardholderName(text.toUpperCase())}
                            autoCapitalize="characters"
                        />
                    </View>
                </View>

                {/* Security Notice */}
                <View style={tw`bg-blue-50 rounded-xl p-4 border border-blue-200 mt-2`}>
                    <View style={tw`flex-row items-start`}>
                        <Lock size={16} color="#2563EB" style={tw`mt-0.5`} />
                        <Text style={tw`text-blue-700 text-sm ml-2 flex-1`}>
                            Thông tin thẻ của bạn được mã hóa và bảo mật. Chúng tôi không lưu trữ thông tin thẻ.
                        </Text>
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
                            <Text style={tw`text-white font-bold text-lg ml-2`}>Xác nhận thanh toán</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
