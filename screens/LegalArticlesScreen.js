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
    BookOpen
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

    const categories = ['Tất cả', 'Dân sự', 'Hình sự', 'Đất đai', 'Hôn nhân', 'Lao động', 'Kinh doanh', 'Khác'];
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    const fetchArticles = async () => {
        try {
            const response = await fetch(summaryAPI.getArticles.url);
            const data = await response.json();
            if (data.success) {
                setArticles(Array.isArray(data.data.articles) ? data.data.articles : []);
            }
        } catch (error) {
            console.error("Fetch Articles Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchArticles();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchArticles();
    };

    const filteredArticles = Array.isArray(articles) ? articles.filter(article => {
        if (!article || typeof article !== 'object') return false;
        const matchesCategory = selectedCategory === 'Tất cả' || article.category === selectedCategory;
        const titleMatch = article.title ? article.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        return matchesCategory && titleMatch;
    }) : [];

    const renderArticleItem = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-slate-100`}
            onPress={() => navigation.navigate('ArticleDetail', { article: item })}
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
                        <Text style={tw`text-blue-700 text-[10px] font-bold uppercase`}>{item.category}</Text>
                    </View>
                    <Text style={tw`text-slate-400 text-xs ml-auto`}>
                        {moment(item.createdAt).format('DD/MM/YYYY')}
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
                        {item.author?.userID?.fullname || "Luật sư"}
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

            <View style={tw`px-4 py-4`}>
                <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 mb-4`}>
                    <Search size={20} color="#64748B" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-slate-700`}
                        placeholder="Tìm kiếm bài viết..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Categories Scroll */}
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={item => item}
                    style={tw`mb-4`}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedCategory(item)}
                            style={tw`mr-2 px-4 py-2 rounded-full ${selectedCategory === item ? 'bg-blue-600' : 'bg-white border border-slate-100'}`}
                        >
                            <Text style={tw`font-medium ${selectedCategory === item ? 'text-white' : 'text-slate-500'}`}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />

                {loading ? (
                    <View style={tw`flex-1 items-center justify-center mt-20`}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredArticles}
                        renderItem={renderArticleItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={tw`pb-20`}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#2563EB" />
                        }
                        ListEmptyComponent={
                            <View style={tw`items-center justify-center mt-20`}>
                                <BookOpen size={64} color="#CBD5E1" />
                                <Text style={tw`text-slate-400 mt-4 text-lg`}>Không tìm thấy bài viết nào</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView >
    );
}
