import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MessageSquare, ArrowLeft, User, Send, Users } from 'lucide-react-native';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI, { socket_url } from '../common';
import moment from 'moment';
import storage from '../utils/storage';
import { useSocket } from '../contextAPI/SocketProvider';

const SOCKET_URL = socket_url;

export default function ChatListScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { socket } = useSocket();

    // State cho Broadcast
    const [activeTab, setActiveTab] = useState('rieng'); // 'rieng' | 'chung'
    const [newQuestion, setNewQuestion] = useState('');
    const [broadcastQuestions, setBroadcastQuestions] = useState([]);
    const [loadingBroadcast, setLoadingBroadcast] = useState(false);

    const isLawyer = user?.role === 'lawyer';

    const fetchConversations = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = await storage.getItem('@AuthToken');
            const response = await fetch(summaryAPI.getConversations.url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                const allConvs = [...data.data].sort((a, b) => {
                    const timeA = a.lastMessage?.createdAt || 0;
                    const timeB = b.lastMessage?.createdAt || 0;
                    return new Date(timeB) - new Date(timeA);
                });
                
                setConversations(allConvs);

                // Join all conversation rooms for real-time updates
                // Join all conversation rooms for real-time updates
                if (socket) {
                    allConvs.forEach(conv => {
                        socket.emit('join', conv._id);
                    });
                }
            }
        } catch (error) {
            console.error("Fetch Conversations Error:", error);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchBroadcastQuestions = async (silent = false) => {
        if (!silent) setLoadingBroadcast(true);
        try {
            const token = await storage.getItem('@AuthToken');
            if (!token) return;
            const response = await fetch(summaryAPI.getChatBroadcast.url, {
                method: summaryAPI.getChatBroadcast.method,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const textResponse = await response.text();
            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error("GET Broadcast - Lỗi parse JSON. Server trả về:", textResponse.substring(0, 200));
                throw new Error("Server trả về HTML/text thay vì JSON.");
            }

            if (response.ok && data.success) {
                const sortedQs = (data.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setBroadcastQuestions(sortedQs);
            }
        } catch (error) {
            console.error("Fetch Broadcast Error:", error);
        } finally {
            if (!silent) setLoadingBroadcast(false);
            setRefreshing(false);
        }
    };

    // Socket Setup
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (newMessage) => {
            // Silently re-fetch user's broadcast conversations to get the latest reply at the top
            if (!isLawyer) {
                fetchConversations(true);
            }
            setConversations(prev => {
                const index = prev.findIndex(c => c._id === newMessage.conversationID);
                if (index !== -1) {
                    const updatedConv = {
                        ...prev[index],
                        lastMessage: newMessage
                    };
                    const remaining = prev.filter((_, i) => i !== index);
                    return [updatedConv, ...remaining];
                }
                return prev;
            });
        };

        const handleNewBroadcastQuestion = () => {
            // Because socket payload might lack populated user info like fullname/avatar,
            // we silently re-fetch the reliable data from the server automatically instead of manually pushing it.
            if (isLawyer) {
                fetchBroadcastQuestions(true);
            } else {
                fetchConversations(true);
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('new_broadcast_question', handleNewBroadcastQuestion);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('new_broadcast_question', handleNewBroadcastQuestion);
        };
    }, [socket, isLawyer]);

    // Re-join rooms when conversations load or socket reconnects
    useEffect(() => {
        if (socket && conversations.length > 0) {
            conversations.forEach(conv => {
                socket.emit('join', conv._id);
            });
        }
    }, [socket, conversations.length]);

    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'rieng') {
                fetchConversations();
            } else {
                fetchBroadcastQuestions();
            }
        }, [activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'rieng') {
            fetchConversations();
        } else {
            fetchBroadcastQuestions();
        }
    };

    const handleSendPrivateQuestion = async () => {
        if (!newQuestion.trim()) return;
        
        try {
            const token = await storage.getItem('@AuthToken');
            const response = await fetch(summaryAPI.chatBroadcast.url, {
                method: summaryAPI.chatBroadcast.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: newQuestion.trim(), attachments: [] })
            });

            const textResponse = await response.text();
            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error("POST Broadcast - Lỗi parse JSON. Server trả về:", textResponse.substring(0, 200));
                throw new Error("Server trả về HTML/text thay vì JSON.");
            }
            
            if (response.ok && data.success) {
                setNewQuestion('');
                Alert.alert("Thành công", "Câu hỏi của bạn đã được gửi đến các luật sư.");
                // User's broadcasts are fetched via getConversations, so we refresh that instead
                fetchConversations();
            } else {
                Alert.alert("Lỗi", data.message || "Không thể gửi câu hỏi.");
            }
        } catch (error) {
            console.error("Broadcast Submit Error:", error);
            Alert.alert("Lỗi", "Không thể kết nối đến máy chủ.");
        }
    };

    const handleAnswerBroadcast = async (questionItem) => {
        const asker = questionItem.userID || questionItem.creator || (questionItem.participants && questionItem.participants[0]) || {};
        const askerName = asker.fullname || asker.name || asker.userID?.fullname || "khách hàng";
        const questionText = questionItem.question || questionItem.lastMessage?.text || "";

        const title = "Trả lời câu hỏi";
        const message = `Bạn muốn trả lời câu hỏi của ${askerName}?`;

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                navigation.navigate('ChatDetail', {
                    conversationID: questionItem._id,
                    otherUser: asker,
                    initialMessage: questionText
                });
            }
            return;
        }

        Alert.alert(title, message, [
            { text: "Để sau", style: "cancel" },
            { 
                text: "Bắt đầu chat", 
                onPress: async () => {
                    navigation.navigate('ChatDetail', {
                        conversationID: questionItem._id, // Vì backend đã tạo ChatConversation thực sự
                        otherUser: asker,
                        initialMessage: questionText
                    });
                } 
            }
        ]);
    };

    const renderPrivateChatItem = ({ item }) => {
        // Find the other participant
        const otherParticipant = item.participants.find(p => p._id !== user._id);
        const lastMsg = item.lastMessage || {};

        return (
            <TouchableOpacity
                style={tw`flex-row items-center p-4 bg-white mb-2 rounded-2xl shadow-sm border border-slate-50`}
                onPress={() => navigation.navigate('ChatDetail', {
                    conversationID: item._id,
                    otherUser: otherParticipant
                })}
            >
                {otherParticipant?.avatar ? (
                    <Image source={{ uri: otherParticipant.avatar }} style={tw`w-14 h-14 rounded-full`} />
                ) : (
                    <View style={tw`w-14 h-14 rounded-full bg-indigo-100 items-center justify-center`}>
                        <User size={28} color="#6366F1" />
                    </View>
                )}

                <View style={tw`flex-1 ml-4`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                        <Text style={tw`text-base font-bold text-slate-800`}>
                            {otherParticipant?.fullname || otherParticipant?.userID?.fullname || "Người dùng"}
                        </Text>
                        <Text style={tw`text-xs text-slate-400`}>
                            {lastMsg.createdAt ? moment(lastMsg.createdAt).fromNow() : ''}
                        </Text>
                    </View>
                    <Text style={tw`text-sm text-slate-500`} numberOfLines={1}>
                        {lastMsg.senderID === user._id ? 'Bạn: ' : ''}
                        {lastMsg.text || "Chưa có tin nhắn nào"}
                    </Text>
                </View>

                {!item.lastMessage?.isRead && lastMsg.senderID !== user._id && (
                    <View style={tw`w-3 h-3 bg-indigo-600 rounded-full ml-2`} />
                )}
            </TouchableOpacity>
        );
    };

    const renderBroadcastItem = ({ item }) => {
        // Broadcast question is stored as a ChatConversation.
        const questionText = item.question || item.lastMessage?.text || "Chưa có nội dung câu hỏi";
        
        // Asker
        const asker = item.userID || item.creator || (item.participants && item.participants[0]) || {};
        const askerName = asker.fullname || asker.name || asker.userID?.fullname || "Người dùng";
        const askTime = item.createdAt || item.lastMessage?.createdAt;

        // For user: check if a lawyer has replied (lastMessage is not from themselves)
        const lastMsg = item.lastMessage;
        const lastMsgSenderId = typeof lastMsg?.senderID === 'object' ? lastMsg?.senderID?._id : lastMsg?.senderID;
        const hasLawyerReply = !isLawyer && lastMsg && lastMsgSenderId !== user._id;

        // Try to get lawyer info: prefer populated senderID object, then search participants
        const replyingLawyer = hasLawyerReply 
            ? (typeof lastMsg.senderID === 'object' && lastMsg.senderID?.fullname 
                ? lastMsg.senderID 
                : item.participants?.find(p => p._id === lastMsgSenderId))
            : null;
        const lawyerName = replyingLawyer?.fullname || replyingLawyer?.name || "Luật sư";

        return (
            <View style={tw`bg-white p-4 mb-3 rounded-2xl shadow-sm border ${hasLawyerReply ? 'border-indigo-200' : 'border-slate-100'}`}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`w-8 h-8 rounded-full bg-slate-200 items-center justify-center mr-2`}>
                            <User size={16} color="#64748B" />
                        </View>
                        <Text style={tw`font-bold text-slate-700`}>{askerName}</Text>
                    </View>
                    <Text style={tw`text-xs text-slate-400`}>{askTime ? moment(askTime).fromNow() : ''}</Text>
                </View>
                <Text style={tw`text-slate-800 text-base leading-5 mb-3`} numberOfLines={2}>{questionText}</Text>

                {isLawyer && (
                    <TouchableOpacity 
                        style={tw`bg-indigo-50 py-2 items-center rounded-xl border border-indigo-100`}
                        onPress={() => handleAnswerBroadcast(item)}
                    >
                        <Text style={tw`text-indigo-600 font-bold text-sm`}>Trả lời ngay</Text>
                    </TouchableOpacity>
                )}

                {!isLawyer && !hasLawyerReply && (
                    <View style={tw`bg-slate-50 py-2 items-center rounded-xl`}>
                        <Text style={tw`text-slate-500 text-xs italic`}>Đang chờ luật sư phản hồi...</Text>
                    </View>
                )}

                {!isLawyer && hasLawyerReply && (
                    <View style={tw`bg-indigo-50 rounded-xl p-3 border border-indigo-100`}>
                        <View style={tw`flex-row items-center mb-1`}>
                            <View style={tw`w-5 h-5 rounded-full bg-indigo-200 items-center justify-center mr-1`}>
                                <User size={10} color="#4F46E5" />
                            </View>
                            <Text style={tw`text-xs font-bold text-indigo-700`}>{lawyerName} đã trả lời</Text>
                            <Text style={tw`ml-auto text-[10px] text-indigo-400`}>{moment(lastMsg.createdAt).fromNow()}</Text>
                        </View>
                        <Text style={tw`text-sm text-indigo-800 leading-5 mb-2`} numberOfLines={2}>"{lastMsg.text}"</Text>
                        <TouchableOpacity
                            style={tw`bg-indigo-600 py-2 items-center rounded-lg`}
                            onPress={() => navigation.navigate('ChatDetail', {
                                conversationID: item._id,
                                otherUser: replyingLawyer,
                                initialMessage: questionText
                            })}
                        >
                            <Text style={tw`text-white font-bold text-sm`}>Mở Chat với Luật sư</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-4 pb-2 px-4 shadow-sm z-10`}>
                <View style={tw`flex-row items-center mb-4`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Tư vấn pháp luật</Text>
                </View>
                
                {/* Tabs */}
                <View style={tw`flex-row bg-slate-100 p-1 rounded-2xl mb-2`}>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('rieng')}
                        style={tw`flex-1 py-2 rounded-xl items-center ${activeTab === 'rieng' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <View style={tw`flex-row items-center`}>
                            <MessageSquare size={16} color={activeTab === 'rieng' ? '#4F46E5' : '#64748B'} />
                            <Text style={tw`ml-2 font-bold ${activeTab === 'rieng' ? 'text-indigo-600' : 'text-slate-500'}`}>Tư vấn riêng</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('chung')}
                        style={tw`flex-1 py-2 rounded-xl items-center ${activeTab === 'chung' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <View style={tw`flex-row items-center`}>
                            <Users size={16} color={activeTab === 'chung' ? '#4F46E5' : '#64748B'} />
                            <Text style={tw`ml-2 font-bold ${activeTab === 'chung' ? 'text-indigo-600' : 'text-slate-500'}`}>Tư vấn chung</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={tw`flex-1 px-4 pt-4`}>
                {activeTab === 'rieng' ? (
                    // -------- PRIVATE CHAT TAB --------
                    loading ? (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <ActivityIndicator size="large" color="#6366F1" />
                        </View>
                    ) : (
                        <FlatList
                            data={conversations.filter(c => !c.isBroadcast)}
                            renderItem={renderPrivateChatItem}
                            keyExtractor={item => item._id}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#6366F1" />
                            }
                            ListEmptyComponent={
                                <View style={tw`items-center justify-center mt-20`}>
                                    <MessageSquare size={64} color="#CBD5E1" />
                                    <Text style={tw`text-slate-400 mt-4 text-lg`}>Chưa có cuộc hội thoại nào</Text>
                                </View>
                            }
                        />
                    )
                ) : (
                    // -------- BROADCAST CHAT TAB --------
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1`}>
                        
                        {!isLawyer && (
                            <View style={tw`bg-white p-3 rounded-2xl shadow-sm border border-indigo-100 mb-4 flex-row items-center`}>
                                <AppTextInput 
                                    style={tw`flex-1 h-10 bg-slate-50 rounded-xl px-4`}
                                    placeholder="Viết câu hỏi của bạn..."
                                    value={newQuestion}
                                    onChangeText={setNewQuestion}
                                    multiline
                                />
                                <TouchableOpacity 
                                    onPress={handleSendPrivateQuestion}
                                    style={tw`ml-2 w-10 h-10 bg-indigo-600 rounded-xl items-center justify-center ${!newQuestion.trim() ? 'opacity-50' : ''}`}
                                    disabled={!newQuestion.trim()}
                                >
                                    <Send size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {loadingBroadcast ? (
                            <View style={tw`flex-1 items-center justify-center mt-10`}>
                                <ActivityIndicator size="large" color="#6366F1" />
                            </View>
                        ) : (
                            <FlatList
                                data={isLawyer ? broadcastQuestions : conversations.filter(c => c.isBroadcast)}
                                renderItem={renderBroadcastItem}
                                keyExtractor={item => item._id}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#6366F1" />
                                }
                                ListHeaderComponent={
                                    <Text style={tw`text-sm font-bold text-slate-500 mb-3`}>
                                        {isLawyer ? 'Tất cả câu hỏi từ khách hàng' : 'Các câu hỏi bạn đã gửi'}
                                    </Text>
                                }
                                ListEmptyComponent={
                                    <View style={tw`items-center justify-center mt-10`}>
                                        <Users size={64} color="#E2E8F0" />
                                        <Text style={tw`text-slate-400 mt-4 px-10 text-center`}>
                                            {isLawyer 
                                                ? "Hiện chưa có câu hỏi chung nào cần tư vấn." 
                                                : "Bạn chưa gửi câu hỏi chung nào. Hãy gửi câu hỏi để các luật sư có thể giải đáp cho bạn."}
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </KeyboardAvoidingView>
                )}
            </View>
        </SafeAreaView>
    );
}
