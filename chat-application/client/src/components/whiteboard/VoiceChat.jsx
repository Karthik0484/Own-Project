import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Mic, MicOff, Volume2, VolumeX, Users } from 'lucide-react';

const VoiceChat = ({ chatId, isEnabled, onToggle }) => {
  const socket = useSocket();
  const { userInfo } = useAppStore();
  const [isMuted, setIsMuted] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState([]); // {userId, socketId, name, isSpeaking, isMuted}
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({}); // key: remoteSocketId
  const audioRefs = useRef({}); // key: remoteSocketId -> HTMLAudioElement

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [expandedMobileUserId, setExpandedMobileUserId] = useState(null);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Utility: stable key for React lists
  const keyForParticipant = (p, index) => `${p.userId || 'u'}-${p.socketId || 's'}-${index}`;

  // Cleanup listeners when toggling
  useEffect(() => {
    if (!isEnabled || !socket) return;

    const onUserJoined = (data) => {
      const { participant, allParticipants } = data;
      const mapped = (allParticipants || []).map((p) => ({
        userId: p.userId,
        name: p.userInfo?.name || 'Unknown',
        socketId: p.socketId,
        isSpeaking: false,
        isMuted: false,
      }));
      setVoiceParticipants(mapped);

      if (localStream) {
        (allParticipants || []).forEach(async (p) => {
          if (!p?.socketId || p.socketId === socket.id) return;
          await ensurePeerConnection(p.socketId, localStream, true);
        });
      }

      if (participant && participant.userId !== userInfo.id) {
        toast.info(`🔊 ${participant.userInfo?.name || 'User'} joined voice`);
      }
    };

    const onUserLeft = ({ socketId }) => {
      setVoiceParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      const pc = peerConnections[socketId];
      if (pc) {
        try { pc.close(); } catch {}
        setPeerConnections((prev) => {
          const copy = { ...prev };
          delete copy[socketId];
          return copy;
        });
      }
      const audio = audioRefs.current[socketId];
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode === document.body) document.body.removeChild(audio);
        delete audioRefs.current[socketId];
      }
    };

    const onSignaling = async ({ fromSocketId, signal, type }) => {
      try {
        if (!fromSocketId) return;
        if (type === 'offer' && signal?.sdp) {
          const pc = await ensurePeerConnection(fromSocketId, localStream, false);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('whiteboard:voice_signal', {
            sessionId: chatId,
            targetSocketId: fromSocketId,
            type: 'answer',
            signal: { sdp: answer }
          });
        } else if (type === 'answer' && signal?.sdp) {
          const pc = peerConnections[fromSocketId];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (type === 'ice-candidate' && signal?.candidate) {
          const pc = peerConnections[fromSocketId];
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    };

    const onSpeaking = ({ isSpeaking }) => {
      setVoiceParticipants((prev) => prev.map((p) => ({ ...p, isSpeaking })));
    };

    const onUserMuted = ({ userId, isMuted, socketId }) => {
      setVoiceParticipants((prev) => prev.map((p) => (p.userId === userId || p.socketId === socketId) ? { ...p, isMuted, isSpeaking: !isMuted && p.isSpeaking } : p));
    };

    socket.on('voice:user_joined', onUserJoined);
    socket.on('voice:user_left', onUserLeft);
    socket.on('voice:signaling', onSignaling);
    socket.on('voice:speaking', onSpeaking);
    socket.on('voice:user_muted', onUserMuted);
    socket.on('voice:admin_muted', ({ isMuted }) => setIsMuted(isMuted));

    return () => {
      socket.off('voice:user_joined', onUserJoined);
      socket.off('voice:user_left', onUserLeft);
      socket.off('voice:signaling', onSignaling);
      socket.off('voice:speaking', onSpeaking);
      socket.off('voice:user_muted', onUserMuted);
      socket.off('voice:admin_muted');
    };
  }, [isEnabled, socket, localStream, peerConnections, chatId, userInfo.id]);

  const ensurePeerConnection = async (remoteSocketId, stream, isInitiator) => {
    if (!remoteSocketId) return null;
    let pc = peerConnections[remoteSocketId];
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (stream) {
      try {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } catch (e) {
        console.warn('Failed adding tracks:', e);
      }
    }

    pc.ontrack = (event) => {
      let audio = audioRefs.current[remoteSocketId];
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audioRefs.current[remoteSocketId] = audio;
        document.body.appendChild(audio);
      }
      audio.srcObject = event.streams[0];

      const remoteTrack = event.streams[0]?.getAudioTracks?.()[0];
      if (remoteTrack) {
        remoteTrack.onmute = () => setVoiceParticipants((prev) => prev.map((p) => p.socketId === remoteSocketId ? { ...p, isSpeaking: false } : p));
        remoteTrack.onunmute = () => setVoiceParticipants((prev) => prev.map((p) => p.socketId === remoteSocketId ? { ...p, isSpeaking: true } : p));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('whiteboard:voice_signal', {
          sessionId: chatId,
          targetSocketId: remoteSocketId,
          type: 'ice-candidate',
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed' || state === 'disconnected') {
        if (isInitiator) {
          setTimeout(async () => {
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);
              socket.emit('whiteboard:voice_signal', {
                sessionId: chatId,
                targetSocketId: remoteSocketId,
                type: 'offer',
                signal: { sdp: offer },
              });
            } catch {}
          }, 500);
        }
      }
    };

    setPeerConnections((prev) => ({ ...prev, [remoteSocketId]: pc }));

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit('whiteboard:voice_signal', {
          sessionId: chatId,
          targetSocketId: remoteSocketId,
          type: 'offer',
          signal: { sdp: offer },
        });
      } catch (e) {
        console.error('Offer error:', e);
      }
    }

    return pc;
  };

  const enableVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      socket.emit('whiteboard:voice_join', {
        sessionId: chatId,
        userId: userInfo.id,
        userInfo: { name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() },
      });

      onToggle(true);
      toast.success('🔊 Voice chat enabled');
    } catch (error) {
      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        toast.error('Microphone access denied');
      } else {
        toast.error('❌ Failed to enable voice chat');
      }
      console.error('Error enabling voice:', error);
    }
  };

  const disableVoice = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    Object.values(peerConnections).forEach((pc) => {
      try { pc.close(); } catch {}
    });
    setPeerConnections({});

    Object.entries(audioRefs.current).forEach(([remoteSocketId, audio]) => {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode === document.body) document.body.removeChild(audio);
      }
      delete audioRefs.current[remoteSocketId];
    });

    socket.emit('whiteboard:voice_leave', {
      sessionId: chatId,
      userId: userInfo.id,
    });

    onToggle(false);
    toast.info('🔇 Voice chat disabled');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nowMuted = !audioTrack.enabled;
        setIsMuted(nowMuted);
        socket.emit('voice:mute', { sessionId: chatId, userId: userInfo.id, isMuted: nowMuted });
        socket.emit('whiteboard:voice_speaking', { sessionId: chatId, userId: userInfo.id, isSpeaking: !nowMuted });
        setVoiceParticipants((prev) => prev.map((p) => p.userId === userInfo.id ? { ...p, isMuted: nowMuted, isSpeaking: !nowMuted } : p));
      }
    }
  };

  const renderMicStatus = (p) => (
    <span className={p.isMuted ? 'text-red-500' : 'text-green-500'} aria-hidden="true">{p.isMuted ? '❌' : '✅'}</span>
  );

  const ParticipantChip = ({ p, index }) => (
    <div
      key={keyForParticipant(p, index)}
      className={`flex items-center gap-2 px-3 py-2 rounded-md ${p.isSpeaking ? 'ring-2 ring-green-500' : 'ring-1 ring-transparent'} bg-white/5 flex-[1_1_160px]`}
      aria-label={`${p.name || 'Participant'}, mic ${p.isMuted ? 'muted' : 'enabled'}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${p.isSpeaking ? 'ring-2 ring-green-500' : ''} bg-blue-600 text-white`}>
        {(p.name?.charAt(0) || p.userId?.toString()?.charAt(0) || 'U')}
      </div>
      <p className="text-xs text-white truncate max-w-[140px]">{p.name || p.userId}</p>
      <div className="ml-auto" title={p.isMuted ? 'Mic muted' : 'Mic enabled'}>
        {renderMicStatus(p)}
      </div>
    </div>
  );

  const ParticipantsOverlayBar = () => {
    if (isMobile) return null;
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-[1200px]">
        <div className="backdrop-blur-md bg-[#0e0f16]/80 border border-[#2f303b] rounded-lg p-2">
          <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Participants ({voiceParticipants.length})</span>
          </div>
          {isTablet ? (
            <div className="grid grid-cols-2 gap-2">
              {voiceParticipants.map((p, i) => (
                <ParticipantChip key={keyForParticipant(p, i)} p={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center items-center gap-2">
              {voiceParticipants.map((p, i) => (
                <ParticipantChip key={keyForParticipant(p, i)} p={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const MobileParticipantsDrawer = () => {
    if (!isMobile) return null;
    return (
      <>
        <button
          onClick={() => setShowMobileDrawer(true)}
          className="p-2 bg-gray-200/10 text-gray-200 rounded-md hover:bg-gray-200/20 transition-colors duration-200 flex items-center gap-1"
          aria-label="Show participants"
          title="Show participants"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs">{voiceParticipants.length}</span>
        </button>
        {showMobileDrawer && (
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0e0f16] border-t border-[#2f303b] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="w-4 h-4" />
                <span className="text-sm">Participants ({voiceParticipants.length})</span>
              </div>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="text-gray-400 hover:text.white text-sm"
                aria-label="Close participants"
              >Close</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {voiceParticipants.map((p, i) => (
                <button
                  key={keyForParticipant(p, i)}
                  onClick={() => setExpandedMobileUserId(expandedMobileUserId === p.userId ? null : p.userId)}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${p.isSpeaking ? 'ring-2 ring-green-500' : ''} bg-blue-600 text-white`}
                  title={p.name || p.userId}
                  aria-label={`${p.name || 'Participant'}, mic ${p.isMuted ? 'muted' : 'enabled'}`}
                >
                  {(p.name?.charAt(0) || p.userId?.toString()?.charAt(0) || 'U')}
                </button>
              ))}
            </div>
            {expandedMobileUserId && (
              <div className="mt-2 bg-white/5 rounded-md p-2">
                {voiceParticipants.filter((p) => p.userId === expandedMobileUserId).map((p, i) => (
                  <div key={keyForParticipant(p, i)} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${p.isSpeaking ? 'ring-2 ring-green-500' : ''} bg-blue-600 text-white`}>
                      {(p.name?.charAt(0) || p.userId?.toString()?.charAt(0) || 'U')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white truncate">{p.name || p.userId}</p>
                    </div>
                    <div className="ml-auto" title={p.isMuted ? 'Mic muted' : 'Mic enabled'}>
                      {renderMicStatus(p)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  if (!isEnabled) {
    return (
      <button
        onClick={enableVoice}
        className="p-3 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative"
        title="Enable voice chat"
      >
        <Mic className="w-5 h-5" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
          Voice chat
        </span>
      </button>
    );
  }

  return (
    <div className="flex lg:flex-col gap-2">
      <div className="flex gap-1">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
            isMuted
              ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
              : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>
        <button
          onClick={disableVoice}
          className="p-3 bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative"
          title="Disable voice chat"
        >
          <VolumeX className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text.white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
            Disable voice
          </span>
        </button>
        {/* Mobile participants trigger */}
        <MobileParticipantsDrawer />
      </div>

      {/* Desktop/Tablet participants overlay centered */}
      {voiceParticipants.length > 0 && <ParticipantsOverlayBar />}
    </div>
  );
};

export default VoiceChat;
