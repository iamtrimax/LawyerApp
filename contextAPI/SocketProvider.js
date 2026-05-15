import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, AppState } from 'react-native';
import storage from '../utils/storage';
import { Audio } from 'expo-av';
import { useAuth } from './AuthProvider';
import { socket_url } from '../common';

// Khởi tạo các biến native WebRTC
let NativeRTCPeerConnection, NativeRTCIceCandidate, NativeRTCSessionDescription, nativeMediaDevices;

if (Platform.OS !== 'web') {
    try {
        const WebRTC = require('react-native-webrtc');
        NativeRTCPeerConnection = WebRTC.RTCPeerConnection;
        NativeRTCIceCandidate = WebRTC.RTCIceCandidate;
        NativeRTCSessionDescription = WebRTC.RTCSessionDescription;
        nativeMediaDevices = WebRTC.mediaDevices;
    } catch (e) {
        console.warn('Failed to load react-native-webrtc:', e);
    }
}

// Cấu hình cách hiển thị thông báo khi app đang mở
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const CALL_CATEGORY = 'incoming-call';
const setNotificationCategories = async () => {
    if (Platform.OS === 'web') return; // Không hỗ trợ trên Web

    try {
        await Notifications.setNotificationCategoriesAsync([
            {
                identifier: CALL_CATEGORY,
                actions: [
                    {
                        identifier: 'ACCEPT_CALL',
                        buttonTitle: '✅ Chấp nhận',
                        options: { opensAppToForeground: true },
                    },
                    {
                        identifier: 'REJECT_CALL',
                        buttonTitle: '❌ Từ chối',
                        options: { opensAppToForeground: false, isDestructive: true },
                    },
                ],
            },
        ]);
    } catch (e) {
        console.warn("Lỗi thiết lập category thông báo:", e);
    }
};

// ===== KHỞI TẠO WEBRTC THEO PLATFORM =====
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices;
let isWebRTCSupported = false;
let webrtcInitError = null; // Lưu lỗi khởi tạo để hiển thị chi tiết

if (Platform.OS === 'web') {
    RTCPeerConnection = window.RTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription;
    mediaDevices = window.navigator.mediaDevices;
    isWebRTCSupported = !!RTCPeerConnection;

    if (!isWebRTCSupported) {
        webrtcInitError = 'Trình duyệt không hỗ trợ WebRTC (RTCPeerConnection không tồn tại).';
        console.error('[WebRTC][Web] ❌ RTCPeerConnection không khả dụng trên trình duyệt này.');
    } else if (!mediaDevices) {
        webrtcInitError = 'navigator.mediaDevices không khả dụng. Có thể trang không chạy trên HTTPS.';
        console.warn('[WebRTC][Web] ⚠️ mediaDevices undefined - kiểm tra HTTPS hoặc quyền truy cập.');
    } else {
        console.log('[WebRTC][Web] ✅ WebRTC khả dụng qua browser APIs.');
    }
} else {
    // Native: Sử dụng static import từ react-native-webrtc
    if (NativeRTCPeerConnection) {
        RTCPeerConnection = NativeRTCPeerConnection;
        RTCIceCandidate = NativeRTCIceCandidate;
        RTCSessionDescription = NativeRTCSessionDescription;
        mediaDevices = nativeMediaDevices;
        isWebRTCSupported = true;
        console.log('[WebRTC][Native] ✅ react-native-webrtc đã load thành công (static import).');
        console.log('[WebRTC][Native] Modules:', {
            RTCPeerConnection: !!RTCPeerConnection,
            RTCIceCandidate: !!RTCIceCandidate,
            RTCSessionDescription: !!RTCSessionDescription,
            mediaDevices: !!mediaDevices,
        });
    } else {
        isWebRTCSupported = false;
        webrtcInitError = 'react-native-webrtc native module không khả dụng. '
            + 'Nguyên nhân có thể: (1) Chưa chạy prebuild/build native, '
            + '(2) Đang dùng Expo Go (không hỗ trợ native modules), '
            + '(3) Module chưa được link đúng trong Gradle/Podfile.';
        console.error('[WebRTC][Native] ❌ Static import thành công nhưng module undefined!');
        console.error('[WebRTC][Native] Chi tiết:', {
            NativeRTCPeerConnection: typeof NativeRTCPeerConnection,
            NativeRTCIceCandidate: typeof NativeRTCIceCandidate,
            NativeRTCSessionDescription: typeof NativeRTCSessionDescription,
            nativeMediaDevices: typeof nativeMediaDevices,
            platform: Platform.OS,
        });
    }
}

