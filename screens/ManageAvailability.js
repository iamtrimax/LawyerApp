import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
    Alert,
    ActivityIndicator,
    Modal,  // Added Modal
} from 'react-native';
import tw from 'twrnc';
import { ChevronLeft, Plus, Trash2, Clock, AlertCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export default function ManageAvailability({ navigation }) {
    const [availability, setAvailability] = useState(
        DAYS.map((day) => ({ day, active: false, slots: [] }))
    );
    const [loading, setLoading] = useState(true)
    // State điều khiển Picker
    const [showPicker, setShowPicker] = useState(false);
    const [pickerConfig, setPickerConfig] = useState({ dayIdx: null, slotIdx: null, type: 'start' });
    const [tempDate, setTempDate] = useState(new Date()); // Temp date for iOS picker

    // 1. Logic mở bộ chọn giờ
    const openPicker = (dayIdx, slotIdx, type) => {
        try {
            const currentSlot = availability[dayIdx]?.slots?.[slotIdx];
            if (!currentSlot) return;

            const timeStr = currentSlot[type]; // "HH:mm"
            
            // Parse "HH:mm" to Date object
            let date = new Date();
            if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                    date.setHours(hours);
                    date.setMinutes(minutes);
                    date.setSeconds(0);
                }
            }

            setTempDate(date);
            setPickerConfig({ dayIdx, slotIdx, type });
            setShowPicker(true);
        } catch (error) {
            console.error("Error opening picker:", error);
            setTempDate(new Date()); 
            setPickerConfig({ dayIdx, slotIdx, type });
            setShowPicker(true);
        }
    };

    // 2. Cập nhật giờ
    // Android: Handle immediately
    // iOS: Update temp state only
    const onTimeChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) {
                saveTime(selectedDate);
            }
        } else {
            // iOS: Just update temp state
            if (selectedDate) setTempDate(selectedDate);
        }
    };

    // Helper to save time to availability state
    const saveTime = (date) => {
        const { dayIdx, slotIdx, type } = pickerConfig;
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        const updated = [...availability];
        updated[dayIdx].slots[slotIdx][type] = timeStr;
        setAvailability(updated);
    };

    // iOS Specific Handlers
    const confirmIOSPicker = () => {
        saveTime(tempDate);
        setShowPicker(false);
    };

    const cancelIOSPicker = () => {
        setShowPicker(false);
    };

    // 3. Quản lý ngày và slot
    const toggleDay = (idx) => {
        const updated = [...availability];
        updated[idx].active = !updated[idx].active;

        // Nếu tắt ngày, ta tắt luôn picker để tránh bị treo
        if (!updated[idx].active) {
            setShowPicker(false);
        }

        if (updated[idx].active && updated[idx].slots.length === 0) {
            updated[idx].slots.push({ start: '08:00', end: '17:00' });
        }
        setAvailability(updated);
    };
    const addSlot = (idx) => {
        const updated = [...availability];
        updated[idx].slots.push({ start: '08:00', end: '09:00' });
        setAvailability(updated);
    };

    const removeSlot = (dayIdx, slotIdx) => {
        const updated = [...availability];
        updated[dayIdx].slots.splice(slotIdx, 1);
        setAvailability(updated);
    };

    // 4. HÀM VALIDATE (Quan trọng nhất)
    const validateAvailability = () => {
        for (let day of availability) {
            if (!day.active) continue;

            if (day.slots.length === 0) {
                Alert.alert("Lỗi", `${day.day} đã bật nhưng chưa có khung giờ nào.`);
                return false;
            }

            for (let i = 0; i < day.slots.length; i++) {
                const { start, end } = day.slots[i];

                // Chuyển "HH:mm" thành số phút để so sánh
                const startMins = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                const endMins = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);

                if (startMins >= endMins) {
                    Alert.alert("Lỗi thời gian", `Tại ${day.day}: Giờ bắt đầu (${start}) phải nhỏ hơn giờ kết thúc (${end}).`);
                    return false;
                }

                // Kiểm tra trùng lặp (Overlap) với các slot khác trong cùng ngày
                for (let j = i + 1; j < day.slots.length; j++) {
                    const otherStart = parseInt(day.slots[j].start.split(':')[0]) * 60 + parseInt(day.slots[j].start.split(':')[1]);
                    const otherEnd = parseInt(day.slots[j].end.split(':')[0]) * 60 + parseInt(day.slots[j].end.split(':')[1]);

                    if (startMins < otherEnd && endMins > otherStart) {
                        Alert.alert("Trùng lịch", `Tại ${day.day}: Các khung giờ đang bị đè lên nhau.`);
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        try {
            const validate = validateAvailability()
            if(!validate)
                return
            const token = await AsyncStorage.getItem("@AuthToken")
            const response = await fetch(summaryAPI.updateSchedule.url, {
                method: summaryAPI.updateSchedule.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ availability: availability })
            })
            const data = await response.json()
            if (data.success) {
                Alert.alert(data.message);
            }
        } catch (error) {
            console.log(error);
            Alert.alert("Lỗi", "Không thể lưu lịch. Vui lòng thử lại");
        }
    };
    const fetchScheduleData = async () => {
        try {
            const token = await AsyncStorage.getItem("@AuthToken");
            // Giả sử bạn có summaryAPI.getSchedule
            const response = await fetch(summaryAPI.getSchedule.url, {
                method: summaryAPI.getSchedule.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                // Nếu server đã có dữ liệu, cập nhật vào state
                setAvailability(data.data);
            }
            // Nếu success nhưng data trống, giữ nguyên mảng mặc định DAYS
        } catch (error) {
            console.log("Lỗi tải lịch:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu lịch.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{
        fetchScheduleData()
    },[])
    // Hiển thị màn hình chờ nếu đang tải
    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator color = "blue"/>
            </View>
        );
    }
    return (
        <View style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 pb-4 pt-12 flex-row items-center border-b border-slate-200`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
                    <ChevronLeft color="#1E293B" size={24} />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-slate-800 ml-2`}>Cài đặt lịch rảnh</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
                <View style={tw`mb-6 bg-blue-50 p-4 rounded-2xl flex-row items-start`}>
                    <AlertCircle size={20} color="#2563EB" style={tw`mt-0.5`} />
                    <Text style={tw`ml-3 text-blue-800 text-sm leading-5 flex-1`}>
                        Thiết lập khung giờ giúp khách hàng biết khi nào bạn có thể tư vấn. Hệ thống sẽ tự động ẩn các giờ đã có người đặt.
                    </Text>
                </View>

                {availability.map((item, dIdx) => (
                    <View key={dIdx} style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100`}>
                        <View style={tw`flex-row justify-between items-center`}>
                            <View>
                                <Text style={tw`text-base font-bold text-slate-800`}>{item.day}</Text>
                                <Text style={tw`text-xs text-slate-400`}>{item.active ? 'Đang hoạt động' : 'Đang nghỉ'}</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                                thumbColor={item.active ? "#2563EB" : "#F1F5F9"}
                                onValueChange={() => toggleDay(dIdx)}
                                value={item.active}
                            />
                        </View>

                        {item.active && (
                            <View style={tw`mt-4 pt-4 border-t border-slate-50`}>
                                {item.slots.map((slot, sIdx) => (
                                    <View key={sIdx} style={tw`flex-row items-center mb-4`}>
                                        <TouchableOpacity
                                            onPress={() => openPicker(dIdx, sIdx, 'start')}
                                            style={tw`flex-1 bg-slate-100 p-3 rounded-xl flex-row justify-center items-center`}
                                        >
                                            <Clock size={14} color="#64748B" />
                                            <Text style={tw`ml-2 font-semibold text-slate-700`}>{slot.start}</Text>
                                        </TouchableOpacity>

                                        <Text style={tw`mx-3 text-slate-400 font-bold`}>→</Text>

                                        <TouchableOpacity
                                            onPress={() => openPicker(dIdx, sIdx, 'end')}
                                            style={tw`flex-1 bg-slate-100 p-3 rounded-xl flex-row justify-center items-center`}
                                        >
                                            <Clock size={14} color="#64748B" />
                                            <Text style={tw`ml-2 font-semibold text-slate-700`}>{slot.end}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => removeSlot(dIdx, sIdx)} style={tw`ml-3 p-2`}>
                                            <Trash2 size={20} color="#F87171" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    onPress={() => addSlot(dIdx)}
                                    style={tw`flex-row items-center justify-center border border-dashed border-blue-300 p-3 rounded-xl mt-2`}
                                >
                                    <Plus size={18} color="#2563EB" />
                                    <Text style={tw`text-blue-600 font-bold ml-2`}>Thêm khung giờ</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Picker Component */}
            {/* Picker Component logic */}
            {Platform.OS === 'ios' ? (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={showPicker && pickerConfig.dayIdx !== null}
                    onRequestClose={cancelIOSPicker}
                >
                    <TouchableOpacity 
                        style={tw`flex-1 justify-end bg-black bg-opacity-40`} 
                        activeOpacity={1} 
                        onPress={cancelIOSPicker}
                    >
                        <View style={tw`bg-white rounded-t-3xl pb-8`} onStartShouldSetResponder={() => true}>
                            {/* Toolbar */}
                            <View style={tw`flex-row justify-between items-center p-4 border-b border-slate-100`}>
                                <TouchableOpacity onPress={cancelIOSPicker} style={tw`p-2`}>
                                    <Text style={tw`text-slate-500 font-medium`}>Hủy</Text>
                                </TouchableOpacity>
                                <Text style={tw`font-bold text-slate-800`}>Chọn giờ</Text>
                                <TouchableOpacity onPress={confirmIOSPicker} style={tw`p-2`}>
                                    <Text style={tw`text-blue-600 font-bold`}>Lưu</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Picker */}
                            <DateTimePicker
                                value={tempDate}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
                                onChange={onTimeChange}
                                textColor="black"
                                style={tw`h-48`}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            ) : (
                showPicker && pickerConfig.dayIdx !== null && (
                    <DateTimePicker
                        value={tempDate} // Use tempDate here too for Android initial value
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onTimeChange}
                    />
                )
            )}

            {/* Bottom Action */}
            <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100`}>
                <TouchableOpacity
                    onPress={handleSave}
                    style={tw`bg-blue-600 p-4 rounded-2xl items-center shadow-lg shadow-blue-300`}
                >
                    <Text style={tw`text-white font-bold text-lg`}>Cập nhật lịch rảnh</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}