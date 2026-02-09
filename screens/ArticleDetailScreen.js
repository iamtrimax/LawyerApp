import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    Linking,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, User, Clock, Share2, Tag, Paperclip, FileText, ExternalLink, Trash2, Edit, Lock } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import moment from 'moment';
import { useAuth } from '../contextAPI/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import summaryAPI from '../common';
import { useFocusEffect } from '@react-navigation/native';

export default function ArticleDetailScreen({ navigation, route }) {
    const { article: initialArticle } = route.params;
    const [article, setArticle] = useState(initialArticle);
    const { user, isAuthenticated } = useAuth();
    const [deleting, setDeleting] = React.useState(false);
    const [webViewHeight, setWebViewHeight] = React.useState(100);
    const [loading, setLoading] = useState(false);

    const isAuthor = isAuthenticated && user && article?.author?.userID?._id === user._id;

    const fetchArticleDetail = async () => {
        if (!article?._id) return;
        setLoading(true);
        try {
            const response = await fetch(summaryAPI.getArticleDetail.url.replace(':id', article._id));
            const data = await response.json();
            if (data.success) {
                // Correct mapping: data.data is the article object itself
                setArticle(data.data);
            }
        } catch (error) {
            console.error("Fetch Article Detail Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchArticleDetail();
        }, [])
    );

    const openLink = (url) => {
        Linking.openURL(url);
    };

    const onMessage = (event) => {
        const height = Number(event.nativeEvent.data);
        if (height) setWebViewHeight(height);
    };

    const handleEdit = () => {
        navigation.navigate('CreateArticle', { article });
    };

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận xoá",
            "Bạn có chắc chắn muốn xoá bài viết này không?",
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Xoá",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            const token = await AsyncStorage.getItem("@AuthToken");
                            const response = await fetch(summaryAPI.deleteArticle.url.replace(':id', article._id), {
                                method: summaryAPI.deleteArticle.method,
                                headers: {
                                    "Authorization": `Bearer ${token}`
                                }
                            });
                            const data = await response.json();
                            if (data.success) {
                                Alert.alert("Thành công", "Bài viết đã được xoá.");
                                navigation.goBack();
                            } else {
                                Alert.alert("Lỗi", data.message || "Không thể xoá bài viết.");
                            }
                        } catch (error) {
                            console.error("Delete Article Error:", error);
                            Alert.alert("Lỗi", "Có lỗi xảy ra khi xoá bài viết.");
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const htmlContent = useMemo(() => {
        if (!article || !article.content) return '';

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
                h2 { color: #1e293b; margin-top: 25px; border-left: 4px solid #2563EB; padding-left: 10px; font-size: 1.4em; }
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
                ${article.content}
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
    }, [article?.content]);

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`px-4 py-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={tw`flex-row items-center`}>
                    {isAuthor && (
                        <>
                            <TouchableOpacity onPress={handleEdit} style={tw`p-2 mr-1`}>
                                <Edit size={22} color="#2563EB" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} disabled={deleting} style={tw`p-2 mr-1`}>
                                {deleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={22} color="#EF4444" />}
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity style={tw`p-2`}>
                        <Share2 size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`pb-10`}>
                {article?.thumbnail ? (
                    <Image source={{ uri: article.thumbnail }} style={tw`w-full h-60`} resizeMode="cover" />
                ) : null}

                <View style={tw`p-6`}>
                    <View style={tw`bg-blue-100 self-start px-3 py-1 rounded-full mb-4`}>
                        <Text style={tw`text-blue-700 text-xs font-bold uppercase`}>{article?.category || 'Chưa phân loại'}</Text>
                    </View>

                    <Text style={tw`text-2xl font-bold text-slate-800 mb-6`}>{article?.title || 'Không có tiêu đề'}</Text>

                    <View style={tw`flex-row items-center mb-8 border-b border-slate-50 pb-6`}>
                        <View style={tw`w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3`}>
                            {article?.author?.avatar ? (
                                <Image source={{ uri: article.author.avatar }} style={tw`w-full h-full rounded-full`} />
                            ) : (
                                <User size={20} color="#64748B" />
                            )}
                        </View>
                        <View>
                            <Text style={tw`font-bold text-slate-800`}>{article?.author?.userID?.fullname || "Luật sư"}</Text>
                            <View style={tw`flex-row items-center`}>
                                <Clock size={12} color="#94A3B8" />
                                <Text style={tw`text-slate-400 text-xs ml-1`}>
                                    {article?.createdAt ? moment(article.createdAt).format('DD [tháng] MM, YYYY') : ''}
                                </Text>
                            </View>
                        </View>
                    </View>

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

                    {article?.attachments && article.attachments.length > 0 ? (
                        <View style={tw`mt-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-4`}>
                                <Paperclip size={20} color="#2563EB" />
                                <Text style={tw`ml-2 font-bold text-slate-800`}>Tài liệu đính kèm</Text>
                            </View>

                            {article.attachments.map((doc, idx) => {
                                const isMemberOrLawyer = user?.role === 'member' || user?.role === 'partner_lawyer';

                                const handleAttachmentPress = () => {
                                    if (!isMemberOrLawyer) {
                                        Alert.alert(
                                            "Thông báo",
                                            "Tài liệu này chỉ dành riêng cho tài khoản Thành viên.",
                                            [{ text: "Đóng", style: "cancel" }]
                                        );
                                        return;
                                    }
                                    if (doc?.url) openLink(doc.url);
                                };

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={handleAttachmentPress}
                                        style={tw`flex-row items-center justify-between py-3 ${idx !== article.attachments.length - 1 ? 'border-b border-slate-200' : ''}`}
                                    >
                                        <View style={tw`flex-row items-center flex-1 mr-4`}>
                                            <View style={tw`bg-white p-2 rounded-xl border border-slate-100`}>
                                                <FileText size={20} color={isMemberOrLawyer ? "#2563EB" : "#94A3B8"} />
                                            </View>
                                            <View style={tw`ml-3 flex-1`}>
                                                <Text style={tw`text-slate-700 text-sm font-medium`} numberOfLines={1}>
                                                    {doc?.name || `Tài liệu ${idx + 1}`}
                                                </Text>
                                                {!isMemberOrLawyer && (
                                                    <View style={tw`flex-row items-center mt-0.5`}>
                                                        <Lock size={10} color="#94A3B8" />
                                                        <Text style={tw`text-[10px] text-slate-400 font-bold uppercase ml-1`}>Dành cho Thành viên</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        {isMemberOrLawyer ? (
                                            <ExternalLink size={16} color="#94A3B8" />
                                        ) : (
                                            <Lock size={16} color="#94A3B8" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
