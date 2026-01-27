import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    Linking,
    Alert,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
    Search,
    ArrowLeft,
    FileText,
    Download,
    Filter,
    BookOpen,
    ExternalLink,
    Plus
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import summaryAPI from '../common';
import { useAuth } from '../contextAPI/AuthProvider';

export default function LegalLibraryScreen() {
    const navigation = useNavigation();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const limit = 10;

    const categories = ['All', 'Civil', 'Criminal', 'Business', 'Labor', 'Family', 'Other'];
    const [selectedCategory, setSelectedCategory] = useState('All');

    const fetchForms = async (pageNum = 1, isRefresh = false) => {
        if (pageNum > 1) setLoadingMore(true);
        else if (!isRefresh) setLoading(true);

        try {
            let url = `${summaryAPI.getLegalForms.url}?page=${pageNum}&limit=${limit}`;
            if (selectedCategory !== 'All') {
                url += `&category=${selectedCategory}`;
            }
            if (searchQuery) {
                url += `&search=${searchQuery}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                const newForms = Array.isArray(data.data) ? data.data : [];
                if (isRefresh || pageNum === 1) {
                    setForms(newForms);
                } else {
                    setForms(prev => [...prev, ...newForms]);
                }

                if (newForms.length < limit) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (error) {
            console.error("Fetch Legal Forms Error:", error);
            Alert.alert("Error", "Could not fetch legal forms. Please try again later.");
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    // Handle initial fetch and focus
    useFocusEffect(
        useCallback(() => {
            setPage(1);
            fetchForms(1, true);
        }, [selectedCategory]) // Refresh when category changes
    );

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchForms(1, true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchForms(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchForms(nextPage);
        }
    };

    const handleDownload = (url) => {
        if (url) {
            Linking.openURL(url).catch(err => {
                console.error("Link Error:", err);
                Alert.alert("Error", "Could not open the file link.");
            });
        }
    };

    const renderFormItem = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mb-4 p-4 shadow-sm border border-slate-100 flex-row items-center`}
            onPress={() => navigation.navigate('LegalFormDetail', { form: item })}
        >
            {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={tw`w-16 h-16 rounded-xl mr-4`} resizeMode="cover" />
            ) : (
                <View style={tw`w-16 h-16 bg-slate-50 rounded-xl items-center justify-center mr-4 border border-slate-50`}>
                    <FileText size={24} color="#6366F1" />
                </View>
            )}

            <View style={tw`flex-1`}>
                <View style={tw`bg-slate-100 self-start px-2 py-0.5 rounded-md mb-1`}>
                    <Text style={tw`text-slate-600 text-[10px] font-bold uppercase`}>{item.category}</Text>
                </View>
                <Text style={tw`text-base font-bold text-slate-800 mb-1`} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={tw`text-slate-500 text-xs mb-2`} numberOfLines={2}>
                    {item.description}
                </Text>
                <View style={tw`flex-row items-center`}>
                    <View style={tw`bg-blue-50 px-1.5 py-0.5 rounded flex-row items-center`}>
                        <Text style={tw`text-blue-600 text-[10px] font-bold`}>{item.fileType || 'DOCX'}</Text>
                    </View>
                    <Text style={tw`text-slate-400 text-[10px] ml-3`}>
                        {item.downloadCount || 0} downloads
                    </Text>
                    {item.isFree ? (
                        <Text style={tw`text-green-600 text-[10px] font-bold ml-auto`}>FREE</Text>
                    ) : (
                        <Text style={tw`text-amber-600 text-[10px] font-bold ml-auto`}>PREMIUM</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                onPress={() => handleDownload(item.fileUrl)}
                style={tw`ml-4 bg-indigo-600 p-3 rounded-full shadow-md`}
            >
                <Download size={20} color="white" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!hasMore) return (
            <View style={tw`py-6 items-center`}>
                <Text style={tw`text-slate-400 text-xs`}>No more forms available</Text>
            </View>
        );

        return (
            <View style={tw`py-6`}>
                {loadingMore ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                    <TouchableOpacity
                        onPress={handleLoadMore}
                        style={tw`bg-white border border-indigo-100 py-3 rounded-xl items-center mx-10 shadow-sm`}
                    >
                        <Text style={tw`text-indigo-600 font-bold`}>Load More</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const { user } = useAuth();

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Thư viện pháp luật</Text>
            </View>

            <View style={tw`px-4 py-4 flex-1`}>
                {/* Search Bar */}
                <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 mb-4`}>
                    <Search size={20} color="#64748B" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-slate-700`}
                        placeholder="Tìm kiếm biểu mẫu..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Categories */}
                <View style={tw`mb-4`}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={categories}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => setSelectedCategory(item)}
                                style={tw`mr-2 px-4 py-2 rounded-full ${selectedCategory === item ? 'bg-indigo-600' : 'bg-white border border-slate-100'}`}
                            >
                                <Text style={tw`font-medium ${selectedCategory === item ? 'text-white' : 'text-slate-500'}`}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {loading && page === 1 ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={tw`mt-4 text-slate-500`}>Đang tải biểu mẫu...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={forms}
                        renderItem={renderFormItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={tw`pb-10`}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#4F46E5" />
                        }
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={
                            <View style={tw`items-center justify-center mt-20`}>
                                <BookOpen size={64} color="#CBD5E1" />
                                <Text style={tw`text-slate-400 mt-4 text-lg`}>Không có biểu mẫu nào</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {user?.role === 'lawyer' && (
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateLegalForm')}
                    style={tw`absolute bottom-8 right-6 bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-lg border-4 border-white`}
                >
                    <Plus size={32} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView >
    );
}
