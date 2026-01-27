import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
    ArrowLeft,
    Image as ImageIcon,
    X,
    Send,
    Tag,
    Type,
    FileText,
    Paperclip
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import summaryAPI from '../common';

export default function CreateArticleScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [thumbnail, setThumbnail] = useState(null);
    const [images, setImages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [selection, setSelection] = useState({ start: 0, end: 0 });

    const categories = ['Dân sự', 'Hình sự', 'Đất đai', 'Hôn nhân', 'Lao động', 'Kinh doanh', 'Khác'];

    const pickThumbnail = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                setThumbnail(result.assets[0]);
            }
        } catch (error) {
            console.error("Error picking thumbnail:", error);
        }
    };

    const pickImages = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                multiple: true,
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                let newContent = content;
                const newImageUrls = [];
                for (const asset of result.assets) {
                    const url = await uploadToCloudinary(asset);
                    if (url) {
                        newContent += `\n<img src="${url}" />\n`;
                        newImageUrls.push(url);
                    }
                }
                setContent(newContent);
                setImages(prev => [...prev, ...newImageUrls]);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error picking images:", error);
            setLoading(false);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const pickAttachments = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
                multiple: true,
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                setAttachments(prev => [...prev, ...result.assets].slice(0, 5));
            }
        } catch (error) {
            console.error("Error picking attachments:", error);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const uploadToCloudinary = async (asset, isRaw = false) => {
        const cloudName = process.env.EXPO_PUBLIC_CLOUD_NAME;
        const data = new FormData();
        data.append("file", {
            uri: asset.uri,
            type: asset.mimeType || (isRaw ? "application/octet-stream" : "image/jpeg"),
            name: asset.name || `article_file_${Date.now()}`,
        });
        data.append("upload_preset", "lawyerPicture");
        data.append("cloud_name", cloudName);

        const resourceType = isRaw ? 'raw' : 'image';

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                { method: "POST", body: data }
            );
            const result = await response.json();
            return result.secure_url;
        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            return null;
        }
    };

    const handlePublish = async () => {
        if (!title.trim() || !content.trim() || !category) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc.");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("@AuthToken");

            // Upload images first
            let uploadedThumbnail = "";
            if (thumbnail) {
                uploadedThumbnail = await uploadToCloudinary(thumbnail);
            }

            // Upload attachments
            const uploadedArticlesImages = [];
            for (const img of images) {
                // images state might contain URLs if already uploaded during inline insert
                if (typeof img === 'string') {
                    uploadedArticlesImages.push(img);
                } else {
                    const url = await uploadToCloudinary(img);
                    if (url) uploadedArticlesImages.push(url);
                }
            }

            const uploadedAttachments = [];
            for (const doc of attachments) {
                const url = await uploadToCloudinary(doc, true);
                if (url) uploadedAttachments.push({
                    name: doc.name,
                    url: url
                });
            }

            const response = await fetch(summaryAPI.createArticle.url, {
                method: summaryAPI.createArticle.method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content,
                    category,
                    thumbnail: uploadedThumbnail,
                    images: uploadedArticlesImages,
                    attachments: uploadedAttachments,
                    status: 'Published'
                })
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert("Thành công", "Bài viết của bạn đã được đăng!");
                navigation.goBack();
            } else {
                Alert.alert("Lỗi", data.message || "Không thể đăng bài viết.");
            }
        } catch (error) {
            console.error("Create Article Error:", error);
            Alert.alert("Lỗi", "Có lỗi xảy ra, vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    const insertTag = (tagOpen, tagClose = '') => {
        const { start, end } = selection;
        const selectedText = content.substring(start, end);
        const before = content.substring(0, start);
        const after = content.substring(end);

        const newText = `${before}${tagOpen}${selectedText}${tagClose}${after}`;
        setContent(newText);

        // Adjust cursor position (optional but helpful)
        const newCursorPos = start + tagOpen.length + selectedText.length + tagClose.length;
        // setSelection({ start: newCursorPos, end: newCursorPos }); // Note: selection state might not update UI cursor immediately
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`px-4 pt-6 pb-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Đăng bài viết</Text>
                </View>
                <TouchableOpacity
                    onPress={handlePublish}
                    disabled={loading}
                    style={tw`bg-blue-600 px-4 py-2 rounded-xl flex-row items-center`}
                >
                    {loading ? <ActivityIndicator color="white" size="small" /> : (
                        <>
                            <Send size={16} color="white" />
                            <Text style={tw`text-white font-bold ml-2`}>Đăng</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
                    {/* Title Input */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <Type size={18} color="#2563EB" />
                            <Text style={tw`ml-2 font-bold text-slate-700`}>Tiêu đề bài viết *</Text>
                        </View>
                        <TextInput
                            style={tw`bg-slate-50 rounded-2xl p-4 text-slate-800 border border-slate-100 text-lg`}
                            placeholder="Nhập tiêu đề hấp dẫn..."
                            value={title}
                            onChangeText={setTitle}
                            multiline
                        />
                    </View>

                    {/* Category Selection */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <Tag size={18} color="#2563EB" />
                            <Text style={tw`ml-2 font-bold text-slate-700`}>Chuyên mục *</Text>
                        </View>
                        <View style={tw`flex-row flex-wrap`}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    style={tw`mr-2 mb-2 px-4 py-2 rounded-full ${category === cat ? 'bg-blue-600' : 'bg-slate-50 border border-slate-100'}`}
                                >
                                    <Text style={tw`${category === cat ? 'text-white' : 'text-slate-500'} font-medium`}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Thumbnail Selection */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center mb-2`}>
                            <ImageIcon size={18} color="#2563EB" />
                            <Text style={tw`ml-2 font-bold text-slate-700`}>Ảnh đại diện</Text>
                        </View>
                        <TouchableOpacity
                            onPress={pickThumbnail}
                            style={tw`bg-slate-50 rounded-2xl h-40 border-2 border-dashed border-slate-200 items-center justify-center overflow-hidden`}
                        >
                            {thumbnail ? (
                                <Image source={{ uri: thumbnail.uri }} style={tw`w-full h-full`} resizeMode="cover" />
                            ) : (
                                <>
                                    <ImageIcon size={32} color="#94A3B8" />
                                    <Text style={tw`text-slate-400 mt-2`}>Chọn ảnh làm bìa bài viết</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Content Input */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                            <View style={tw`flex-row items-center`}>
                                <FileText size={18} color="#2563EB" />
                                <Text style={tw`ml-2 font-bold text-slate-700`}>Nội dung *</Text>
                            </View>
                            <TouchableOpacity
                                onPress={pickImages}
                                style={tw`flex-row items-center bg-slate-100 px-3 py-1.5 rounded-lg`}
                            >
                                <ImageIcon size={16} color="#64748B" />
                                <Text style={tw`text-slate-600 font-bold ml-1.5 text-xs`}>Chèn ảnh</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Formatting Toolbar */}
                        <View style={tw`flex-row flex-wrap bg-slate-100 p-2 rounded-t-2xl border-x border-t border-slate-200`}>
                            <TouchableOpacity onPress={() => insertTag('<b>', '</b>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`font-bold text-slate-700 px-1`}>B</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => insertTag('<i>', '</i>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`italic text-slate-700 px-1`}>I</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => insertTag('<u>', '</u>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`underline text-slate-700 px-1`}>U</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => insertTag('<h2>', '</h2>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`font-bold text-slate-700 text-xs`}>H2</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => insertTag('<h3>', '</h3>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`font-bold text-slate-700 text-xs`}>H3</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => insertTag('<li>', '</li>')} style={tw`p-2 mr-1 bg-white rounded-lg border border-slate-200`}>
                                <Text style={tw`text-slate-700 text-xs`}>• List</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={tw`bg-slate-50 rounded-b-2xl p-4 text-slate-800 border border-slate-200 min-h-60 text-base`}
                            placeholder="Chia sẻ kiến thức pháp luật của bạn tại đây..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                            onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
                        />
                    </View>

                    {/* Attachments */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                            <View style={tw`flex-row items-center`}>
                                <Paperclip size={18} color="#2563EB" />
                                <Text style={tw`ml-2 font-bold text-slate-700`}>Tài liệu đính kèm (PDF, DOCX)</Text>
                            </View>
                            <TouchableOpacity
                                onPress={pickAttachments}
                                style={tw`bg-slate-100 px-3 py-1.5 rounded-lg`}
                            >
                                <Text style={tw`text-slate-600 font-bold text-xs`}>Thêm tệp</Text>
                            </TouchableOpacity>
                        </View>

                        {attachments.length > 0 && (
                            <View style={tw`bg-slate-50 rounded-2xl p-3 border border-slate-100`}>
                                {attachments.map((doc, idx) => (
                                    <View key={idx} style={tw`flex-row items-center justify-between py-2 ${idx !== attachments.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                        <View style={tw`flex-row items-center flex-1 mr-2`}>
                                            <FileText size={16} color="#64748B" />
                                            <Text style={tw`text-slate-600 text-sm ml-2`} numberOfLines={1}>{doc.name}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeAttachment(idx)}>
                                            <X size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                        {attachments.length === 0 && (
                            <Text style={tw`text-slate-400 text-xs ml-1`}>Chưa có tài liệu đính kèm</Text>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const Plus = ({ size, color }) => (
    <View style={tw`items-center justify-center`}>
        <X size={size} color={color} style={{ transform: [{ rotate: '45deg' }] }} />
    </View>
);
