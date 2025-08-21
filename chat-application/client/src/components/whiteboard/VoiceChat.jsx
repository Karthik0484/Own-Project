import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const VoiceChat = ({ chatId, isEnabled, onToggle }) => {
  const socket = useSocket();
  const { userInfo } = useAppStore();
  const [isMuted, setIsMuted] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    if (!isEnabled || !socket) return;

    // Listen for voice events
    socket.on('whiteboard:voice_join', handleVoiceJoin);
    socket.on('whiteboard:voice_leave', handleVoiceLeave);
    socket.on('whiteboard:voice_signal', handleVoiceSignal);
    socket.on('whiteboard:voice_speaking', handleVoiceSpeaking);

    return () => {
      socket.off('whiteboard:voice_join', handleVoiceJoin);
      socket.off('whiteboard:voice_leave', handleVoiceLeave);
      socket.off('whiteboard:voice_signal', handleVoiceSignal);
      socket.off('whiteboard:voice_speaking', handleVoiceSpeaking);
    };
  }, [isEnabled, socket]);

  const handleVoiceJoin = (data) => {
    setVoiceParticipants(prev => [...prev, data.user]);
    toast.info(`🔊 ${data.user.name} joined voice chat`);
  };

  const handleVoiceLeave = (data) => {
    setVoiceParticipants(prev => prev.filter(p => p.userId !== data.userId));
    toast.info(`🔇 ${data.userName} left voice chat`);
    
    // Close peer connection
    if (peerConnections[data.userId]) {
      peerConnections[data.userId].close();
      setPeerConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[data.userId];
        return newConnections;
      });
    }
  };

  const handleVoiceSignal = async (data) => {
    if (data.userId === userInfo.id) return;

    try {
      let pc = peerConnections[data.userId];
      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        setPeerConnections(prev => ({ ...prev, [data.userId]: pc }));

        pc.ontrack = (event) => {
          const audio = document.createElement('audio');
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          audioRefs.current[data.userId] = audio;
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('whiteboard:voice_signal', {
              chatId,
              userId: userInfo.id,
              targetUserId: data.userId,
              signal: { type: 'ice-candidate', candidate: event.candidate }
            });
          }
        };
      }

      if (data.signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('whiteboard:voice_signal', {
          chatId,
          userId: userInfo.id,
          targetUserId: data.userId,
          signal: { type: 'answer', sdp: answer }
        });
      } else if (data.signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
      } else if (data.signal.type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    } catch (error) {
      console.error('Voice signaling error:', error);
    }
  };

  const handleVoiceSpeaking = (data) => {
    setVoiceParticipants(prev => 
      prev.map(p => 
        p.userId === data.userId 
          ? { ...p, isSpeaking: data.isSpeaking }
          : p
      )
    );
  };

  const enableVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      socket.emit('whiteboard:voice_join', {
        chatId,
        userId: userInfo.id,
        userName: `${userInfo.firstName} ${userInfo.lastName}`
      });

      // Create peer connections for existing participants
      voiceParticipants.forEach(async (participant) => {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('whiteboard:voice_signal', {
              chatId,
              userId: userInfo.id,
              targetUserId: participant.userId,
              signal: { type: 'ice-candidate', candidate: event.candidate }
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('whiteboard:voice_signal', {
          chatId,
          userId: userInfo.id,
          targetUserId: participant.userId,
          signal: { type: 'offer', sdp: offer }
        });

        setPeerConnections(prev => ({ ...prev, [participant.userId]: pc }));
      });

      onToggle(true);
      toast.success('🔊 Voice chat enabled');
    } catch (error) {
      console.error('Error enabling voice:', error);
      toast.error('❌ Failed to enable voice chat');
    }
  };

  const disableVoice = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    Object.values(peerConnections).forEach(pc => pc.close());
    setPeerConnections({});
    
    // Stop all audio elements
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
    });
    audioRefs.current = {};
    
    socket.emit('whiteboard:voice_leave', {
      chatId,
      userId: userInfo.id
    });

    onToggle(false);
    toast.info('🔇 Voice chat disabled');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        socket.emit('whiteboard:voice_speaking', {
          chatId,
          userId: userInfo.id,
          isSpeaking: audioTrack.enabled
        });
      }
    }
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
    <div className="flex lg:flex-col gap-1">
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
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
          Disable voice
        </span>
      </button>
      
      {/* Voice participants - Only show on desktop */}
      {voiceParticipants.length > 0 && (
        <div className="hidden lg:block bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mt-2">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Voice Participants</h4>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {voiceParticipants.map((participant) => (
              <div
                key={participant.userId}
                className={`flex items-center gap-1 p-1 rounded text-xs ${
                  participant.isSpeaking 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-white dark:bg-gray-600'
                }`}
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                  {participant.name.charAt(0)}
                </div>
                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{participant.name}</span>
                {participant.isSpeaking && (
                  <Volume2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
