import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Send, Paperclip, User, Phone, Info } from 'lucide-react-native';
import { useAuth } from '../contextAPI/AuthProvider';
import { useSocket } from '../contextAPI/SocketProvider';
import summaryAPI, { socket_url } from '../common';
import moment from 'moment';
import storage from '../utils/storage';

// Get base URL from common/index.js
const SOCKET_URL = socket_url;

export default function ChatDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { conversationID, otherUser, initialMessage } = route.params;
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const { socket, callUser } = useSocket();
    const flatListRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const token = await storage.getItem('@AuthToken');
            const response = await fetch(summaryAPI.getMessages.url.replace(':conversationID', conversationID), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            let msgs = [];
            if (response.ok && data.success) {
                msgs = data.data || data.messages || [];
            }
            
            // Sort by createdAt descending: Newest at index 0 (bottom of inverted FlatList)
            let sortedMsgs = [...msgs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            if (initialMessage) {
                const mockInitialMsg = {
                    _id: 'mock-initial',
                    text: `Câu hỏi chung:\n"${initialMessage}"`,
                    senderID: typeof otherUser === 'object' ? otherUser._id : otherUser,
                    createdAt: new Date(0).toISOString(),
                    isSystemMessage: true
                };
                sortedMsgs = [...sortedMsgs, mockInitialMsg];
            }
            
            setMessages(sortedMsgs);
        } catch (error) {
            console.error("Fetch Messages Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        if (socket) {
            socket.emit('join', conversationID);

            const handleReceiveMessage = (newMessage) => {
                setMessages(prev => {
                    if (prev.find(m => m._id === newMessage._id)) return prev;
                    const optimisticIndex = prev.findIndex(m =>
                        m.isOptimistic &&
                        m.text === newMessage.text &&
                        m.senderID === (typeof newMessage.senderID === 'object' ? newMessage.senderID._id : newMessage.senderID)
                    );
                    if (optimisticIndex !== -1) {
                        const newMsgs = [...prev];
                        newMsgs[optimisticIndex] = newMessage;
                        return newMsgs;
                    }
                    return [newMessage, ...prev];
                });
            };

            socket.on('receive_message', handleReceiveMessage);

            return () => {
                socket.off('receive_message', handleReceiveMessage);
            };
        }
    }, [conversationID, socket]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const messageData = {
            conversationID: conversationID,
            text: inputText,
            senderID: user._id,
            attachments: []
        };

        setSending(true);
        try {
            // 1. Optimistic Update (Immediate UI response)
            const optimisticMsg = {
                _id: `temp-${Date.now()}`,
                ...messageData,
                createdAt: new Date(),
                isOptimistic: true
            };
            setMessages(prev => [optimisticMsg, ...prev]);
            setInputText('');

            // 2. Emit via Socket (Backend saves and broadcasts)
            socket.emit('send_message', messageData);

            // 3. Removed HTTP POST to avoid duplicates (Socket handles it)
        } catch (error) {
            console.error("Send Message Error:", error);
            Alert.alert("Lỗi", "Không thể gửi tin nhắn qua Socket.");
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const senderId = typeof item.senderID === 'object' ? item.senderID._id : item.senderID;
        const isMyMessage = senderId === user._id;
        const senderName = !isMyMessage 
            ? (item.senderID?.fullname || item.senderID?.name || otherUser?.fullname || otherUser?.name || "Người dùng")
            : null;

        return (
            <View style={tw`mb-4 flex-row ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                {!isMyMessage && (
                    <View style={tw`mr-2 self-end`}>
                        {otherUser?.avatar ? (
                            <Image source={{ uri: otherUser.avatar }} style={tw`w-8 h-8 rounded-full`} />
                        ) : (
                            <View style={tw`w-8 h-8 rounded-full bg-slate-200 items-center justify-center`}>
                                <User size={16} color="#64748B" />
                            </View>
                        )}
                    </View>
                )}
                <View style={tw`max-w-[75%]`}>
                    {!isMyMessage && senderName && (
                        <Text style={tw`text-[11px] font-bold text-indigo-600 mb-1 ml-1`}>{senderName}</Text>
                    )}
                    <View style={tw`p-3 rounded-2xl ${isMyMessage ? 'bg-indigo-600 rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none shadow-sm'}`}>
                        <Text style={tw`text-sm ${isMyMessage ? 'text-white' : 'text-slate-800'}`}>
                            {item.text}
                        </Text>
                    </View>
                    <Text style={tw`text-[10px] text-slate-400 mt-1 ${isMyMessage ? 'text-right' : 'text-left'}`}>
                        {moment(item.createdAt).format('HH:mm')}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white py-3 px-4 shadow-sm z-10 flex-row items-center border-b border-slate-100`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={tw`flex-1 flex-row items-center ml-2`}>
                    {otherUser?.avatar ? (
                        <Image source={{ uri: otherUser.avatar }} style={tw`w-10 h-10 rounded-full`} />
                    ) : (
                        <View style={tw`w-10 h-10 rounded-full bg-indigo-100 items-center justify-center`}>
                            <User size={20} color="#6366F1" />
                        </View>
                    )}
                    <View style={tw`ml-3`}>
                        <Text style={tw`text-base font-bold text-slate-800`}>
                            {otherUser?.fullname || otherUser?.userID?.fullname || "Người dùng"}
                        </Text>
                        <Text style={tw`text-[10px] text-green-500`}>Đang trực tuyến</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={tw`p-2`}
                    onPress={() => {
                        const receiverId = typeof otherUser === 'object' ? otherUser._id : otherUser;
                        const receiverName = otherUser?.fullname || otherUser?.name || "Người dùng";
                        // Start a call
                        callUser(receiverId, receiverName, 'video');
                    }}
                >
                    <Phone size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={tw`p-2`}>
                    <Info size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                    contentContainerStyle={tw`p-4 pb-10`}
                    inverted // Newest messages at bottom
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={tw`p-4 bg-white border-t border-slate-100 flex-row items-center`}>
                    <TouchableOpacity style={tw`p-2`}>
                        <Paperclip size={22} color="#64748B" />
                    </TouchableOpacity>

                    <View style={tw`flex-1 mx-2 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200`}>
                        <AppTextInput
                            style={tw`text-sm`}
                            placeholder="Nhập tin nhắn..."
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending || !inputText.trim()}
                        style={tw`p-3 bg-indigo-600 rounded-full shadow-md ${(!inputText.trim() || sending) ? 'opacity-50' : ''}`}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Send size={20} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
