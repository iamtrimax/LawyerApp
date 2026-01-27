import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Send, Paperclip, User, Phone, Info } from 'lucide-react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI from '../common';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get base URL from common/index.js (implicitly via summaryAPI)
const SOCKET_URL = summaryAPI.getConversations.url.split('/api')[0];

export default function ChatDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { conversationID, otherUser } = route.params;
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const socket = useRef(null);
    const flatListRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('@AuthToken');
            const response = await fetch(summaryAPI.getMessages.url.replace(':conversationID', conversationID), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                // Handle different possible response structures
                const msgs = data.data || data.messages || [];
                // Sort by createdAt descending: Newest at index 0 (bottom of inverted FlatList)
                const sortedMsgs = [...msgs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setMessages(sortedMsgs);
            }
        } catch (error) {
            console.error("Fetch Messages Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Initialize Socket.io
        socket.current = io(SOCKET_URL);

        socket.current.on('connect', () => {
            console.log('Connected to socket server');
            socket.current.emit('join', conversationID);
        });

        socket.current.on('receive_message', (newMessage) => {
            setMessages(prev => {
                // 1. Check if message already exists by ID (permanent ID)
                if (prev.find(m => m._id === newMessage._id)) return prev;

                // 2. Check if this is a response to our optimistic message
                // Find index of an optimistic message with same text and sender
                const optimisticIndex = prev.findIndex(m =>
                    m.isOptimistic &&
                    m.text === newMessage.text &&
                    m.senderID === (typeof newMessage.senderID === 'object' ? newMessage.senderID._id : newMessage.senderID)
                );

                if (optimisticIndex !== -1) {
                    // Replace optimistic message with the real one
                    const newMsgs = [...prev];
                    newMsgs[optimisticIndex] = newMessage;
                    return newMsgs;
                }

                // 3. Otherwise add it to the list
                return [newMessage, ...prev];
            });
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [conversationID]);

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
            socket.current.emit('send_message', messageData);

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
                <TouchableOpacity style={tw`p-2`}>
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
                        <TextInput
                            style={tw`text-slate-800 text-sm`}
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
