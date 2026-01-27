import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

export default function QRCodeScreen({ navigation, route }) {
    const { qrUrl, bookingId, amount } = route.params;
    const [downloading, setDownloading] = useState(false);

    const downloadQRCode = async () => {
        try {
            setDownloading(true);

            // Request permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh để tải xuống');
                setDownloading(false);
                return;
            }

            // Download image
            const fileUri = FileSystem.documentDirectory + `QR_${bookingId}.png`;
            const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);

            // Save to gallery
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync('LawyerApp', asset, false);

            Alert.alert('Thành công', 'Đã lưu mã QR vào thư viện ảnh');
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Lỗi', 'Không thể tải xuống mã QR');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <View style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-12 pb-4 px-4 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Quét mã QR để thanh toán</Text>
                </View>
            </View>

            <View style={tw`flex-1 items-center justify-center p-6`}>
                {/* QR Code Card */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-lg w-full max-w-sm`}>
                    <Text style={tw`text-center text-lg font-bold text-slate-800 mb-2`}>
                        Quét mã QR để thanh toán
                    </Text>
                    <Text style={tw`text-center text-sm text-slate-500 mb-6`}>
                        Mã đặt lịch: {bookingId}
                    </Text>

                    {/* QR Code Image */}
                    <View style={tw`bg-white p-4 rounded-2xl border-2 border-blue-100 mb-4`}>
                        <Image
                            source={{ uri: qrUrl }}
                            style={tw`w-64 h-64`}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Amount */}
                    <View style={tw`bg-blue-50 rounded-xl p-4 mb-4`}>
                        <Text style={tw`text-center text-sm text-slate-600 mb-1`}>Số tiền thanh toán</Text>
                        <Text style={tw`text-center text-2xl font-bold text-blue-600`}>
                            {amount?.toLocaleString('vi-VN')} đ
                        </Text>
                    </View>

                    {/* Download Button */}
                    <TouchableOpacity
                        onPress={downloadQRCode}
                        disabled={downloading}
                        style={tw`bg-green-600 py-3 rounded-xl flex-row items-center justify-center mb-3 ${downloading ? 'opacity-50' : ''}`}
                    >
                        {downloading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Download size={20} color="white" />
                                <Text style={tw`text-white font-bold ml-2`}>Tải ảnh QR</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={tw`mt-6 px-4`}>
                    <Text style={tw`text-center text-sm text-slate-600`}>
                        Mở ứng dụng ngân hàng và quét mã QR để thanh toán
                    </Text>
                </View>
            </View>
        </View>
    );
}
