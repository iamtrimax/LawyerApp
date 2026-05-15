import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Linking,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, Sparkles, User, ExternalLink } from 'lucide-react-native';
import { useSocket } from '../contextAPI/SocketProvider';
import moment from 'moment';

export default function ChatWithAIScreen() {
    const navigation = useNavigation();
    const [messages, setMessages] = useState([
        {
            _id: 'welcome',
            text: 'Xin chào! Tôi là trợ lý AI chuyên gia về pháp luật Việt Nam. Tôi có thể giúp gì cho bạn hôm nay?',
            senderID: 'AI_ASSISTANT',
            createdAt: new Date(),
            isAiResponse: true
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const { socket, socketUserId } = useSocket();
    const flatListRef = useRef(null);

    useEffect(() => {
        if (socket) {
            const handleReceiveMessage = (newMessage) => {
                if (newMessage.conversationID === 'AI_CHAT' || newMessage.isAiResponse) {
                    setMessages(prev => {
                        // Tránh tin nhắn trùng lặp
                        if (prev.find(m => m._id === newMessage._id)) return prev;
                        return [newMessage, ...prev];
                    });
                    setSending(false);
                }
            };

            socket.on('receive_message', handleReceiveMessage);
            return () => {
                socket.off('receive_message', handleReceiveMessage);
            };
        }
    }, [socket]);

    const handleSend = () => {
        if (!inputText.trim() || !socket) return;

        const userMsg = {
            _id: `user-${Date.now()}`,
            text: inputText,
            senderID: socketUserId,
            createdAt: new Date(),
            conversationID: 'AI_CHAT',
            isAiChat: true
        };

        // Lấy 5 tin nhắn gần nhất để làm ngữ cảnh cho AI
        const historyContext = messages.slice(0, 5).reverse().map(m => ({
            text: m.text,
            senderID: m.senderID,
            isAiResponse: m.isAiResponse
        }));

        setMessages(prev => [userMsg, ...prev]);
        setSending(true);
        setInputText('');

        socket.emit('send_message', {
            conversationID: 'AI_CHAT',
            text: inputText,
            senderID: socketUserId,
            isAiChat: true,
            history: historyContext
        });
    };

    const renderMessage = ({ item }) => {
        const isAi = item.senderID === 'AI_ASSISTANT' || item.isAiResponse;
        const isMe = item.senderID === socketUserId;

        return (
            <View style={tw`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                {isAi && (
                    <View style={tw`mr-2 self-end`}>
                        <View style={tw`w-8 h-8 rounded-full bg-indigo-600 items-center justify-center`}>
                            <Sparkles size={16} color="white" />
                        </View>
                    </View>
                )}
                <View style={tw`max-w-[80%]`}>
                    <View style={tw`p-3 rounded-2xl ${isMe ? 'bg-indigo-600 rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none shadow-sm'}`}>
                        <Text style={tw`text-sm ${isMe ? 'text-white' : 'text-slate-800'}`}>
                            {item.text}
                        </Text>
                        
                        {item.sources && item.sources.length > 0 && (
                            <View style={tw`mt-3 pt-2 border-t border-slate-100`}>
                                <Text style={tw`text-[10px] font-bold text-slate-500 mb-1 uppercase`}>Nguồn tham khảo:</Text>
                                {item.sources?.map((source, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={tw`flex-row items-center mt-1`}
                                        onPress={() => source?.url && Linking.openURL(source.url)}
                                    >
                                        <ExternalLink size={10} color="#6366F1" />
                                        <Text style={tw`text-[11px] text-indigo-600 ml-1 underline`} numberOfLines={1}>
                                            {source?.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <Text style={tw`text-[10px] text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {moment(item.createdAt).format('HH:mm')}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header ... */}
            <View style={tw`bg-white py-3 px-4 shadow-sm z-10 flex-row items-center border-b border-slate-100`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={tw`flex-1 flex-row items-center ml-2`}>
                    <View style={tw`w-10 h-10 rounded-full bg-indigo-100 items-center justify-center`}>
                        <Sparkles size={20} color="#6366F1" />
                    </View>
                    <View style={tw`ml-3`}>
                        <Text style={tw`text-base font-bold text-slate-800`}>Trợ lý AI Pháp luật</Text>
                        <Text style={tw`text-[10px] text-green-500`}>Sẵn sàng hỗ trợ 24/7</Text>
                    </View>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => item?._id?.toString() || `msg-${index}`}
                contentContainerStyle={tw`p-4 pb-10`}
                inverted
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={sending && (
                    <View style={tw`flex-row items-center mb-4`}>
                        <View style={tw`w-8 h-8 rounded-full bg-indigo-600 items-center justify-center mr-2`}>
                            <Sparkles size={16} color="white" />
                        </View>
                        <View style={tw`bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm`}>
                            <ActivityIndicator size="small" color="#6366F1" />
                        </View>
                    </View>
                )}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={tw`p-4 bg-white border-t border-slate-100 flex-row items-center`}>
                    <View style={tw`flex-1 mx-2 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200`}>
                        <AppTextInput
                            style={tw`text-sm`}
                            placeholder="Hỏi về pháp luật..."
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                            maxHeight={100}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending || !inputText.trim()}
                        style={tw`p-3 bg-indigo-600 rounded-full shadow-md ${(!inputText.trim() || sending) ? 'opacity-50' : ''}`}
                    >
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
