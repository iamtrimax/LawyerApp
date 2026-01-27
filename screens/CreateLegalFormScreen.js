import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
    ArrowLeft,
    Upload,
    FileText,
    Image as ImageIcon,
    X,
    CheckCircle2
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import summaryAPI from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateLegalFormScreen({ route }) {
    const navigation = useNavigation();
    const editingForm = route.params?.form;

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState({ file: false, thumb: false });

    const [name, setName] = useState(editingForm?.name || '');
    const [description, setDescription] = useState(editingForm?.description || '');
    const [category, setCategory] = useState(editingForm?.category || 'Civil');
    const [isFree, setIsFree] = useState(editingForm?.isFree !== undefined ? editingForm.isFree : true);

    const [fileUrl, setFileUrl] = useState(editingForm?.fileUrl || '');
    const [fileType, setFileType] = useState(editingForm?.fileType || '');
    const [thumbnail, setThumbnail] = useState(editingForm?.thumbnail || '');

    const categories = ['Civil', 'Criminal', 'Business', 'Labor', 'Family', 'Other'];
    const cloudName = process.env.EXPO_PUBLIC_CLOUD_NAME;

    const uploadToCloudinary = async (uri, resourceType = 'auto') => {
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('file', {
            uri: uri,
            name: filename,
            type: resourceType === 'image' ? type : 'application/octet-stream',
        });
        formData.append('upload_preset', 'lawyerPicture'); // Matches BookingScreen.js
        formData.append('cloud_name', cloudName);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            throw error;
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ],
            });

            if (!result.canceled) {
                setUploading({ ...uploading, file: true });
                const uri = result.assets[0].uri;
                const ext = uri.split('.').pop().toUpperCase();
                const url = await uploadToCloudinary(uri, 'raw');
                setFileUrl(url);
                setFileType(ext);
                setUploading({ ...uploading, file: false });
            }
        } catch (error) {
            setUploading({ ...uploading, file: false });
            console.error("Document Picker/Upload Error:", error);
            Alert.alert("Lỗi", `Không thể tải tài liệu: ${error.message || "Lỗi không xác định"}`);
        }
    };

    const pickThumbnail = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled) {
                setUploading({ ...uploading, thumb: true });
                const url = await uploadToCloudinary(result.assets[0].uri, 'image');
                setThumbnail(url);
                setUploading({ ...uploading, thumb: false });
            }
        } catch (error) {
            setUploading({ ...uploading, thumb: false });
            console.error("Thumbnail Picker/Upload Error:", error);
            Alert.alert("Lỗi", `Không thể tải ảnh minh họa: ${error.message || "Lỗi không xác định"}`);
        }
    };

    const handleSubmit = async () => {
        if (!name || !category || !fileUrl) {
            Alert.alert("Error", "Please fill in all required fields (Name, Category, Document).");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('@AuthToken');
            const url = editingForm
                ? summaryAPI.updateLegalForm.url.replace(':id', editingForm._id)
                : summaryAPI.createLegalForm.url;

            const method = editingForm ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    category,
                    isFree,
                    fileUrl,
                    fileType,
                    thumbnail
                }),
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("Success", editingForm ? "Form updated successfully!" : "Form created successfully!");
                navigation.goBack();
            } else {
                Alert.alert("Error", data.message || "Failed to save form.");
            }
        } catch (error) {
            console.error("Save Form Error:", error);
            Alert.alert("Error", "An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {/* Header */}
            <View style={tw`bg-white pt-4 pb-4 px-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>
                        {editingForm ? 'Sửa biểu mẫu' : 'Thêm biểu mẫu mới'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                        <Text style={tw`text-indigo-600 font-bold text-lg`}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={tw`flex-1 px-6 pt-6`}>
                {/* Name Input */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-700 font-bold mb-2`}>Tên biểu mẫu *</Text>
                    <TextInput
                        style={tw`bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800`}
                        placeholder="Nhập tên biểu mẫu..."
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Category Selection */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-700 font-bold mb-2`}>Danh mục *</Text>
                    <View style={tw`flex-row flex-wrap`}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setCategory(cat)}
                                style={tw`mr-2 mb-2 px-6 py-2 rounded-full ${category === cat ? 'bg-indigo-600' : 'bg-slate-100'}`}
                            >
                                <Text style={tw`${category === cat ? 'text-white' : 'text-slate-500'} font-medium`}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Description */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-700 font-bold mb-2`}>Mô tả</Text>
                    <TextInput
                        style={tw`bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 h-32`}
                        placeholder="Mô tả ngắn về biểu mẫu..."
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                        textAlignVertical="top"
                    />
                </View>

                {/* File Upload Section */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-700 font-bold mb-2`}>Tài liệu (PDF/DOCX) *</Text>
                    {fileUrl ? (
                        <View style={tw`flex-row items-center bg-green-50 p-4 rounded-2xl border border-green-200`}>
                            <FileText size={24} color="#10B981" />
                            <Text style={tw`ml-3 flex-1 text-green-800 text-sm`} numberOfLines={1}>{fileUrl}</Text>
                            <TouchableOpacity onPress={() => setFileUrl('')}>
                                <X size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={pickDocument}
                            disabled={uploading.file}
                            style={tw`border-2 border-dashed border-slate-200 p-8 rounded-3xl items-center bg-slate-50`}
                        >
                            {uploading.file ? (
                                <ActivityIndicator color="#4F46E5" />
                            ) : (
                                <>
                                    <Upload size={32} color="#64748B" />
                                    <Text style={tw`text-slate-500 mt-2 font-medium`}>Tải lên tài liệu</Text>
                                    <Text style={tw`text-slate-400 text-xs mt-1`}>Chấp nhận PDF, DOCX</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Thumbnail Section */}
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-700 font-bold mb-2`}>Ảnh minh họa (Tùy chọn)</Text>
                    {thumbnail ? (
                        <View style={tw`relative rounded-2xl overflow-hidden`}>
                            <Image source={{ uri: thumbnail }} style={tw`w-full h-40`} resizeMode="cover" />
                            <TouchableOpacity
                                onPress={() => setThumbnail('')}
                                style={tw`absolute top-2 right-2 bg-white/80 p-1.5 rounded-full`}
                            >
                                <X size={16} color="#334155" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={pickThumbnail}
                            disabled={uploading.thumb}
                            style={tw`border-2 border-dashed border-slate-200 p-8 rounded-3xl items-center bg-slate-50`}
                        >
                            {uploading.thumb ? (
                                <ActivityIndicator color="#4F46E5" />
                            ) : (
                                <>
                                    <ImageIcon size={32} color="#64748B" />
                                    <Text style={tw`text-slate-500 mt-2 font-medium`}>Chọn ảnh minh họa</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Free/Paid Switch */}
                <View style={tw`flex-row items-center justify-between mb-10 bg-slate-50 p-4 rounded-2xl border border-slate-100`}>
                    <View>
                        <Text style={tw`text-slate-800 font-bold`}>Miễn phí</Text>
                        <Text style={tw`text-slate-500 text-xs`}>Bật nếu cho phép người dùng tải tự do</Text>
                    </View>
                    <Switch
                        value={isFree}
                        onValueChange={setIsFree}
                        trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
                        thumbColor={isFree ? '#4F46E5' : '#94A3B8'}
                    />
                </View>

                <View style={tw`h-20`} />
            </ScrollView>
        </SafeAreaView>
    );
}
