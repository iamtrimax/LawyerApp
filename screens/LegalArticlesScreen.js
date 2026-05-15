import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Linking
} from 'react-native';
import AppTextInput from '../helper/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
    Plus,
    Search,
    ChevronRight,
    ArrowLeft,
    Clock,
    User,
    Tag,
    BookOpen,
    Sparkles
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contextAPI/AuthProvider';
import summaryAPI from '../common';
import moment from 'moment';

export default function LegalArticlesScreen() {
    const navigation = useNavigation();
    const { user, isAuthenticated } = useAuth();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isAISearch, setIsAISearch] = useState(false);
    const [aiAnswer, setAiAnswer] = useState(''); // New state for AI answer
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const limit = 10;

    const categories = [
        'Tất cả', 'Hiến pháp', 'Bộ luật', 'Luật', 'Pháp lệnh', 'Lệnh',
        'Nghị quyết', 'Nghị quyết liên tịch', 'Nghị định',
        'Quyết định', 'Thông tư', 'Thông tư liên tịch', 'Khác'
    ];
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');


    const fetchArticles = useCallback(async (pageNum = 1, isRefreshing = false, query = '') => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
                setArticles([]);
                setAiAnswer('');
            } else {
                setLoadingMore(true);
            }

            // Nếu không có query và không phải đang load trang đầu (browse), thoát
            if (!query && pageNum === 1 && !isRefreshing) {
                // Fetch mặc định một số bài viết nếu cần, hoặc để trống
                // Ở đây ta giữ logic fetch bài viết mới nhất nếu không có query
            }

            let response;
            if (query) {
                // Luôn dùng AI Search khi có query
                const url = `${summaryAPI.AISearch.url}?query=${encodeURIComponent(query)}`;
                response = await fetch(url);
            } else {
                // Danh sách bài viết thông thường (khi chưa search)
                let url = `${summaryAPI.getArticles.url}?page=${pageNum}&limit=${limit}`;
                response = await fetch(url);
            }

            const data = await response.json();

            if (data.success || data.data) {
                let fetchedData = [];

                if (query) {
                    const aiData = data.data || {};
                    setAiAnswer(aiData.answer || "");
                    const sources = Array.isArray(aiData.sources) ? aiData.sources : [];

                    fetchedData = (sources || [])
                        .filter(s => s && (s._id || s.url))
                        .map((source, index) => ({
                            _id: source._id || `ai-source-${index}-${Date.now()}`,
                            title: source.title || 'Nguồn tham khảo',
                            category: source.category || 'Tài liệu tham khảo',
                            thumbnail: null,
                            content: source.content || '',
                            createdAt: new Date().toISOString(),
                            author: { userID: { fullname: "Nguồn AI" } },
                            views: 0,
                            sourceUrl: source.url
                        }));
                    setHasMore(false);
                } else {
                    setAiAnswer('');
                    fetchedData = Array.isArray(data.data?.articles) ? data.data.articles : [];
                    setHasMore(fetchedData.length === limit);
                }

                if (pageNum === 1) {
                    setArticles(fetchedData);
                } else {
                    setArticles(prev => [...prev, ...fetchedData]);
                }
                setPage(pageNum);
            }
        } catch (error) {
            console.error("Fetch Articles Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchArticles(1);
    }, [fetchArticles]);

    const onRefresh = () => {
        setRefreshing(true);
        setHasMore(true);
        fetchArticles(1, true, searchQuery);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchArticles(page + 1, false, searchQuery);
        }
    };

    const handleSearch = () => {
        fetchArticles(1, false, searchQuery);
    };

    const renderArticleItem = ({ item }) => {
        if (!item || !item._id) return null;
        
        return (
            <TouchableOpacity
                style={tw`bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-slate-100`}
                onPress={() => {
                    const id = item._id?.toString() || '';
                    const isExternalSource = id.startsWith('ai-source-') || id.startsWith('google-source-');
                    
                    if (isExternalSource) {
                        if (item.content && item.content?.length > 10) {
                            navigation.navigate('ArticleDetail', { article: item });
                        } else if (item.sourceUrl) {
                            Linking.openURL(item.sourceUrl);
                        }
                    } else {
                        navigation.navigate('ArticleDetail', { article: item });
                    }
                }}
            >
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={tw`w-full h-40`} resizeMode="cover" />
                ) : (
                    <View style={tw`w-full h-40 bg-slate-100 items-center justify-center`}>
                        <BookOpen size={48} color="#CBD5E1" />
                    </View>
                )}
                <View style={tw`p-4`}>
                    <View style={tw`flex-row items-center mb-2`}>
                        <View style={tw`bg-blue-100 px-2 py-0.5 rounded-md`}>
                            <Text style={tw`text-blue-700 text-[10px] font-bold uppercase`}>{item.category || 'Tin tức'}</Text>
                        </View>
                        <Text style={tw`text-slate-400 text-xs ml-auto`}>
                            {item.createdAt ? moment(item.createdAt).format('DD/MM/YYYY') : ''}
                        </Text>
                    </View>
                    <Text style={tw`text-lg font-bold text-slate-800 mb-2`} numberOfLines={2}>
                        {item.title || 'Không có tiêu đề'}
                    </Text>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`bg-slate-100 p-1 rounded-full`}>
                            <User size={12} color="#64748B" />
                        </View>
                        <Text style={tw`text-slate-500 text-xs ml-1`}>
                            {item.author?.userID?.fullname || "Nguồn tham khảo"}
                        </Text>
                        <View style={tw`flex-row items-center ml-4`}>
                            <Clock size={12} color="#64748B" />
                            <Text style={tw`text-slate-500 text-xs ml-1`}>{item.views || 0} lượt xem</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Bài viết pháp luật</Text>
                </View>
                {isAuthenticated && user?.role === 'lawyer' ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateArticle')}
                        style={tw`bg-blue-600 p-2 rounded-xl shadow-md`}
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={tw`px-4 py-4 flex-1`}>
                <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 mb-4`}>
                    <AppTextInput
                        style={tw`flex-1 ml-3`}
                        placeholder="Hỏi AI về pháp luật..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                    <View style={tw`ml-2 p-2 rounded-xl bg-blue-50`}>
                        <Sparkles size={20} color="#2563EB" fill="#2563EB" />
                    </View>
                </View>

                {loading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        style={tw`flex-1`}
                        data={articles.filter(item => item && item._id)}
                        renderItem={renderArticleItem}
                        keyExtractor={(item, index) => item?._id?.toString() || `item-${index}`}
                        contentContainerStyle={tw`pb-20`}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#2563EB" />
                        }
                        ListHeaderComponent={() => (
                            aiAnswer ? (
                                <View style={tw`bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100`}>
                                    <View style={tw`flex-row items-center mb-2`}>
                                        <Sparkles size={20} color="#2563EB" fill="#2563EB" />
                                        <Text style={tw`ml-2 text-blue-800 font-bold text-base`}>Câu trả lời từ AI</Text>
                                    </View>
                                    <Text style={tw`text-slate-700 text-base leading-6`}>
                                        {aiAnswer}
                                    </Text>
                                    <View style={tw`mt-3 pt-3 border-t border-blue-100`}>
                                        <Text style={tw`text-slate-500 text-xs italic`}>
                                            Câu trả lời được tổng hợp từ {articles.length} nguồn tài liệu tham khảo bên dưới.
                                        </Text>
                                    </View>
                                </View>
                            ) : null
                        )}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={() => (
                            loadingMore ? (
                                <View style={tw`py-4`}>
                                    <ActivityIndicator size="small" color="#2563EB" />
                                </View>
                            ) : null
                        )}
                        ListEmptyComponent={
                            <View style={tw`items-center justify-center mt-20`}>
                                <BookOpen size={64} color="#CBD5E1" />
                                <Text style={tw`text-slate-400 mt-4 text-lg text-center px-10`}>
                                    {isAISearch 
                                        ? (searchQuery ? "Không tìm thấy câu trả lời phù hợp" : "Hãy đặt câu hỏi cho AI để tìm hiểu về pháp luật")
                                        : "Không tìm thấy bài viết nào"}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView >
    );
}
