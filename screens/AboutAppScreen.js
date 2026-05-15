import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { 
    ArrowLeft, 
    Target, 
    Users, 
    Zap, 
    Globe, 
    Search, 
    RefreshCcw, 
    Languages, 
    Heart, 
    Flag,
    ShieldCheck,
    MessageSquare
} from 'lucide-react-native';

const AdvantageItem = ({ icon: Icon, title, description, color = "blue" }) => (
    <View style={tw`flex-row mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-50`}>
        <View style={tw`bg-${color}-50 p-3 rounded-xl mr-4 items-center justify-center`}>
            <Icon size={24} color={tw.color(`${color}-600`)} />
        </View>
        <View style={tw`flex-1`}>
            <Text style={tw`text-slate-800 font-bold text-base mb-1`}>{title}</Text>
            {description && (
                <Text style={tw`text-slate-500 text-sm leading-5`}>{description}</Text>
            )}
        </View>
    </View>
);

export default function AboutAppScreen({ navigation }) {
    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={tw`bg-white pt-2 pb-4 px-4 shadow-sm z-10 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-slate-800 ml-2`}>Giới thiệu ứng dụng</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-12`}>
                {/* Hero Section */}
                <View style={tw`bg-blue-600 px-6 py-10 items-center justify-center relative overflow-hidden`}>
                    <View style={tw`absolute -right-10 -top-10 bg-white/10 w-40 h-40 rounded-full`} />
                    <View style={tw`absolute -left-5 -bottom-5 bg-white/10 w-24 h-24 rounded-full`} />
                    
                    <Image 
                        source={require("../assets/logo-removebg-preview.png")}
                        style={tw`w-48 h-48 mb-4`}
                        resizeMode="contain"
                    />
                    <Text style={tw`text-white text-2xl font-black text-center mb-2`}>APP PHÁP LUẬT VIỆT NAM</Text>
                    <View style={tw`bg-white/20 px-4 py-1 rounded-full`}>
                        <Text style={tw`text-white text-xs font-bold uppercase tracking-widest`}>Hân hạnh giới thiệu</Text>
                    </View>
                </View>

                {/* Content */}
                <View style={tw`px-5 -mt-6`}>
                    <View style={tw`bg-white p-6 rounded-3xl shadow-md border border-slate-100 mb-8`}>
                        <Text style={tw`text-slate-800 text-lg font-black mb-4`}>Ưu điểm vượt trội</Text>
                        
                        <AdvantageItem 
                            icon={Globe} 
                            title="Thư viện pháp luật khổng lồ"
                            description="Chứa hàng trăm văn bản pháp luật Việt Nam với cả hai ngôn ngữ Việt - Anh."
                            color="blue"
                        />
                        
                        <AdvantageItem 
                            icon={Users} 
                            title="Đội ngũ chuyên gia đông đảo"
                            description="Luật sư và chuyên gia pháp luật tại mọi tỉnh thành luôn sẵn sàng hỗ trợ."
                            color="indigo"
                        />

                        <AdvantageItem 
                            icon={Zap} 
                            title="Công nghệ AI tư vấn"
                            description="Ứng dụng công nghệ AI hiện đại tư vấn pháp luật nhanh chóng cho cộng đồng."
                            color="purple"
                        />
                        <AdvantageItem 
                            icon={Search} 
                            title="Tìm kiếm thông minh"
                            description="Chức năng tìm kiếm theo chủ đề pháp luật giúp tra cứu nhanh chóng."
                            color="amber"
                        />

                        <AdvantageItem 
                            icon={RefreshCcw} 
                            title="Luôn cập nhật mới nhất"
                            description="Cung cấp, tra cứu thông tin văn bản sửa đổi, bổ sung kịp thời."
                            color="rose"
                        />

                        <AdvantageItem 
                            icon={Languages} 
                            title="Song ngữ Việt - Anh"
                            description="Hỗ trợ học tập và làm việc hiệu quả với người nước ngoài."
                            color="sky"
                        />
                    </View>

                    {/* App Status */}
                    <View style={tw`flex-row gap-4 mb-8`}>
                        <View style={tw`flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100 items-center justify-center`}>
                            <Image 
                                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" }}
                                style={tw`w-8 h-8 mb-2 opacity-50`}
                            />
                            <Text style={tw`text-blue-700 font-bold text-xs text-center`}>Phiên bản Android</Text>
                            <Text style={tw`text-blue-600 font-black text-sm text-center`}>Tải ngay - Miễn phí</Text>
                        </View>
                        <View style={tw`flex-1 bg-slate-100 p-4 rounded-2xl border border-slate-200 items-center justify-center`}>
                            <Flag size={24} color="#64748B" style={tw`mb-2`} />
                            <Text style={tw`text-slate-500 font-bold text-xs text-center`}>Phiên bản iOS</Text>
                            <Text style={tw`text-slate-400 font-bold text-sm text-center`}>Sắp cập nhật</Text>
                        </View>
                    </View>

                    {/* Mission Section */}
                    <View style={tw`bg-blue-900 p-8 rounded-3xl shadow-xl relative overflow-hidden`}>
                        <View style={tw`absolute right-0 bottom-0 opacity-10`}>
                            <Heart size={120} color="white" fill="white" />
                        </View>
                        
                        <Text style={tw`text-white/70 text-xs font-bold uppercase tracking-widest mb-3`}>Nỗ lực phụng sự</Text>
                        <Text style={tw`text-white text-lg font-bold leading-7 mb-6`}>
                            "Với nỗ lực phụng sự cho nghề luật, chúng tôi hy vọng tạo ra một công cụ tra cứu pháp luật nhanh gọn, giúp những người học luật và hành nghề luật thuận tiện nhất."
                        </Text>
                        
                        <View style={tw`h-px bg-white/20 w-full mb-6`} />
                        
                        <Text style={tw`text-blue-200 text-sm italic leading-5`}>
                            Những kiến tạo nhỏ bé của chúng tôi rất mong nhận được sự góp ý của người dùng, để chúng tôi ngày càng nâng cấp và hoàn thiện hơn.
                        </Text>
                    </View>

                    <Text style={tw`text-center text-slate-400 text-xs mt-8 mb-4`}>
                        © 2026 App Pháp Luật Việt Nam. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
