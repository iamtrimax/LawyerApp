import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Animated,
    Image as RNImage,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    Send,
    Sparkles,
    Copy,
    Download,
    RotateCcw,
    ChevronDown,
    FileText,
    Briefcase,
    Home,
    Users,
    BookOpen,
    Plus,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import storage from '../utils/storage';
import summaryAPI from '../common';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const PENCILLAW_LOGO = require('../assets/logo-app.jpg');

// Template suggestions for quick prompts
const QUICK_TEMPLATES = [
    { id: 1, icon: Briefcase, label: 'Hợp đồng lao động', prompt: 'Hãy tạo mẫu hợp đồng lao động tiêu chuẩn giữa người sử dụng lao động và người lao động theo pháp luật Việt Nam hiện hành.' },
    { id: 2, icon: Home, label: 'Hợp đồng thuê nhà', prompt: 'Hãy tạo mẫu hợp đồng thuê nhà đầy đủ, bao gồm các điều khoản về tiền thuê, thời hạn, quyền và nghĩa vụ các bên.' },
    { id: 3, icon: Users, label: 'Hợp đồng dịch vụ', prompt: 'Hãy tạo mẫu hợp đồng dịch vụ giữa bên cung cấp và bên sử dụng dịch vụ, bao gồm phạm vi, giá trị và điều khoản thanh toán.' },
    { id: 4, icon: FileText, label: 'Đơn khởi kiện', prompt: 'Hãy tạo mẫu đơn khởi kiện dân sự gửi Tòa án nhân dân để giải quyết tranh chấp hợp đồng.' },
    { id: 5, icon: BookOpen, label: 'Di chúc', prompt: 'Hãy tạo mẫu di chúc hợp pháp theo quy định của Bộ luật Dân sự Việt Nam.' },
    { id: 6, icon: Plus, label: 'Tùy chỉnh...', prompt: '' },
];

const USER_ROLE = 'user';
const AI_ROLE = 'ai';

