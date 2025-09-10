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
  const [peerConnections, setPeerConnections] = useState({}); // key: socketId
  const audioRefs = useRef({}); // key: socketId -> HTMLAudioElement

  // Cleanup listeners when toggling
  useEffect(() => {
    if (!isEnabled || !socket) return;

    const onUserJoined = (data) => {
      const { participant, allParticipants } = data;
      setVoiceParticipants(allParticipants.map(p => ({
        userId: p.userId,
        name: p.userInfo?.name || 'Unknown',
        socketId: p.socketId,
        isSpeaking: false,
      })));

      // Prepare peer connections to everyone except ourselves
      if (localStream) {
        allParticipants.forEach(async (p) => {
          if (p.socketId === socket.id) return;
          await ensurePeerConnection(p.socketId, localStream, true);
        });
      }

      if (participant && participant.userId !== userInfo.id) {
        toast.info(`🔊 ${participant.userInfo?.name || 'User'} joined voice`);
      }
    };

    const onUserLeft = ({ socketId }) => {
      setVoiceParticipants(prev => prev.filter(p => p.socketId !== socketId));
      const pc = peerConnections[socketId];
      if (pc) {
        try { pc.close(); } catch {}
        setPeerConnections(prev => {
          const copy = { ...prev };
          delete copy[socketId];
          return copy;
        });
      }
      const audio = audioRefs.current[socketId];
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        delete audioRefs.current[socketId];
      }
    };

    const onSignaling = async ({ fromSocketId, signal, type }) => {
      try {
        if (type === 'offer') {
          // Create PC if needed, add local tracks, set remote desc, answer
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
        } else if (type === 'answer') {
          const pc = peerConnections[fromSocketId];
          if (pc && signal?.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (type === 'ice-candidate') {
          const pc = peerConnections[fromSocketId];
          if (pc && signal?.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    };

    const onSpeaking = ({ isSpeaking }) => {
      // Basic feedback: mark everyone as speaking/not speaking (server lacks user id in payload)
      setVoiceParticipants(prev => prev.map(p => ({ ...p, isSpeaking })));
    };

    socket.on('voice:user_joined', onUserJoined);
    socket.on('voice:user_left', onUserLeft);
    socket.on('voice:signaling', onSignaling);
    socket.on('voice:speaking', onSpeaking);

    return () => {
      socket.off('voice:user_joined', onUserJoined);
      socket.off('voice:user_left', onUserLeft);
      socket.off('voice:signaling', onSignaling);
      socket.off('voice:speaking', onSpeaking);
    };
  }, [isEnabled, socket, localStream, peerConnections, chatId, userInfo.id]);

  const ensurePeerConnection = async (remoteSocketId, stream, isInitiator) => {
    let pc = peerConnections[remoteSocketId];
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add tracks
    if (stream) {
      try {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
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
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('whiteboard:voice_signal', {
          sessionId: chatId,
          targetSocketId: remoteSocketId,
          type: 'ice-candidate',
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed' || state === 'disconnected') {
        // try simple retry once for initiator
        if (isInitiator) {
          setTimeout(async () => {
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);
              socket.emit('whiteboard:voice_signal', {
                sessionId: chatId,
                targetSocketId: remoteSocketId,
                type: 'offer',
                signal: { sdp: offer }
              });
            } catch {}
          }, 500);
        }
      }
    };

    setPeerConnections(prev => ({ ...prev, [remoteSocketId]: pc }));

    // If we're initiating, create offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit('whiteboard:voice_signal', {
          sessionId: chatId,
          targetSocketId: remoteSocketId,
          type: 'offer',
          signal: { sdp: offer }
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

      // Join voice session using chatId as sessionId
      socket.emit('whiteboard:voice_join', {
        sessionId: chatId,
        userId: userInfo.id,
        userInfo: { name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() }
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
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    Object.values(peerConnections).forEach(pc => {
      try { pc.close(); } catch {}
    });
    setPeerConnections({});

    // Stop all audio elements
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode === document.body) document.body.removeChild(audio);
      }
    });
    audioRefs.current = {};

    socket.emit('whiteboard:voice_leave', {
      sessionId: chatId,
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
        socket.emit('voice:mute', { sessionId: chatId, userId: userInfo.id, isMuted: !audioTrack.enabled });
        socket.emit('whiteboard:voice_speaking', { sessionId: chatId, userId: userInfo.id, isSpeaking: audioTrack.enabled });
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
      {/* Participants (desktop) */}
      {voiceParticipants.length > 0 && (
        <div className="hidden lg:block bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mt-2">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Voice Participants</h4>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {voiceParticipants.map((p) => (
              <div key={p.socketId} className={`flex items-center gap-1 p-1 rounded text-xs ${p.isSpeaking ? 'bg-green-100 dark:bg-green-900' : 'bg-white dark:bg-gray-600'}`}>
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                  {p.name?.charAt(0) || 'U'}
                </div>
                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{p.name || p.userId}</span>
                {p.isSpeaking && <Volume2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
