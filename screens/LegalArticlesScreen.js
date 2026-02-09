import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
    RefreshControl
} from 'react-native';
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


    const fetchArticles = useCallback(async (pageNum = 1, isRefreshing = false) => {
        if (!hasMore && pageNum > 1 && !isRefreshing) return;
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // console.log("Fetching articles with state:", {
            //     isAISearch,
            //     debouncedSearchQuery,
            //     selectedCategory
            // });

            let response;
            if (isAISearch && debouncedSearchQuery) {
                // AI Search call
                const url = `${summaryAPI.AISearch.url}?query=${encodeURIComponent(debouncedSearchQuery)}`;
                response = await fetch(url, {
                    method: summaryAPI.AISearch.method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                // Normal Search/List call
                let url = `${summaryAPI.getArticles.url}?page=${pageNum}&limit=${limit}`;
                if (selectedCategory !== 'Tất cả') {
                    url += `&category=${encodeURIComponent(selectedCategory)}`;
                }
                if (debouncedSearchQuery) {
                    url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
                }
                response = await fetch(url);
            }

            const data = await response.json();

            // Allow processing if success is true OR if it's AI search and we have data (backend might return success:false)
            if (data.success || (isAISearch && data.data)) {
                let fetchedData = [];

                if (isAISearch) {
                    const aiData = data.data || {};
                    const answer = aiData.answer || "";
                    const sources = Array.isArray(aiData.sources) ? aiData.sources : [];

                    setAiAnswer(answer);

                    // Map sources to match article structure for rendering
                    fetchedData = sources.map((source, index) => ({
                        _id: source._id || `ai-source-${index}`,
                        title: source.title,
                        category: source.category || 'Tài liệu tham khảo',
                        // Add defaults for fields that might be missing in sources
                        thumbnail: null,
                        createdAt: new Date().toISOString(), // or null/undefined, handle in render
                        author: { userID: { fullname: "Nguồn AI" } },
                        views: 0,
                        // If the source has a URL, we might want to store it to open on click
                        sourceUrl: source.url
                    }));
                } else {
                    setAiAnswer(''); // Clear answer in normal mode or if switching back
                    fetchedData = Array.isArray(data.data.articles) ? data.data.articles : [];
                }

                if (pageNum === 1) {
                    setArticles(fetchedData);
                } else {
                    setArticles(prev => [...prev, ...fetchedData]);
                }

                // Disable pagination for AI search
                if (isAISearch) {
                    setHasMore(false);
                } else {
                    setHasMore(fetchedData.length === limit);
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
    }, [isAISearch, debouncedSearchQuery, selectedCategory]);


    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 1000);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        // Clear answer when switching modes or categories, unless it's a search
        if (!isAISearch) setAiAnswer('');
        fetchArticles(1);
    }, [selectedCategory, debouncedSearchQuery, isAISearch, fetchArticles]);

    const onRefresh = () => {
        setRefreshing(true);
        setHasMore(true);
        fetchArticles(1, true);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchArticles(page + 1);
        }
    };

    const renderArticleItem = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-slate-100`}
            onPress={() => {
                // If it's an AI source with a direct URL, maybe handle differently?
                // For now, assume it navigates to ArticleDetail or similar.
                // If item has no _id or real content content, ArticleDetail might fail.
                // If AI sources are real articles just with mapped fields, it's fine.
                // If they are external links, we might need a webview or Linking.openURL.

                if (item.sourceUrl) {
                    // Logic for external source or navigating to detail if we can fetch it by URL/ID
                    // For now, let's just pass the item. If it's not a full article object, ArticleDetail needs to handle it.
                    navigation.navigate('ArticleDetail', { article: item });
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
                    {item.title}
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
                    <Search size={20} color={isAISearch ? "#2563EB" : "#64748B"} />
                    <TextInput
                        style={tw`flex-1 ml-3 text-slate-700`}
                        placeholder={isAISearch ? "Hỏi AI về điều luật..." : "Tìm kiếm bài viết..."}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity
                        onPress={() => setIsAISearch(!isAISearch)}
                        style={tw`ml-2 p-2 rounded-xl ${isAISearch ? 'bg-blue-50' : 'bg-slate-50'}`}
                    >
                        <Sparkles size={20} color={isAISearch ? "#2563EB" : "#64748B"} fill={isAISearch ? "#2563EB" : "none"} />
                    </TouchableOpacity>
                </View>

                {/* Categories Scroll wrapped to prevent stretching */}
                <View style={tw`h-14 mb-4`}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={categories}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => setSelectedCategory(item)}
                                style={tw`mr-2 px-6 py-2 rounded-full self-start ${selectedCategory === item ? 'bg-blue-600' : 'bg-white border border-slate-100'}`}
                            >
                                <Text style={tw`font-medium ${selectedCategory === item ? 'text-white' : 'text-slate-500'}`}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {loading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        style={tw`flex-1`}
                        data={articles}
                        renderItem={renderArticleItem}
                        keyExtractor={item => item._id}
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
                                <Text style={tw`text-slate-400 mt-4 text-lg`}>
                                    {isAISearch ? "Không tìm thấy câu trả lời phù hợp" : "Không tìm thấy bài viết nào"}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView >
    );
}
