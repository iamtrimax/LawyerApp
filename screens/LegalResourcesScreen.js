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
    Search,
    ArrowLeft,
    Clock,
    BookOpen,
    CircleHelp,
    Globe
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import summaryAPI from '../common';
import moment from 'moment';

export default function LegalResourcesScreen() {
    const navigation = useNavigation();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const limit = 10;

    const categories = ['All', 'Corporate', 'Commercial', 'Tax', 'Accounting'];
    const [selectedCategory, setSelectedCategory] = useState('All');

    const fetchResources = async (pageNum = 1, isRefresh = false) => {
        if (pageNum > 1) setLoadingMore(true);
        else setLoading(true);
        try {
            let url = `${summaryAPI.getLegalResources.url}?page=${pageNum}&limit=${limit}`;
            if (selectedCategory && selectedCategory !== 'All') {
                url += `&category=${selectedCategory}`;
            }
            if (searchQuery) {
                url += `&search=${searchQuery}`;
            }
            url += `&language=English`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                const newResources = Array.isArray(data.data) ? data.data : [];
                if (isRefresh || pageNum === 1) {
                    setResources(newResources);
                } else {
                    setResources(prev => [...prev, ...newResources]);
                }

                // If the number of items returned is less than the limit, there's no more data
                if (newResources.length < limit) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (error) {
            console.error("Fetch Legal Resources Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    // Handle search debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchResources(1, true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Handle category change
    useEffect(() => {
        setPage(1);
        fetchResources(1, true);
    }, [selectedCategory]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchResources(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchResources(nextPage);
        }
    };



    const renderResourceItem = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mb-4 overflow-hidden shadow-sm border border-slate-100`}
            onPress={() => navigation.navigate('LegalResourceDetail', { resource: item })}
        >
            {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={tw`w-full h-40`} resizeMode="cover" />
            ) : (
                <View style={tw`w-full h-40 bg-slate-50 items-center justify-center`}>
                    <BookOpen size={48} color="#CBD5E1" />
                </View>
            )}
            <View style={tw`p-4`}>
                <View style={tw`flex-row items-center mb-2`}>
                    <View style={tw`bg-indigo-100 px-2 py-0.5 rounded-md flex-row items-center`}>
                        <Globe size={10} color="#4F46E5" style={tw`mr-1`} />
                        <Text style={tw`text-indigo-700 text-[10px] font-bold uppercase`}>{item.category}</Text>
                    </View>
                    <Text style={tw`text-slate-400 text-xs ml-auto`}>
                        {item.publishedDate ? moment(item.publishedDate).format('MMM DD, YYYY') : moment(item.createdAt).format('MMM DD, YYYY')}
                    </Text>
                </View>
                <Text style={tw`text-lg font-bold text-slate-800 mb-2`} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={tw`text-slate-500 text-sm mb-3`} numberOfLines={2}>
                    {item.description}
                </Text>
                <View style={tw`flex-row items-center`}>
                    <View style={tw`flex-row items-center`}>
                        <Clock size={12} color="#64748B" />
                        <Text style={tw`text-slate-500 text-xs ml-1`}>{item.views || 0} views</Text>
                    </View>
                    <View style={tw`flex-row items-center ml-4`}>
                        <CircleHelp size={12} color="#64748B" />
                        <Text style={tw`text-slate-500 text-xs ml-1`}>English</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!hasMore) return (
            <View style={tw`py-4 items-center`}>
                <Text style={tw`text-slate-400 text-xs`}>No more resources</Text>
            </View>
        );

        return (
            <View style={tw`py-4`}>
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

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            {/* Header */}
            <View style={tw`bg-white pt-6 pb-4 px-4 shadow-sm z-10 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Legal Resources</Text>
            </View>

            <View style={tw`px-4 py-4 flex-1`}>
                <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 mb-4`}>
                    <Search size={20} color="#64748B" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-slate-700`}
                        placeholder="Search resources..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Categories Scroll */}
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
                    </View>
                ) : (
                    <FlatList
                        data={resources}
                        renderItem={renderResourceItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={tw`pb-10`}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#4F46E5" />
                        }
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={
                            <View style={tw`items-center justify-center mt-20`}>
                                <BookOpen size={64} color="#CBD5E1" />
                                <Text style={tw`text-slate-400 mt-4 text-lg`}>No resources found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView >
    );
}