const SocketContext = createContext();
const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
        urls: 'turn:global.relay.metered.ca:80',
        username: '5271e3980890c899fc9f2fc7',
        credential: 'zjMlpgBDZayGqxeX'
    },
    {
        urls: 'turn:global.relay.metered.ca:443',
        username: '5271e3980890c899fc9f2fc7',
        credential: 'zjMlpgBDZayGqxeX'
    },
    {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: '5271e3980890c899fc9f2fc7',
        credential: 'zjMlpgBDZayGqxeX'
    }
];
const METERED_URL = `https://luatsutonghop.metered.live/api/v1/turn/credentials?apiKey=ccbfe121a13b7ca6effae2164e3b3418bab4`;

const optimizeSDP = (sdp) => sdp;

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, receiving, connected
    const [activeCall, setActiveCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [iceServers, setIceServers] = useState(DEFAULT_ICE_SERVERS);
    const [audioAllowed, setAudioAllowed] = useState(Platform.OS !== 'web'); // Web requires interaction

    const pc = useRef(null);
    const remoteSocketIdRef = useRef(null);
    const pendingCandidates = useRef([]);
    const pendingAnswer = useRef(null);
    const soundRef = useRef(null);

    const fetchIceServers = async () => {
        try {
            const response = await fetch(METERED_URL);
            const data = await response.json();
            if (Array.isArray(data)) {
                const normalizedData = data.map(s => ({ ...s, urls: Array.isArray(s.urls) ? s.urls : [s.urls] }));
                const allServers = [...DEFAULT_ICE_SERVERS, ...normalizedData];
                setIceServers(allServers);
                console.log(`✅ ICE Servers updated: ${allServers.length} servers (including TURN)`);
                await storage.setItem('@ice_servers', JSON.stringify(allServers));
            } else {
                console.warn("⚠️ TURN API returned unexpected format:", data);
            }
        } catch (error) {
            console.error("❌ Failed to fetch TURN credentials:", error);
        }
    };

    useEffect(() => {
        const initIce = async () => {
            const cached = await storage.getItem('@ice_servers');
            if (cached) setIceServers(JSON.parse(cached));
            fetchIceServers();
        };
        initIce();
        setNotificationCategories();

        // --- HỆ THỐNG CHẨN ĐOÁN WEBRTC (DEBUG ALERTS) ---
        const runDiagnostic = async () => {
            let statusMessage = "";
            let isError = false;

            if (!isWebRTCSupported) {
                // Hiển thị lỗi gốc đầy đủ (message + stack trace) giống hình debug
                statusMessage = webrtcInitError || 'WebRTC không khả dụng. Không có thông tin lỗi chi tiết.';
                isError = true;
            } else if (!RTCPeerConnection) {
                statusMessage = 'RTCPeerConnection bị undefined sau khi require().\n'
                    + 'Module đã load nhưng giá trị là undefined.\n'
                    + 'Kiểm tra lại bản build native (prebuild + run).';
                isError = true;
            } else if (!mediaDevices) {
                statusMessage = 'mediaDevices không khả dụng.\n'
                    + 'RTCPeerConnection OK nhưng không thể truy cập camera/mic.\n'
                    + 'Kiểm tra quyền Camera/Microphone trong Settings.';
                isError = true;
            } else {
                statusMessage = 'WebRTC đã sẵn sàng!\n'
                    + `Module Native loaded OK.\n`
                    + `Platform: ${Platform.OS}\n`
                    + `ICE Servers: ${iceServers.length} configured`;
            }

            console.log('[WebRTC][Diagnostic]', statusMessage.replace(/\n/g, ' | '));

            if (Platform.OS !== 'web') {
                Alert.alert(
                    isError ? "❌ WebRTC Load Failed" : "✅ WebRTC Ready",
                    statusMessage,
                    [{ text: "OK", style: "default" }]
                );
            }
        };

        // Chạy chẩn đoán sau khi app khởi động 2 giây để đảm bảo mọi thứ đã load xong
        const diagnosticTimeout = setTimeout(runDiagnostic, 2000);
        return () => clearTimeout(diagnosticTimeout);
    }, []);

    const stopSound = async () => {
        if (soundRef.current) {
            try {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                }
                soundRef.current = null;
            } catch (e) { }
        }
    };

    const playSound = async (type) => {
        if (Platform.OS === 'web' && !audioAllowed) {
            console.warn("Audio blocked by browser auto-play policy. User interaction required.");
            return;
        }
        try {
            await stopSound();
            if (Platform.OS !== 'web') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            }
            const soundSource = type === 'calling' ? require('../assets/calling.mp3') : require('../assets/ringtone.mp3');
            const { sound } = await Audio.Sound.createAsync(soundSource, { isLooping: true, volume: 1.0 });
            soundRef.current = sound;
            await sound.playAsync();
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    };

    const enableAudio = () => {
        setAudioAllowed(true);
        // Play a silent sound to "unlock" audio context
        Audio.Sound.createAsync(require('../assets/calling.mp3'), { volume: 0 }).then(({ sound }) => {
            sound.playAsync().then(() => sound.unloadAsync());
        }).catch(() => { });
    };

    // --- TIMERS & SOUNDS ---
    useEffect(() => {
        let timer;
        if (callStatus === 'receiving') {
            playSound('ringtone');
            timer = setTimeout(() => { if (callStatus === 'receiving') cleanupCall(); }, 90000);
        } else if (callStatus === 'calling') {
            playSound('calling');
            timer = setTimeout(() => {
                if (callStatus === 'calling') {
                    hangUp(activeCall?.receiverId);
                    Alert.alert("Thông báo", "Người dùng không nhấc máy.");
                }
            }, 90000);
        } else {
            stopSound();
        }
        return () => {
            stopSound();
            if (timer) clearTimeout(timer);
        };
    }, [callStatus]);

    // --- SOCKET INITIALIZATION ---
    const currentUserId = React.useMemo(() => {
        return user?._id || `guest_${Math.random().toString(36).substring(7)}`;
    }, [user?._id]);

    useEffect(() => {
        console.log('--- Initializing Socket for:', currentUserId, '---');
        const newSocket = io(socket_url, { transports: ['websocket', 'polling'], autoConnect: true });

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            newSocket.emit('register', currentUserId);

            // Chỉ xử lý cuộc gọi cho người dùng thật
            if (user?._id && pendingAnswer.current) {
                const { callerId, offer } = pendingAnswer.current;
                setTimeout(() => { acceptCall(callerId, offer); pendingAnswer.current = null; }, 1000);
            }
        });

        newSocket.on('incoming-call', (data) => {
            console.log('--- SIGNAL: incoming-call ---');
            setIncomingCall(data);
            if (data.callerSocketId) remoteSocketIdRef.current = data.callerSocketId;

            // Nếu người dùng đã nhấn Accept từ thông báo trước đó (đang ở trạng thái connecting)
            // thì chúng ta thực hiện accept ngay khi nhận được offer từ socket
            setCallStatus(prevStatus => {
                if (prevStatus === 'connecting' || prevStatus === 'connected') {
                    // Trì hoãn một chút để state incomingCall kịp cập nhật
                    setTimeout(() => acceptCall(data.callerId, data.offer), 100);
                    return 'connected';
                }
                return 'receiving';
            });
        });

        newSocket.on('call-accepted', async (data) => {
            console.log('--- SIGNAL: call-accepted ---', { hasAnswer: !!data.answer, from: data.fromSocketId });
            const acceptorSocketId = data.fromSocketId || data.acceptorSocketId;
            if (acceptorSocketId) remoteSocketIdRef.current = acceptorSocketId;

            if (pc.current && data.answer && isWebRTCSupported) {
                try {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    setCallStatus('connected');
                    if (pendingCandidates.current.length > 0) {
                        for (const c of pendingCandidates.current) await pc.current.addIceCandidate(new RTCIceCandidate(c));
                        pendingCandidates.current = [];
                    }
                } catch (e) {
                    console.error('Error in call-accepted:', e);
                }
            } else {
                setCallStatus('connected');
            }
        });

        newSocket.on('ice-candidate', async (data) => {
            if (!data.candidate || !isWebRTCSupported) return;
            console.log('📡 Received ICE Candidate');
            if (!pc.current || !pc.current.remoteDescription) {
                console.log('⏳ Storing candidate (remoteDesc not set)');
                pendingCandidates.current.push(data.candidate);
                return;
            }
            try {
                const candidate = data.candidate.candidate ? data.candidate : new RTCIceCandidate(data.candidate);
                await pc.current.addIceCandidate(candidate);
            } catch (e) {
                console.warn('❌ Error adding ICE candidate:', e.message);
            }
        });

        newSocket.on('hang-up', () => {
            console.log('--- SIGNAL: hang-up ---');
            cleanupCall();
        });

        newSocket.on('call-rejected', () => cleanupCall());

        // Push notification responses
        const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const { actionIdentifier, notification: { request: { content: { data } } } } = response;
            if (actionIdentifier === 'ACCEPT_CALL' && data.callerId) {
                if (newSocket.connected) {
                    // Cần force set status để tránh UI nhảy loạn
                    setCallStatus('connected');
                    acceptCall(data.callerId, data.offer);
                } else {
                    pendingAnswer.current = { callerId: data.callerId, offer: data.offer };
                }
            } else if (actionIdentifier === 'REJECT_CALL') {
                rejectCall(data.callerId);
            }
        });

        // Background Push Listeners
        const backgroundListener = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data.action === 'hang-up') cleanupCall();
        });

        // Register push token
        const registerPush = async () => {
            if (Platform.OS !== 'web') {
                const token = await registerForPushNotificationsAsync();
                if (token && newSocket.connected) newSocket.emit('update-push-token', { userId: user?._id, pushToken: token });
            }
        };
        registerPush();

        setSocket(newSocket);
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && newSocket.connected && user?._id) newSocket.emit('register', user._id);
        });

        return () => {
            console.log('--- Cleaning up Socket ---');
            notificationSubscription.remove();
            backgroundListener.remove();
            appStateSub.remove();
            newSocket.disconnect();
        };
    }, [user?._id]); // ONLY USER ID HERE

    const cleanupCall = () => {
        if (pc.current) { pc.current.close(); pc.current = null; }
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); }
        setRemoteStream(null);
        setCallStatus('idle');
        setIncomingCall(null);
        setActiveCall(null);
        remoteSocketIdRef.current = null;
        pendingCandidates.current = [];
    };

    const setupMedia = async () => {
        if (!isWebRTCSupported) {
            console.error('[WebRTC][setupMedia] ❌ Không thể khởi tạo media - WebRTC không được hỗ trợ.');
            console.error('[WebRTC][setupMedia] Lý do:', webrtcInitError || 'Không rõ nguyên nhân');
            return { getTracks: () => [] };
        }
        if (!mediaDevices) {
            console.error('[WebRTC][setupMedia] ❌ mediaDevices là null/undefined - không thể truy cập camera/mic.');
            return null;
        }
        try {
            if (Platform.OS !== 'web') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            }
            console.log('[WebRTC][setupMedia] Đang yêu cầu getUserMedia...');
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 1.7777777778 } }
            });
            console.log('[WebRTC][setupMedia] ✅ Stream nhận được:', {
                audioTracks: stream.getAudioTracks().length,
                videoTracks: stream.getVideoTracks().length,
            });
            setLocalStream(stream);
            return stream;
        } catch (e) {
            console.error('[WebRTC][setupMedia] ❌ getUserMedia thất bại:', e.name, '-', e.message);
            if (e.name === 'NotAllowedError') {
                console.error('[WebRTC][setupMedia] → Người dùng từ chối quyền Camera/Mic hoặc chưa cấp quyền.');
            } else if (e.name === 'NotFoundError') {
                console.error('[WebRTC][setupMedia] → Không tìm thấy thiết bị camera/microphone.');
            } else if (e.name === 'NotReadableError') {
                console.error('[WebRTC][setupMedia] → Thiết bị đang bị sử dụng bởi ứng dụng khác.');
            } else {
                console.error('[WebRTC][setupMedia] → Lỗi không xác định:', e);
            }
            return null;
        }
    };

    const createPeerConnection = (targetId, stream) => {
        if (!isWebRTCSupported || !stream || !socket) return null;
        console.log('🛠 Creating PeerConnection with', iceServers.length, 'ICE servers');
        const newPc = new RTCPeerConnection({
            iceServers: iceServers,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan'
        });

        newPc.oniceconnectionstatechange = () => {
            console.log('📶 ICE Connection State:', newPc.iceConnectionState);
            if (newPc.iceConnectionState === 'failed') {
                console.warn('⚠️ ICE Connection Failed - Possible TURN/Firewall issue');
                fetchIceServers();
            }
            if (newPc.iceConnectionState === 'connected' || newPc.iceConnectionState === 'completed') {
                setCallStatus('connected');
            }
        };

        newPc.onsignalingstatechange = () => {
            console.log('🚦 Signaling State:', newPc.signalingState);
        };

        stream.getTracks().forEach(track => newPc.addTrack(track, stream));

        newPc.onicecandidate = (e) => {
            if (e.candidate) {
                const target = remoteSocketIdRef.current || targetId;
                // Log loại candidate để debug (host, srflx, hay relay)
                const candidateType = e.candidate.candidate.split(' ')[7];
                console.log(`📡 Sending ICE Candidate (${candidateType}):`, e.candidate.candidate.substring(0, 50) + "...");
                socket.emit('ice-candidate', { targetId: target, candidate: e.candidate });
            }
        };

        // Hỗ trợ cả ontrack (Web/Mobile mới) và onaddstream (Mobile cũ)
        newPc.ontrack = (e) => {
            console.log('📺 Remote track received');
            if (e.streams && e.streams[0]) {
                setRemoteStream(e.streams[0]);
            }
        };

        newPc.onaddstream = (e) => {
            console.log('📺 Remote stream added (legacy)');
            if (e.stream) setRemoteStream(e.stream);
        };

        pc.current = newPc;
        return newPc;
    };

    const callUser = async (receiverId, receiverName, type) => {
        const stream = await setupMedia();
        if (!stream && isWebRTCSupported) return;
        let offer = { sdp: 'expo-go-mock-offer' };
        if (isWebRTCSupported) {
            const newPc = createPeerConnection(receiverId, stream);
            const rawOffer = await newPc.createOffer();
            offer = { type: rawOffer.type, sdp: optimizeSDP(rawOffer.sdp) };
            await newPc.setLocalDescription(offer);
        }
        const callData = { callerId: user?._id, callerName: user?.fullname, callerSocketId: socket?.id, receiverId, receiverName, type, offer };
        setActiveCall({ ...callData, isCaller: true });
        setCallStatus('calling');
        socket?.emit('call-user', callData);
    };

    const acceptCall = async (callerId, offer) => {
        console.log("--- acceptCall execution ---");

        // Nếu không có offer (thường là khi accept từ Push Notification được tối ưu)
        // chúng ta sẽ đổi trạng thái sang 'connecting' và chờ socket gửi offer đến
        if (!offer && !incomingCall?.offer) {
            console.log("No offer provided yet, waiting for socket sync...");
            setCallStatus('connecting');
            // Ghi chú: Logic incoming-call từ socket sẽ tự động gọi tạo connection khi có offer
            return;
        }

        const stream = await setupMedia();
        if (!stream) return;
        let answer = { sdp: 'expo-go-mock-answer' };
        if (isWebRTCSupported) {
            const target = remoteSocketIdRef.current || callerId;
            const newPc = createPeerConnection(target, stream);
            // Ưu tiên offer truyền vào, nếu không có thì lấy từ state incomingCall
            const actualOffer = offer ? (offer.sdp ? offer : (offer.offer || offer)) : incomingCall?.offer;

            if (actualOffer && actualOffer.sdp !== 'expo-go-mock-offer') {
                try {
                    console.log("[WebRTC] Setting Remote Description (Offer)...");
                    await newPc.setRemoteDescription(new RTCSessionDescription(actualOffer));
                    
                    console.log("[WebRTC] Creating Answer...");
                    const rawAnswer = await newPc.createAnswer();
                    
                    answer = { type: rawAnswer.type, sdp: optimizeSDP(rawAnswer.sdp) };
                    console.log("[WebRTC] Setting Local Description (Answer)...");
                    await newPc.setLocalDescription(answer);
                    
                    console.log("[WebRTC] Handshake prepared, sending answer to socket.");
                    if (pendingCandidates.current.length > 0) {
                        for (const c of pendingCandidates.current) await newPc.addIceCandidate(new RTCIceCandidate(c));
                        pendingCandidates.current = [];
                    }
                } catch (err) { console.error("❌ Handshake Error:", err); }
            }
        }
        socket?.emit('accept-call', { callerId: incomingCall?.callerId || callerId, answer });
        setCallStatus('connected');
        setActiveCall({ ...(incomingCall || {}), callerId: incomingCall?.callerId || callerId, isCaller: false });
        setIncomingCall(null);
    };

    const rejectCall = (callerId) => {
        socket?.emit('reject-call', { callerId: incomingCall?.callerId || callerId });
        cleanupCall();
    };

    const hangUp = (targetId) => {
        socket?.emit('hang-up', { targetId: targetId || remoteSocketIdRef.current });
        cleanupCall();
    };

    const toggleMic = () => localStream?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    const toggleVideo = () => localStream?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    const switchCamera = () => {
        const videoTrack = localStream?.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack._switchCamera === 'function') videoTrack._switchCamera();
    };

    const registerForPushNotificationsAsync = async () => {
        if (!Device.isDevice) return null;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') finalStatus = (await Notifications.requestPermissionsAsync()).status;
        if (finalStatus !== 'granted') return null;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId: "6df93f40-d7bf-440d-993e-9470da797545" })).data;
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Cuộc gọi đến',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: true,
                showBadge: true,
            });
        }
        return token;
    };

    return (
        <SocketContext.Provider value={{
            socket, socketUserId: currentUserId, incomingCall, callStatus, activeCall, localStream, remoteStream, isWebRTCSupported, audioAllowed,
            setCallStatus, setActiveCall, callUser, acceptCall, rejectCall, hangUp, toggleMic, toggleVideo, switchCamera, enableAudio
        }}>
            {children}
        </SocketContext.Provider>
    );
};