export default function LegalDocumentComposerScreen() {
    const navigation = useNavigation();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showTemplates, setShowTemplates] = useState(true);
    const [formTypes, setFormTypes] = useState(QUICK_TEMPLATES);
    const flatListRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchFormTypes();
        // Optionially fetch history: fetchHistory();
    }, []);

    const fetchFormTypes = async () => {
        try {
            const response = await fetch(summaryAPI.legalAIFormTypes.url);
            const data = await response.json();
            if (data && Array.isArray(data)) {
                // Map backend form types to template format
                const mapped = data.map((item, index) => ({
                    id: item._id || index,
                    icon: item.icon === 'Briefcase' ? Briefcase : (item.icon === 'Home' ? Home : (item.icon === 'Users' ? Users : FileText)),
                    label: item.title || item.label,
                    prompt: item.prompt || `Hãy tạo mẫu ${item.title || item.label} chuẩn pháp lý.`
                }));
                if (mapped.length > 0) setFormTypes(mapped);
            }
        } catch (error) {
            console.log('Error fetching form types:', error);
        }
    };

    const sendMessage = useCallback(async (text) => {
        if (!text.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: USER_ROLE,
            content: text.trim(),
            createdAt: new Date(),
        };

        setMessages(prev => [userMessage, ...prev]);
        setInputText('');
        setIsLoading(true);
        setShowTemplates(false);

        // Fade out templates
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();

        try {
            const token = await storage.getItem('@AuthToken');
            if (!token) {
                console.log('LexAI: Chế độ Guest (Không lưu lịch sử)');
            }
            const apiUrl = summaryAPI.legalAIChat?.url || '';
            const payload = { prompt: text.trim() };
            
            console.log('--- LEXAI API CALL ---');
            console.log('URL:', apiUrl);
            console.log('Payload:', payload);
            console.log('Token:', token ? 'Có token' : 'Không có token');

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Mã lỗi: ${response.status} - ${errorText.substring(0, 100)}`);
            }

            const data = await response.json();
            console.log('Full API Response:', data);
            let aiContent = '';
            let structuredSections = null;

            if (data.success && data.data) {
                const doc = data.data;
                structuredSections = doc.sections;
                
                // Build text content for fallback/copy
                aiContent = `# ${doc.title || 'Mẫu Văn Bản'}\n\n`;
                if (doc.notes) aiContent += `*Ghi chú: ${doc.notes}*\n\n`;
                
                if (doc.sections && Array.isArray(doc.sections)) {
                    doc.sections.forEach(section => {
                        const sectionTitle = section.title || (section.type === 'heading' ? 'Tiêu đề' : '');
                        if (sectionTitle) aiContent += `## ${sectionTitle}\n`;
                        if (section.content) aiContent += `${section.content}\n\n`;
                        if (section.label) aiContent += `${section.label}: ${section.value || '........'}\n\n`;
                    });
                }
            } else {
                aiContent = data.message || data.reply || data.content || 'Không thể tạo mẫu đơn. Vui lòng thử lại với mô tả chi tiết hơn.';
            }

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: AI_ROLE,
                content: aiContent,
                structuredSections: structuredSections,
                prompt: text.trim(), // Keep original prompt for download
                createdAt: new Date(),
            };
            setMessages(prev => [aiMessage, ...prev]);
        } catch (error) {
            console.error('LexAI API error:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: AI_ROLE,
                content: `🚨 Lỗi kết nối: ${error.message || 'Không thể liên lạc với máy chủ'}. Vui lòng thử lại sau.`,
                createdAt: new Date(),
                isError: true,
            };
            setMessages(prev => [errorMessage, ...prev]);
            Alert.alert('Lỗi', `Không thể kết nối API AI: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, fadeAnim]);


    const handleCopy = (content) => {
        Clipboard.setStringAsync(content)
            .then(() => Alert.alert('Đã sao chép', 'Nội dung đã được sao chép vào bộ nhớ tạm.'))
            .catch(() => Alert.alert('Lỗi', 'Không thể sao chép nội dung.'));
    };

    const handleExportDoc = async (fallbackContent, prompt) => {
        if (!prompt) {
            generateClientSideDoc(fallbackContent);
            return;
        }

        setIsLoading(true);
        try {
            const token = await storage.getItem('@AuthToken');
            const apiUrl = summaryAPI.legalAIDownload.url;
            
            console.log('Downloading Word from:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) throw new Error('API server không phản hồi file');

            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                try {
                    const base64data = reader.result.split(',')[1];
                    const filename = `LexAI_${Date.now()}.docx`;

                    if (Platform.OS === 'web') {
                        // Web download logic
                        const link = document.createElement('a');
                        link.href = reader.result;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        return;
                    }

                    // Native download logic
                    const fileUri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(fileUri, base64data, {
                        encoding: 'base64'
                    });

                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                        await Sharing.shareAsync(fileUri, {
                            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            dialogTitle: 'Tải xuống văn bản LexAI',
                        });
                    } else {
                        Alert.alert('Lỗi', 'Thiết bị không hỗ trợ chia sẻ/tải file.');
                    }
                } catch (writeErr) {
                    console.error('File write error:', writeErr);
                    generateClientSideDoc(fallbackContent);
                }
            };
        } catch (error) {
            console.error('Download error:', error);
            // Fallback to client-side generation
            Alert.alert(
                'Lỗi tải file',
                'Không thể tải file Word từ server. Ứng dụng sẽ tự động tạo bản Word thay thế.',
                [{ text: 'Đồng ý', onPress: () => generateClientSideDoc(fallbackContent) }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const generateClientSideDoc = async (content) => {
        try {
            // Create Word-compatible HTML that can be opened and saved as .doc
            const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 2cm; }
    body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.8; color: #000; }
    h1 { font-size: 16pt; text-align: center; text-transform: uppercase; font-weight: bold; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; }
    h3 { font-size: 13pt; font-weight: bold; margin-top: 10pt; }
    p { margin: 6pt 0; text-align: justify; }
    strong, b { font-weight: bold; }
  </style>
</head>
<body>
${content.split('\n').map(line => {
    let formatted = line.trim();
    if (!formatted) return `<p>&nbsp;</p>`;

    if (formatted.startsWith('# ')) return `<h1>${formatted.slice(2)}</h1>`;
    if (formatted.startsWith('## ')) return `<h2>${formatted.slice(3)}</h2>`;
    if (formatted.startsWith('### ')) return `<h3>${formatted.slice(4)}</h3>`;
    if (formatted.startsWith('---')) return `<hr/>`;

    // Replace bold **text** with <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace italic *text* with <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    if (formatted.startsWith('- ')) {
        return `<p style="margin-left:20pt">• ${formatted.slice(2)}</p>`;
    }

    return `<p style="text-align: justify;">${formatted}</p>`;
}).join('\n')}
</body>
</html>`;

            const filename = `VanBanPhapLy_${Date.now()}.doc`;

            if (Platform.OS === 'web') {
                const blob = new Blob([htmlContent], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                return;
            }

            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
                encoding: 'utf8',
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/msword',
                    dialogTitle: 'Tải xuống văn bản',
                    UTI: 'com.microsoft.word.doc',
                });
            } else {
                Alert.alert('Lỗi', 'Thiết bị không hỗ trợ chia sẻ file.');
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Lỗi xuất file', 'Không thể xuất văn bản. Vui lòng thử lại.');
        }
    };

    const handleReset = () => {
        Alert.alert('Xoá hội thoại', 'Bạn có muốn bắt đầu cuộc trò chuyện mới?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Xoá', style: 'destructive', onPress: () => {
                    setMessages([]);
                    setShowTemplates(true);
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }
            },
        ]);
    };

    const renderSection = (section, index) => {
        const { type, content, label, value, title } = section;
        
        switch (type) {
            case 'heading':
                return (
                    <View key={index} style={tw`mb-4 items-center`}>
                        <Text style={tw`text-base font-bold text-slate-900 text-center uppercase`}>{content || title}</Text>
                    </View>
                );
            case 'subheading':
                return (
                    <View key={index} style={tw`mb-3 items-center`}>
                        <Text style={tw`text-sm font-bold text-slate-700 text-center italic`}>{content || title}</Text>
                    </View>
                );
            case 'field':
                return (
                    <View key={index} style={tw`flex-row flex-wrap mb-2`}>
                        <Text style={tw`text-sm font-bold text-slate-800`}>{label}: </Text>
                        <Text style={tw`text-sm text-slate-600 border-b border-slate-300 min-w-[100px]`}>
                            {value || '................................'}
                        </Text>
                    </View>
                );
            case 'signature':
                return (
                    <View key={index} style={tw`mt-6 items-end pr-4`}>
                        <Text style={tw`text-sm font-bold text-slate-800 mb-10`}>{label || 'Người làm đơn'}</Text>
                        <Text style={tw`text-xs text-slate-400`}>(Ký và ghi rõ họ tên)</Text>
                    </View>
                );
            default: // paragraph
                return (
                    <Text key={index} style={tw`text-sm leading-6 text-slate-800 mb-2 text-justify`}>
                        {content}
                    </Text>
                );
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === USER_ROLE;

        return (
            <View style={tw`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && (
                    <View style={tw`flex-row items-center mb-2`}>
                        <RNImage source={PENCILLAW_LOGO} style={tw`w-7 h-7 rounded-full`} resizeMode="contain" />
                        <Text style={tw`text-xs font-bold text-indigo-600 ml-2`}>PencilLaw AI</Text>
                        {item.isMock && (
                            <View style={tw`ml-2 bg-amber-100 px-2 py-0.5 rounded-full`}>
                                <Text style={tw`text-[10px] text-amber-600`}>Mô phỏng</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={tw`max-w-[95%] ${isUser ? 'bg-indigo-600 rounded-2xl rounded-tr-sm p-4' : 'bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm p-5'}`}>
                    {isUser ? (
                        <Text style={tw`text-sm leading-6 text-white`}>
                            {item.content}
                        </Text>
                    ) : (
                        <View>
                            {item.structuredSections ? (
                                item.structuredSections.map((section, idx) => renderSection(section, idx))
                            ) : (
                                <Text style={tw`text-sm leading-6 text-slate-800`}>
                                    {item.content}
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {!isUser && (
                    <View style={tw`flex-row items-center mt-2 ml-1`}>
                        <TouchableOpacity
                            style={tw`flex-row items-center mr-4`}
                            onPress={() => handleCopy(item.content)}
                        >
                            <Copy size={12} color="#94a3b8" />
                            <Text style={tw`text-[11px] text-slate-400 ml-1`}>Sao chép</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={tw`flex-row items-center bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1`}
                            onPress={() => handleExportDoc(item.content, item.prompt)}
                        >
                            <Download size={12} color="#6366F1" />
                            <Text style={tw`text-[11px] font-bold text-indigo-600 ml-1`}>Tải file Word</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderTypingIndicator = () => (
        <View style={tw`mb-4 items-start`}>
            <View style={tw`flex-row items-center mb-2`}>
                <RNImage source={PENCILLAW_LOGO} style={tw`w-7 h-7 rounded-full`} resizeMode="contain" />
                <Text style={tw`text-xs font-bold text-indigo-600 ml-2`}>PencilLaw AI</Text>
            </View>
            <View style={tw`bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3`}>
                <View style={tw`flex-row items-center`}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={tw`text-sm text-slate-400 ml-2`}>Đang soạn thảo...</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 shadow-sm border-b border-slate-100 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={22} color="#1F2937" />
                    </TouchableOpacity>
                    <View style={tw`ml-2`}>
                        <View style={tw`flex-row items-center`}>
                            <RNImage source={PENCILLAW_LOGO} style={tw`w-6 h-6 rounded-full`} resizeMode="contain" />
                            <Text style={tw`text-base font-bold text-slate-800 ml-2`}>PencilLaw AI</Text>
                            <View style={tw`ml-2 bg-indigo-100 px-2 py-0.5 rounded-full`}>
                                <Text style={tw`text-[10px] font-bold text-indigo-600`}>Soạn thảo văn bản</Text>
                            </View>
                        </View>
                        <Text style={tw`text-[10px] text-green-500 ml-8`}>● Trực tuyến</Text>
                    </View>
                </View>
                {messages.length > 0 && (
                    <TouchableOpacity onPress={handleReset} style={tw`p-2`}>
                        <RotateCcw size={18} color="#64748B" />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    inverted
                    contentContainerStyle={tw`p-4 pb-2`}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={isLoading ? renderTypingIndicator() : null}
                    ListFooterComponent={
                        showTemplates ? (
                            <Animated.View style={[{ opacity: fadeAnim }, tw`mb-4`]}>
                                {/* Welcome banner */}
                                <View style={tw`bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 mb-5 items-center`}>
                                    <RNImage source={PENCILLAW_LOGO} style={tw`w-14 h-14 rounded-2xl mb-3`} resizeMode="contain" />
                                    <Text style={tw`text-xl font-bold text-indigo-900 mb-1`}>PencilLaw AI Soạn Thảo</Text>
                                    <Text style={tw`text-sm text-indigo-600 text-center leading-5`}>
                                        Trợ lý AI giúp bạn tạo các mẫu văn bản pháp lý chuẩn xác nhanh chóng
                                    </Text>
                                </View>

                                {/* Quick template chips */}
                                <Text style={tw`text-sm font-bold text-slate-600 mb-3`}>Mẫu phổ biến</Text>
                                <View style={tw`flex-row flex-wrap`}>
                                    {formTypes.map(t => {
                                        const IconComponent = t.icon || FileText;
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => {
                                                    if (t.prompt) {
                                                        sendMessage(t.prompt);
                                                    }
                                                }}
                                                style={tw`mr-2 mb-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-row items-center shadow-sm`}
                                            >
                                                <IconComponent size={14} color="#6366F1" />
                                                <Text style={tw`ml-2 text-sm font-medium text-slate-700`}>{t.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Disclaimer */}
                                <View style={tw`mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3`}>
                                    <Text style={tw`text-[11px] text-amber-700 text-center leading-4`}>
                                        ⚠️ Văn bản từ AI chỉ mang tính tham khảo. Hãy luôn tham vấn luật sư trước khi ký kết văn bản pháp lý.
                                    </Text>
                                </View>
                            </Animated.View>
                        ) : null
                    }
                />

                {/* Input Area */}
                <View style={tw`bg-white border-t border-slate-100 px-4 py-3`}>
                    <View style={tw`flex-row items-end bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2`}>
                        <AppTextInput
                            style={tw`flex-1 text-sm max-h-32 mr-2`}
                            placeholder="Yêu cầu AI soạn thảo văn bản..."
                            placeholderTextColor="#94a3b8"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={() => sendMessage(inputText)}
                            disabled={!inputText.trim() || isLoading}
                            style={tw`w-9 h-9 rounded-xl items-center justify-center mb-0.5 ${inputText.trim() && !isLoading ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Send size={16} color={inputText.trim() ? 'white' : '#94a3b8'} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={tw`text-[10px] text-slate-400 text-center mt-2`}>
                        PencilLaw AI có thể mắc sai sót. Hãy kiểm tra thông tin quan trọng.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
