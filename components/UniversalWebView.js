import React, { useEffect } from 'react';
import { Platform, View, Text } from 'react-native';

// Chỉ require react-native-webview trên nền tảng native để tránh lỗi build trên Web
let WebView;
try {
    if (Platform.OS !== 'web') {
        WebView = require('react-native-webview').WebView;
    }
} catch (e) {
    console.warn("WebView is not available on this platform");
}

/**
 * Thành phần WebView hỗ trợ đa nền tảng (Mobile & Web)
 */
const UniversalWebView = ({ source, style, onMessage, ...props }) => {
    // Xử lý riêng cho nền tảng Web
    if (Platform.OS === 'web') {
        useEffect(() => {
            // Giả lập đối tượng ReactNativeWebView trên Web để hỗ trợ onMessage
            if (onMessage && typeof window !== 'undefined') {
                window.ReactNativeWebView = {
                    postMessage: (data) => {
                        onMessage({
                            nativeEvent: { data }
                        });
                    }
                };
            }
        }, [onMessage]);

        // Trường hợp render HTML trực tiếp
        if (source && source.html) {
            return (
                <View style={[style, { overflow: 'auto' }]}>
                    <div 
                        dangerouslySetInnerHTML={{ __html: source.html }} 
                        style={{ 
                            width: '100%', 
                            height: 'auto', 
                            border: 'none',
                            outline: 'none',
                            overflow: 'visible'
                        }}
                    />
                </View>
            );
        }

        // Trường hợp render URL (iframe)
        if (source && source.uri) {
            return (
                <iframe 
                    src={source.uri} 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        border: 'none',
                        ...style 
                    }}
                    title="WebView Content"
                />
            );
        }

        return (
            <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }]}>
                <Text style={{ color: '#64748b' }}>Không có nội dung hiển thị</Text>
            </View>
        );
    }

    // fallback cho Native (iOS/Android)
    if (WebView) {
        return <WebView source={source} style={style} onMessage={onMessage} {...props} />;
    }

    return (
        <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' }]}>
            <Text style={{ color: '#ef4444' }}>WebView không khả dụng trên thiết bị này</Text>
        </View>
    );
};

export default UniversalWebView;
