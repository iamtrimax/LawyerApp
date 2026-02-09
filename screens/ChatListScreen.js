import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MessageSquare, ArrowLeft, Search, Clock, User } from 'lucide-react-native';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI, { socket_url } from '../common';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const SOCKET_URL = socket_url;

export default function ChatListScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const socket = useRef(null);

    const fetchConversations = async () => {
        try {
            const token = await AsyncStorage.getItem('@AuthToken');
            const response = await fetch(summaryAPI.getConversations.url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                const sortedData = [...data.data].sort((a, b) => {
                    const timeA = a.lastMessage?.createdAt || 0;
                    const timeB = b.lastMessage?.createdAt || 0;
                    return new Date(timeB) - new Date(timeA);
                });
                setConversations(sortedData);

                // Join all conversation rooms for real-time updates
                if (socket.current) {
                    sortedData.forEach(conv => {
                        socket.current.emit('join', conv._id);
                    });
                }
            }
        } catch (error) {
            console.error("Fetch Conversations Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Socket Setup
    useEffect(() => {
        socket.current = io(SOCKET_URL);

        socket.current.on('connect', () => {
            // Re-join rooms if socket reconnects
            conversations.forEach(conv => {
                socket.current.emit('join', conv._id);
            });
        });

        socket.current.on('receive_message', (newMessage) => {
            setConversations(prev => {
                const index = prev.findIndex(c => c._id === newMessage.conversationID);
                if (index !== -1) {
                    const updatedConv = {
                        ...prev[index],
                        lastMessage: newMessage
                    };
                    const remaining = prev.filter((_, i) => i !== index);
                    // Move to top and return
                    return [updatedConv, ...remaining];
                }
                return prev;
            });
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchConversations();
    };

    const renderItem = ({ item }) => {
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

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-4 pb-4 px-4 shadow-sm z-10 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Cuộc hội thoại</Text>
            </View>

            <View style={tw`flex-1 px-4 pt-4`}>
                {loading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color="#6366F1" />
                    </View>
                ) : (
                    <FlatList
                        data={conversations}
                        renderItem={renderItem}
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
                )}
            </View>
        </SafeAreaView>
    );
}
