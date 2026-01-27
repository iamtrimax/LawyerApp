import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Linking,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ArrowLeft, Clock, Share2, Paperclip, FileText, ExternalLink, Globe } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import moment from 'moment';
import summaryAPI from '../common';
import { useFocusEffect } from '@react-navigation/native';

export default function LegalResourceDetailScreen({ navigation, route }) {
    const { resource: initialResource } = route.params;
    const [resource, setResource] = useState(initialResource);
    const [webViewHeight, setWebViewHeight] = useState(100);
    const [loading, setLoading] = useState(false);

    const fetchResourceDetail = async () => {
        if (!resource?._id) return;
        setLoading(true);
        try {
            const response = await fetch(summaryAPI.getLegalResourceDetail.url.replace(':id', resource._id));
            const data = await response.json();
            if (data.success) {
                setResource(data.data);
            }
        } catch (error) {
            console.error("Fetch Legal Resource Detail Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchResourceDetail();
        }, [])
    );

    const openLink = (url) => {
        Linking.openURL(url);
    };

    const onMessage = (event) => {
        const height = Number(event.nativeEvent.data);
        if (height) setWebViewHeight(height);
    };

    const htmlContent = useMemo(() => {
        if (!resource || !resource.content) return '';

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
                h2 { color: #1e293b; margin-top: 25px; border-left: 4px solid #4F46E5; padding-left: 10px; font-size: 1.4em; }
                h3 { color: #1e293b; margin-top: 20px; font-size: 1.2em; }
                b { color: #0f172a; }
                ul { padding-left: 20px; margin-bottom: 15px; }
                li { margin-bottom: 5px; }
                #content-wrapper { padding: 10px; }
                pre { background: #f1f5f9; padding: 10px; border-radius: 8px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <div id="content-wrapper">
                ${resource.content}
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
    }, [resource?.content]);

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`px-4 py-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <TouchableOpacity style={tw`p-2`}>
                    <Share2 size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`pb-10`}>
                {resource?.thumbnail ? (
                    <Image source={{ uri: resource.thumbnail }} style={tw`w-full h-60`} resizeMode="cover" />
                ) : null}

                <View style={tw`p-6`}>
                    <View style={tw`bg-indigo-100 self-start px-3 py-1 rounded-full mb-4 flex-row items-center`}>
                        <Globe size={12} color="#4F46E5" style={tw`mr-1`} />
                        <Text style={tw`text-indigo-700 text-xs font-bold uppercase`}>{resource?.category || 'General'}</Text>
                    </View>

                    <Text style={tw`text-2xl font-bold text-slate-800 mb-4`}>{resource?.title || 'No Title'}</Text>

                    <View style={tw`flex-row items-center mb-8 border-b border-slate-50 pb-6`}>
                        <View style={tw`bg-slate-100 px-3 py-1 rounded-full flex-row items-center`}>
                            <Clock size={12} color="#94A3B8" />
                            <Text style={tw`text-slate-500 text-xs ml-1`}>
                                {resource?.publishedDate ? moment(resource.publishedDate).format('MMMM DD, YYYY') : moment(resource?.createdAt).format('MMMM DD, YYYY')}
                            </Text>
                        </View>
                        <Text style={tw`text-slate-400 text-xs ml-4`}>Source: External</Text>
                    </View>
                    {resource?.description ? (
                        <Text style={tw`text-slate-500 text-base mb-6 italic`}>{resource.description}</Text>
                    ) : null}


                    {loading && !resource?.content ? (
                        <View style={tw`py-10 items-center`}>
                            <ActivityIndicator size="large" color="#4F46E5" />
                        </View>
                    ) : (
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
                    )}

                    {resource?.sourceUrl ? (
                        <TouchableOpacity
                            onPress={() => openLink(resource.sourceUrl)}
                            style={tw`mt-6 flex-row items-center bg-slate-50 p-4 rounded-2xl border border-slate-100`}
                        >
                            <Globe size={20} color="#4F46E5" />
                            <View style={tw`ml-3 flex-1`}>
                                <Text style={tw`text-slate-800 font-bold text-sm`}>Read Original Article</Text>
                                <Text style={tw`text-slate-500 text-xs`} numberOfLines={1}>{resource.sourceUrl}</Text>
                            </View>
                            <ExternalLink size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}

                    {resource?.attachments && resource.attachments.length > 0 ? (
                        <View style={tw`mt-8 p-4 bg-indigo-50 rounded-3xl border border-indigo-100 shadow-sm`}>
                            <View style={tw`flex-row items-center mb-4`}>
                                <Paperclip size={20} color="#4F46E5" />
                                <Text style={tw`ml-2 font-bold text-indigo-900`}>Reference Documents</Text>
                            </View>

                            {resource.attachments.map((doc, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => doc?.url && openLink(doc.url)}
                                    style={tw`flex-row items-center justify-between py-3 ${idx !== resource.attachments.length - 1 ? 'border-b border-indigo-200' : ''}`}
                                >
                                    <View style={tw`flex-row items-center flex-1 mr-4`}>
                                        <View style={tw`bg-white p-2 rounded-xl border border-indigo-100`}>
                                            <FileText size={20} color="#4F46E5" />
                                        </View>
                                        <Text style={tw`text-indigo-800 text-sm ml-3 font-medium`} numberOfLines={1}>
                                            {doc?.name || `Document ${idx + 1}`}
                                        </Text>
                                    </View>
                                    <ExternalLink size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
