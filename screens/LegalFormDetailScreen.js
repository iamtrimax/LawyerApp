import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Linking,
    ActivityIndicator,
    Alert,
    Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';
import {
    ArrowLeft,
    Download,
    Share2,
    FileText,
    Clock,
    User,
    Info,
    CheckCircle2,
    BookOpen,
    Trash2,
    Edit,
    Lock
} from 'lucide-react-native';
import moment from 'moment';
import summaryAPI from '../common';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contextAPI/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LegalFormDetailScreen({ navigation, route }) {
    const { form: initialForm } = route.params;
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [webViewHeight, setWebViewHeight] = useState(100);
    const { user } = useAuth();
    const isOwner = user?.role === 'lawyer' && user?._id === form?.lawyerID?.userID?._id

    const fetchFormDetail = async () => {
        if (!form?._id) return;
        setLoading(true);
        try {
            const response = await fetch(summaryAPI.getLegalFormDetail.url.replace(':id', form._id));
            const data = await response.json();
            if (data.success) {
                setForm(data.data);
            }
        } catch (error) {
            console.error("Fetch Legal Form Detail Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFormDetail();
        }, []),
        console.log("user", user),
        console.log("form", form),
        console.log("isOwner", isOwner)
    );

    const isMemberOrLawyer = user?.role === 'member' || user?.role === 'partner_lawyer';

    const handleDownload = () => {
        if (!isMemberOrLawyer) {
            Alert.alert(
                "Thông báo",
                "Tài liệu này chỉ dành riêng cho tài khoản Thành viên.",
                [{ text: "Đóng", style: "cancel" }]
            );
            return;
        }

        if (form?.fileUrl) {
            Linking.openURL(form.fileUrl).catch(err => {
                console.error("Link Error:", err);
                Alert.alert("Error", "Could not open the file link.");
            });
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this legal form: ${form.name}\n${form.fileUrl || ''}`,
                title: form.name
            });
        } catch (error) {
            console.error("Share Error:", error);
        }
    };

    const onMessage = (event) => {
        const height = Number(event.nativeEvent.data);
        if (height) setWebViewHeight(height);
    };

    const htmlContent = useMemo(() => {
        if (!form || !form.description) return '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #334155; padding: 0; margin: 0; overflow: hidden; }
                img { max-width: 100%; height: auto; border-radius: 12px; margin-top: 15px; margin-bottom: 15px; display: block; }
                p { margin-bottom: 15px; }
                p:last-child { margin-bottom: 0; }
                h2 { color: #1e293b; margin-top: 25px; border-left: 4px solid #6366F1; padding-left: 10px; font-size: 1.4em; }
                h2:last-child { margin-bottom: 0; }
                h3 { color: #1e293b; margin-top: 20px; font-size: 1.2em; }
                h3:last-child { margin-bottom: 0; }
                b { color: #0f172a; }
                ul { padding-left: 20px; margin-bottom: 15px; }
                ul:last-child { margin-bottom: 0; }
                li { margin-bottom: 5px; }
                #content-wrapper { padding: 10px; }
            </style>
        </head>
        <body>
            <div id="content-wrapper">
                ${form.description}
            </div>
            <script>
                function sendHeight() {
                    const wrapper = document.getElementById('content-wrapper');
                    if (wrapper) {
                        const height = wrapper.offsetHeight;
                        window.ReactNativeWebView.postMessage(height);
                    }
                }

                window.onload = function() {
                    sendHeight();
                    let interval = setInterval(sendHeight, 250);
                    setTimeout(() => clearInterval(interval), 5000);
                };

                document.querySelectorAll('img').forEach(img => {
                    img.addEventListener('load', sendHeight);
                });

                const observer = new MutationObserver(sendHeight);
                observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            </script>
        </body>
        </html>
        `;
    }, [form?.description]);

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa biểu mẫu này không?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('@AuthToken');
                            const response = await fetch(summaryAPI.deleteLegalForm.url.replace(':id', form._id), {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await response.json();
                            if (data.success) {
                                Alert.alert("Thành công", "Biểu mẫu đã được xóa.");
                                navigation.goBack();
                            }
                        } catch (error) {
                            Alert.alert("Lỗi", "Không thể xóa biểu mẫu.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {/* Header */}
            <View style={tw`px-4 py-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={handleShare} style={tw`p-2 mr-2`}>
                        <Share2 size={24} color="#64748B" />
                    </TouchableOpacity>
                    {isOwner && (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CreateLegalForm', { form })}
                                style={tw`p-2 mr-2`}
                            >
                                <Edit size={22} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={tw`p-2`}>
                                <Trash2 size={22} color="#EF4444" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`pb-10`}>
                {/* Visual Header / Thumbnail */}
                <View style={tw`bg-indigo-50 w-full h-48 items-center justify-center`}>
                    {form.thumbnail ? (
                        <Image source={{ uri: form.thumbnail }} style={tw`w-full h-full`} resizeMode="cover" />
                    ) : (
                        <View style={tw`items-center`}>
                            <FileText size={80} color="#6366F1" />
                            <Text style={tw`text-indigo-400 font-bold mt-2`}>{form.fileType || 'DOCUMENT'}</Text>
                        </View>
                    )}
                </View>

                <View style={tw`p-6`}>
                    {/* Category Tag */}
                    <View style={tw`bg-indigo-100 self-start px-3 py-1 rounded-full mb-4`}>
                        <Text style={tw`text-indigo-700 text-xs font-bold uppercase`}>{form.category}</Text>
                    </View>

                    <Text style={tw`text-2xl font-bold text-slate-800 mb-4`}>{form.name}</Text>

                    {/* Stats Row */}
                    <View style={tw`flex-row items-center mb-6`}>
                        <View style={tw`flex-row items-center bg-slate-50 px-3 py-1.5 rounded-xl mr-4`}>
                            <Clock size={16} color="#64748B" />
                            <Text style={tw`text-slate-500 text-xs ml-2`}>
                                {moment(form.createdAt).format('DD/MM/YYYY')}
                            </Text>
                        </View>
                        <View style={tw`flex-row items-center bg-slate-50 px-3 py-1.5 rounded-xl`}>
                            <Download size={16} color="#64748B" />
                            <Text style={tw`text-slate-500 text-xs ml-2`}>
                                {form.downloadCount || 0} downloads
                            </Text>
                        </View>
                    </View>

                    {/* Description Section */}
                    <View style={tw`mb-8`}>
                        <View style={tw`flex-row items-center mb-3`}>
                            <Info size={18} color="#6366F1" />
                            <Text style={tw`text-lg font-bold text-slate-800 ml-2`}>Mô tả chi tiết</Text>
                        </View>
                        {form.description ? (
                            <View style={{ height: webViewHeight, overflow: 'hidden' }}>
                                <WebView
                                    originWhitelist={['*']}
                                    source={{ html: htmlContent }}
                                    style={tw`flex-1 bg-transparent`}
                                    scrollEnabled={false}
                                    onMessage={onMessage}
                                    javaScriptEnabled={true}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        ) : (
                            <Text style={tw`text-slate-600 leading-6 text-base`}>
                                Chưa có mô tả chi tiết cho biểu mẫu này.
                            </Text>
                        )}
                    </View>

                    {/* Features List */}
                    <View style={tw`mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-100`}>
                        <Text style={tw`font-bold text-slate-800 mb-4`}>Thông tin biểu mẫu</Text>
                        <View style={tw`flex-row items-center mb-3`}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <Text style={tw`text-slate-600 text-sm ml-2`}>Định dạng {form.fileType || 'DOCX'}</Text>
                        </View>
                        <View style={tw`flex-row items-center mb-3`}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <Text style={tw`text-slate-600 text-sm ml-2`}>Dễ dàng chỉnh sửa</Text>
                        </View>
                        <View style={tw`flex-row items-center`}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <Text style={tw`text-slate-600 text-sm ml-2`}>{form.isFree ? "Tải xuống hoàn toàn miễn phí" : "Biểu mẫu Premium"}</Text>
                        </View>
                    </View>

                    {/* Lawyer Recommendation (If exists) */}
                    {form.lawyerID && (
                        <View style={tw`mb-8 p-4 border border-indigo-100 rounded-3xl bg-indigo-50/30`}>
                            <View style={tw`flex-row items-center mb-3`}>
                                <User size={18} color="#6366F1" />
                                <Text style={tw`font-bold text-slate-800 ml-2`}>Người đăng tải</Text>
                            </View>
                            <Text style={tw`text-indigo-900 font-medium`}>
                                {form.lawyerID?.name ? `Luật sư: ${form.lawyerID.name}` : "Biểu mẫu được cung cấp bởi đối tác Luật sư uy tín."}
                            </Text>
                        </View>
                    )}

                    {/* Attachment Section */}
                    <View style={tw`mb-8`}>
                        <Text style={tw`font-bold text-slate-800 mb-4`}>Tài liệu đính kèm</Text>
                        <TouchableOpacity
                            onPress={handleDownload}
                            style={tw`flex-row items-center bg-slate-50 p-4 rounded-2xl border border-slate-200`}
                        >
                            <View style={tw`bg-indigo-100 p-2 rounded-lg`}>
                                <FileText size={20} color={isMemberOrLawyer ? "#4F46E5" : "#94A3B8"} />
                            </View>
                            <View style={tw`ml-3 flex-1`}>
                                <Text style={tw`text-slate-800 font-medium mb-1`} numberOfLines={1}>{form.name}</Text>
                                <View style={tw`flex-row items-center`}>
                                    <Text style={tw`text-slate-500 text-xs`}>Định dạng {form.fileType || 'DOCX'}</Text>
                                    {!isMemberOrLawyer && (
                                        <View style={tw`flex-row items-center ml-2`}>
                                            <View style={tw`w-1 h-1 rounded-full bg-slate-300 mx-1`} />
                                            <Lock size={10} color="#94A3B8" />
                                            <Text style={tw`text-[10px] text-slate-400 font-bold uppercase ml-1`}>Member Only</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {isMemberOrLawyer ? (
                                <Download size={20} color="#64748B" />
                            ) : (
                                <Lock size={20} color="#94A3B8" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={tw`p-6 border-t border-slate-100 bg-white`}>
                <TouchableOpacity
                    onPress={handleDownload}
                    style={[
                        tw`py-4 rounded-2xl flex-row items-center justify-center shadow-lg`,
                        isMemberOrLawyer ? tw`bg-indigo-600` : tw`bg-slate-400`
                    ]}
                >
                    {isMemberOrLawyer ? (
                        <Download size={22} color="white" />
                    ) : (
                        <Lock size={22} color="white" />
                    )}
                    <Text style={tw`text-white font-bold text-lg ml-3`}>
                        {isMemberOrLawyer ? (form.isFree ? "Tải xuống ngay" : "Tải biểu mẫu") : "Dành cho Thành viên"}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !form.name && (
                <View style={tw`absolute inset-0 bg-white items-center justify-center`}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            )}
        </SafeAreaView>
    );
}
