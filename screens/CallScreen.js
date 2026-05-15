import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Camera, AlertCircle } from 'lucide-react-native';
import tw from 'twrnc';
import { useSocket } from '../contextAPI/SocketProvider';

// Móc nối linh hoạt với WebRTC (Mobile)
let RTCView;
if (Platform.OS !== 'web') {
    try {
        const WebRTC = require('react-native-webrtc');
        RTCView = WebRTC.RTCView;
    } catch (e) {
        console.warn("RTCView not available");
    }
}

const { width, height } = Dimensions.get('window');

// Thành phần hiển thị Video đa nền tảng
const VideoView = ({ stream, isLocal = false, objectFit = 'cover' }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (Platform.OS === 'web' && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

    if (Platform.OS === 'web') {
        console.log(`[VideoView] Rendering Web video. Stream ID: ${stream.id}, Muted: ${isLocal}, Fit: ${objectFit}`);
        return (
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: objectFit || 'cover',
                    backgroundColor: '#111',
                    borderRadius: isLocal ? 16 : 0,
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                    zIndex: isLocal ? 10 : 1,
                    transition: 'all 0.4s ease-in-out',
                    boxShadow: isLocal ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)' : 'none'
                }}
            />
        );
    }

    if (RTCView) {
        // react-native-webrtc 118+ supports passing stream object or streamURL
        // Chúng ta thử lấy streamURL an toàn
        let streamURL = null;
        try {
            streamURL = typeof stream.toURL === 'function' ? stream.toURL() : stream;
        } catch (e) {
            streamURL = stream;
        }

        return (
            <RTCView
                streamURL={streamURL}
                style={tw`w-full h-full`}
                objectFit={objectFit}
                zOrder={isLocal ? 1 : 0}
                mirror={isLocal}
            />
        );
    }

    return null;
};

