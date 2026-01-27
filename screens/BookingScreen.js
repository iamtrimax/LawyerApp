import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import tw from 'twrnc';
import { ArrowLeft, Calendar, Clock, CheckCircle, MapPin, Briefcase, Home, Phone } from 'lucide-react-native';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contextAPI/AuthProvider';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileText, X, File } from 'lucide-react-native';

const DAYS_OF_WEEK = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default function BookingScreen({ navigation, route }) {
    const { lawyer } = route.params;
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [dates, setDates] = useState([]);
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [schedule, setSchedule] = useState([]); // Store fetched schedule
    const { user } = useAuth()
    // New Feature: Location Selection
    const [bookingType, setBookingType] = useState('office'); // 'office' | 'home'
    const [address, setAddress] = useState('');
    const [actualPhone, setActualPhone] = useState(user?.phone || '');
    const [documentsLocal, setDocumentsLocal] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const next14Days = [];
        const today = new Date();

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            next14Days.push(date);
        }
        setDates(next14Days);
        setSelectedDate(next14Days[0]); // Select today by default
    }, []);

    // 2. Fetch Schedule Data
    const fetchSchedule = async () => {
        try {
            const url = summaryAPI.getScheduleByLawyerId.url.replace(':lawyerId', lawyer._id);
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setSchedule(data.data);
            }
        } catch (error) {
            console.error("Error fetching schedule:", error);
            Alert.alert("Lỗi", "Không thể tải lịch làm việc của luật sư.");
        }
    };

    useEffect(() => {
        if (lawyer?._id) {
            fetchSchedule();
        }
    }, [lawyer]);

    // 3. Process Slots when Date or Schedule changes
    useEffect(() => {
        if (selectedDate && schedule.length > 0) {
            fetchSlotsForDate(selectedDate);
        }
    }, [selectedDate, schedule]);

    const fetchSlotsForDate = (date) => {
        setLoadingSlots(true);
        setSelectedSlot(null);

        // Use timeout to prevent UI freeze if calculation is heavy (though it's fast)
        setTimeout(() => {
            const dayName = DAYS_OF_WEEK[date.getDay()];
            const daySchedule = schedule.find(d => d.day === dayName);

            if (!daySchedule || !daySchedule.active || !daySchedule.slots) {
                setSlots([]);
                setLoadingSlots(false);
                return;
            }

            const generatedSlots = [];

            daySchedule.slots.forEach(range => {
                const startHour = parseInt(range.start.split(':')[0]);
                const startMin = parseInt(range.start.split(':')[1]);

                const endHour = parseInt(range.end.split(':')[0]);
                const endMin = parseInt(range.end.split(':')[1]);

                // Generate hourly slots within this range
                // Simplifying assumption: Slots are 1 hour long and start on the hour
                // More complex logic needed if minutes are important (e.g. 08:30)
                // For this example, we assume endpoints are aligned or we floor/ceil them

                let currentH = startHour;

                while (currentH < endHour) {
                    const slotStart = `${currentH.toString().padStart(2, '0')}:00`;
                    const slotEnd = `${(currentH + 1).toString().padStart(2, '0')}:00`;

                    // Check strictly < endHour OR if endHour has minutes (e.g. 17:30 allows 16:00-17:00 but also 17:00-17:30? Usually 1 hour slots)
                    // We stick to 1 hour blocks.

                    // Unique ID
                    const slotId = `${date.toDateString()}-${slotStart}`;

                    generatedSlots.push({
                        id: slotId,
                        time: `${slotStart} - ${slotEnd}`,
                        available: true // In future: check against booked appointments
                    });

                    currentH++;
                }
            });

            setSlots(generatedSlots);
            setLoadingSlots(false);
        }, 300);
    };

    const pickDocuments = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                multiple: true,
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                const selectedDocs = result.assets.map(asset => ({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType,
                    size: asset.size
                }));
                // Combine with existing documents, limit to 5
                setDocumentsLocal(prev => [...prev, ...selectedDocs].slice(0, 5));
            }
        } catch (error) {
            console.error("Error picking documents:", error);
            Alert.alert("Lỗi", "Không thể chọn tài liệu.");
        }
    };

    const removeDocument = (index) => {
        setDocumentsLocal(prev => prev.filter((_, i) => i !== index));
    };

    const uploadToCloudinary = async (doc) => {
        const cloudName = process.env.EXPO_PUBLIC_CLOUD_NAME;
        const data = new FormData();

        // Determine resource type for Cloudinary
        const isImage = doc.mimeType?.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw';

        data.append("file", {
            uri: doc.uri,
            type: doc.mimeType || (isImage ? "image/jpeg" : "application/octet-stream"),
            name: doc.name || `booking_doc_${Date.now()}`,
        });
        data.append("upload_preset", "lawyerPicture");
        data.append("cloud_name", cloudName);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                {
                    method: "POST",
                    body: data,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const result = await response.json();
            return result.secure_url;
        } catch (error) {
            console.error("Lỗi upload tài liệu lên Cloudinary:", error);
            return null;
        }
    };

    const handleBook = async () => {
        if (!selectedDate || !selectedSlot) {
            Alert.alert("Chưa chọn lịch", "Vui lòng chọn ngày và giờ hẹn.");
            return;
        }

        if (bookingType === 'home' && !address.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập địa chỉ của bạn để luật sư đến nhà.");
            return;
        }

        if (!actualPhone.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập số điện thoại liên hệ.");
            return;
        }

        setUploading(true);
        let uploadedDocs = [];

        try {
            if (documentsLocal.length > 0) {
                const uploadPromises = documentsLocal.map(uri => uploadToCloudinary(uri));
                uploadedDocs = await Promise.all(uploadPromises);
                uploadedDocs = uploadedDocs.filter(url => url !== null);
            }

            const year = selectedDate.getFullYear();
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const day = selectedDate.getDate().toString().padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            const [startTime, endTime] = selectedSlot.time.split(' - ');
            const payload = {
                userId: user._id,
                lawyerId: lawyer._id,
                date: formattedDate,
                timeSlot: {
                    start: startTime,
                    end: endTime
                },
                price: lawyer.hourlyRate || 2000,
                addressMeeting: bookingType === 'home' ? address : lawyer.firmName,
                actualPhone: actualPhone,
                documents: uploadedDocs,
                note: bookingType === 'home' ? `Tại nhà: ${address}` : 'Tại văn phòng',
            };

            const token = await AsyncStorage.getItem("@AuthToken");
            if (!token) {
                Alert.alert("Lỗi", "Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
                setUploading(false);
                return;
            }

            const response = await fetch(summaryAPI.createBookingLawyer.url, {
                method: summaryAPI.createBookingLawyer.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                navigation.navigate('Payment', {
                    lawyer,
                    bookingId: data.booking._id,
                    selectedDate: formattedDate,
                    selectedSlot,
                    bookingType,
                    address: payload.addressMeeting,
                    price: payload.price
                });
            } else {
                Alert.alert("Đặt lịch thất bại", data.message || "Có lỗi xảy ra, vui lòng thử lại.");
            }
        } catch (error) {
            console.error("Booking Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ.");
        } finally {
            setUploading(false);
        }
    };

    const formatDateDay = (date) => {
        const d = date.getDate();
        const dayName = DAYS_OF_WEEK[date.getDay()];
        return { day: d, name: dayName };
    };

    return (
        <View style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-12 pb-4 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center mb-4`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Đặt lịch hẹn</Text>
                </View>

                {/* Lawyer Quick Info */}
                <View style={tw`flex-row items-center bg-blue-50 p-3 rounded-2xl`}>
                    <Image
                        source={{ uri: lawyer.avatar || 'https://via.placeholder.com/150' }}
                        style={tw`w-12 h-12 rounded-full bg-slate-300`}
                    />
                    <View style={tw`ml-3 flex-1`}>
                        <Text style={tw`font-bold text-slate-800 text-base`}>{lawyer.userID?.fullname || "Luật sư"}</Text>
                        <Text style={tw`text-blue-600 text-xs`}>{lawyer.specialty || "Chuyên gia pháp lý"}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`pb-32`}>
                {/* 1. Date Selector */}
                <View style={tw`mt-4`}>
                    <Text style={tw`font-bold text-slate-800 text-lg px-4 mb-3`}>Chọn ngày</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={tw`px-4`}
                    >
                        {dates.map((date, index) => {
                            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                            const { day, name } = formatDateDay(date);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setSelectedDate(date)}
                                    style={tw`mr-3 items-center justify-center w-16 h-20 rounded-2xl border ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                                >
                                    <Text style={tw`text-xs mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{name}</Text>
                                    <Text style={tw`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{day}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                {/* 2. Slot Selector */}
                <View style={tw`mt-6 px-4`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-3`}>Giờ khả dụng</Text>

                    {loadingSlots ? (
                        <View style={tw`h-32 justify-center items-center`}>
                            <ActivityIndicator size="small" color="#2563EB" />
                        </View>
                    ) : (
                        <View style={tw`flex-row flex-wrap justify-between`}>
                            {slots.length > 0 ? slots.map((slot) => {
                                const isSelected = selectedSlot?.id === slot.id;
                                return (
                                    <TouchableOpacity
                                        key={slot.id}
                                        onPress={() => setSelectedSlot(slot)}
                                        style={tw`w-[48%] mb-3 py-3 px-2 rounded-xl border flex-row justify-center items-center ${isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'}`}
                                    >
                                        <Clock size={16} color={isSelected ? "#2563EB" : "#64748B"} />
                                        <Text style={tw`ml-2 font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                            {slot.time}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }) : (
                                <View style={tw`w-full py-8 items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300`}>
                                    <Text style={tw`text-slate-400`}>Không có lịch trống ngày này.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* 3. Location Selector */}
                <View style={tw`mt-6 px-4`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-3`}>Địa điểm tư vấn</Text>

                    <View style={tw`flex-row bg-white p-1 rounded-2xl border border-slate-200 mb-4`}>
                        <TouchableOpacity
                            onPress={() => setBookingType('office')}
                            style={tw`flex-1 flex-row items-center justify-center py-3 rounded-xl ${bookingType === 'office' ? 'bg-blue-600' : 'bg-transparent'}`}
                        >
                            <Briefcase size={18} color={bookingType === 'office' ? "white" : "#64748B"} />
                            <Text style={tw`ml-2 font-bold ${bookingType === 'office' ? 'text-white' : 'text-slate-500'}`}>Văn phòng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setBookingType('home')}
                            style={tw`flex-1 flex-row items-center justify-center py-3 rounded-xl ${bookingType === 'home' ? 'bg-blue-600' : 'bg-transparent'}`}
                        >
                            <Home size={18} color={bookingType === 'home' ? "white" : "#64748B"} />
                            <Text style={tw`ml-2 font-bold ${bookingType === 'home' ? 'text-white' : 'text-slate-500'}`}>Tại nhà</Text>
                        </TouchableOpacity>
                    </View>
                    {/** display firmname */}
                    {bookingType === 'office' && (
                        <View style={tw`bg-white p-4 rounded-2xl border border-blue-200 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <MapPin size={18} color="#2563EB" />
                                <Text style={tw`ml-2 font-semibold text-slate-700`}>Địa chỉ văn phòng:</Text>
                            </View>
                            <Text style={tw`text-slate-600`}>{lawyer.firmName}</Text>
                        </View>
                    )}
                    {/* Address Input for Home Booking */}
                    {bookingType === 'home' && (
                        <View style={tw`bg-white p-4 rounded-2xl border border-blue-200 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-2`}>
                                <MapPin size={18} color="#2563EB" />
                                <Text style={tw`ml-2 font-semibold text-slate-700`}>Nhập địa chỉ của bạn:</Text>
                            </View>
                            <TextInput
                                style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800`}
                                placeholder="Số nhà, đường, phường, quận..."
                                placeholderTextColor="#94A3B8"
                                value={address}
                                onChangeText={setAddress}
                                multiline
                            />
                        </View>
                    )}
                </View>

                {/* 4. Additional Info */}
                <View style={tw`mt-6 px-4`}>
                    <Text style={tw`font-bold text-slate-800 text-lg mb-3`}>Thông tin bổ sung</Text>

                    {/* Contact Phone */}
                    <View style={tw`bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <Phone size={18} color="#2563EB" />
                            <Text style={tw`ml-2 font-semibold text-slate-700`}>Số điện thoại liên hệ:</Text>
                        </View>
                        <TextInput
                            style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800`}
                            placeholder="Nhập số điện thoại của bạn"
                            placeholderTextColor="#94A3B8"
                            value={actualPhone}
                            onChangeText={setActualPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Document Upload */}
                    <View style={tw`bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <FileText size={18} color="#2563EB" />
                            <Text style={tw`ml-2 font-semibold text-slate-700`}>Đính kèm tài liệu (nếu có):</Text>
                        </View>

                        <View style={tw`flex-row flex-wrap mt-2`}>
                            {documentsLocal.map((doc, index) => {
                                const isImage = doc.mimeType?.startsWith('image/');
                                return (
                                    <View key={index} style={tw`relative mr-2 mb-2`}>
                                        {isImage ? (
                                            <Image source={{ uri: doc.uri }} style={tw`w-20 h-20 rounded-xl bg-slate-100`} />
                                        ) : (
                                            <View style={tw`w-20 h-20 rounded-xl bg-blue-50 items-center justify-center border border-blue-100`}>
                                                <File size={32} color="#2563EB" />
                                                <Text style={tw`text-[8px] text-blue-600 mt-1 px-1 text-center`} numberOfLines={1}>
                                                    {doc.name}
                                                </Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => removeDocument(index)}
                                            style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-sm`}
                                        >
                                            <X size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}

                            {documentsLocal.length < 5 && (
                                <TouchableOpacity
                                    onPress={pickDocuments}
                                    style={tw`w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50`}
                                >
                                    <Camera size={24} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={tw`text-[10px] text-slate-400 mt-2`}>Tối đa 5 hình ảnh hoặc tài liệu liên quan đến vụ việc.</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}>
                <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100`}>
                    <TouchableOpacity
                        onPress={handleBook}
                        disabled={uploading}
                        style={tw`w-full py-4 rounded-2xl flex-row justify-center items-center ${(!selectedDate || !selectedSlot || uploading) ? 'bg-slate-300' : 'bg-blue-600 shadow-lg shadow-blue-300'}`}
                    >
                        {uploading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <CheckCircle size={20} color="white" />
                                <Text style={tw`text-white font-bold text-lg ml-2`}>Xác nhận đặt lịch</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