const CallScreen = () => {
    const navigation = useNavigation();
    const { 
        callStatus, 
        activeCall, 
        incomingCall, 
        acceptCall, 
        rejectCall, 
        hangUp,
        localStream,
        remoteStream,
        isWebRTCSupported,
        toggleMic,
        toggleVideo,
        switchCamera,
        audioAllowed,
        enableAudio
    } = useSocket();
    
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (callStatus === 'idle') {
            const timeout = setTimeout(() => {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Home');
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [callStatus]);

    const handleAccept = () => {
        if (incomingCall) {
            acceptCall(incomingCall.callerId, incomingCall.offer);
        }
    };

    const handleReject = () => {
        if (incomingCall) {
            rejectCall(incomingCall.callerId);
        }
    };

    const handleHangUp = () => {
        const targetId = activeCall?.isCaller ? activeCall.receiverId : activeCall?.callerId;
        hangUp(targetId);
    };

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
        toggleMic();
    };

    const handleToggleVideo = () => {
        setIsVideoOff(!isVideoOff);
        toggleVideo();
    };

    const handleSwitchCamera = () => {
        switchCamera();
    };

    const renderIncomingCall = () => (
        <View style={tw`flex-1 bg-slate-900 items-center justify-between py-20`}>
            <View style={tw`items-center`}>
                <View style={tw`w-32 h-32 rounded-full bg-indigo-500 items-center justify-center mb-6 shadow-2xl`}>
                    <Text style={tw`text-white text-5xl font-bold`}>
                        {incomingCall?.callerName?.charAt(0) || '?'}
                    </Text>
                </View>
                <Text style={tw`text-white text-3xl font-bold mb-2`}>{incomingCall?.callerName}</Text>
                <Text style={tw`text-indigo-400 text-lg`}>Cuộc gọi Video đến...</Text>
                
                {!isWebRTCSupported && Platform.OS !== 'web' && (
                    <View style={tw`mt-4 flex-row items-center bg-amber-500/20 px-4 py-2 rounded-xl`}>
                        <AlertCircle size={16} color="#F59E0B" />
                        <Text style={tw`text-amber-500 text-xs ml-2`}>Chế độ giả lập (Expo Go)</Text>
                    </View>
                )}
            </View>

            <View style={tw`flex-row w-full justify-around px-10`}>
                <View style={tw`items-center`}>
                    <TouchableOpacity 
                        onPress={handleReject}
                        style={tw`w-20 h-20 rounded-full bg-red-500 items-center justify-center shadow-lg mb-2`}
                    >
                        <PhoneOff size={32} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-white text-xs`}>Từ chối</Text>
                </View>
                <View style={tw`items-center`}>
                    <TouchableOpacity 
                        onPress={handleAccept}
                        style={tw`w-20 h-20 rounded-full bg-green-500 items-center justify-center shadow-lg mb-2`}
                    >
                        <Phone size={32} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-white text-xs`}>Chấp nhận</Text>
                </View>
            </View>
        </View>
    );

    const renderActiveCall = () => {
        const otherName = activeCall?.isCaller ? activeCall?.receiverName : activeCall?.callerName;
        
        return (
            <View style={tw`flex-1 bg-slate-950`}>
                {/* Main Video Area (Remote Stream) */}
                <View style={[tw`flex-1 bg-slate-900 items-center justify-center relative w-full h-full`, { minHeight: 400 }]}>
                    {remoteStream ? (
                        <VideoView stream={remoteStream} objectFit="contain" />
                    ) : (
                        <View style={tw`items-center`}>
                            <View style={tw`w-28 h-28 rounded-full bg-slate-800 items-center justify-center mb-6 border-4 border-slate-700`}>
                                <Text style={tw`text-white text-4xl font-bold`}>
                                    {otherName?.charAt(0)}
                                </Text>
                            </View>
                            <Text style={tw`text-white text-2xl font-bold`}>
                                {otherName}
                            </Text>
                            <Text style={tw`text-slate-400 mt-3 text-lg`}>
                                {callStatus === 'calling' ? 'Đang đổ chuông...' : 'Đang kết nối...'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Self View (Local Stream) */}
                <View style={[tw`absolute top-12 right-6 w-32 h-48 bg-slate-800 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-2xl`, { elevation: 15, zIndex: 50 }]}>
                    {localStream? (
                         <VideoView stream={localStream} isLocal={true} objectFit="cover" />
                    ) : (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <Video size={40} color="#6366F1" />
                            <Text style={tw`text-indigo-300 text-[10px] mt-2`}>Bạn</Text>
                        </View>
                    )}
                </View>

                {/* Timer Header for Connected Calls */}
                {callStatus === 'connected' && (
                    <View style={tw`absolute top-12 left-6 bg-black/40 px-4 py-2 rounded-full`}>
                        <Text style={tw`text-white font-bold`}>{formatTime(timer)}</Text>
                    </View>
                )}

                {/* Controls */}
                <View style={tw`bg-slate-900/90 absolute bottom-10 left-6 right-6 rounded-full p-4 flex-row justify-between items-center px-8 border border-slate-800 shadow-2xl`}>
                    <TouchableOpacity 
                        onPress={handleToggleMute}
                        style={tw`w-12 h-12 rounded-full ${isMuted ? 'bg-indigo-600' : 'bg-slate-800'} items-center justify-center`}
                    >
                        {isMuted ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={handleToggleVideo}
                        style={tw`w-12 h-12 rounded-full ${isVideoOff ? 'bg-indigo-600' : 'bg-slate-800'} items-center justify-center`}
                    >
                        {isVideoOff ? <VideoOff size={22} color="white" /> : <Video size={22} color="white" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={handleSwitchCamera}
                        style={tw`w-12 h-12 rounded-full bg-slate-800 items-center justify-center`}
                    >
                        <Camera size={22} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={handleHangUp}
                        style={tw`w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-2xl`}
                    >
                        <PhoneOff size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-900`}>
            {callStatus === 'receiving' ? renderIncomingCall() : renderActiveCall()}
            
            {/* Web Audio Permission Overlay */}
            {Platform.OS === 'web' && !audioAllowed && (
                <View style={tw`absolute inset-0 bg-black/80 flex-1 items-center justify-center z-[100] px-6`}>
                    <View style={tw`bg-slate-800 p-8 rounded-3xl items-center max-w-sm shadow-2xl border border-slate-700`}>
                        <View style={tw`w-20 h-20 rounded-full bg-indigo-500 items-center justify-center mb-6`}>
                            <Mic size={40} color="white" />
                        </View>
                        <Text style={tw`text-white text-2xl font-bold mb-3 text-center`}>Bật âm thanh cuộc gọi</Text>
                        <Text style={tw`text-slate-400 text-center mb-8`}>
                            Để nghe được tiếng chuông và đối phương trên trình duyệt, bạn cần cho phép âm thanh.
                        </Text>
                        <TouchableOpacity 
                            onPress={enableAudio}
                            style={tw`bg-indigo-600 px-10 py-4 rounded-2xl shadow-lg w-full items-center`}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Cho phép ngay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default CallScreen;
