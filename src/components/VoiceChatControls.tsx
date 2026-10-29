import React, { useState, useEffect } from 'react';
import { webrtcVoiceService, VoicePeerState } from '../services/webrtc';
import { signalRService } from '../services/signalr';
import { VoicePeerDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Radio } from 'lucide-react';

interface VoiceChatControlsProps {
  roomCode: string;
  compact?: boolean;
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = ({ roomCode, compact = false }) => {
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [peers, setPeers] = useState<VoicePeerState[]>([]);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initialize WebRTC voice callbacks
    webrtcVoiceService.initialize(
      (newPeers) => setPeers([...newPeers]),
      (id, speaking) => {
        if (id === 'local') {
          setIsLocalSpeaking(speaking);
        } else {
          setPeers((prev) =>
            prev.map((p) => (p.userId === id ? { ...p, isSpeaking: speaking } : p))
          );
        }
      },
      (error) => setErrorMessage(error)
    );

    // 2. Wire SignalR signaling events to WebRtcVoiceService
    let conn = signalRService.getConnection();

    const registerVoiceListeners = async () => {
      if (!conn) {
        conn = await signalRService.start();
      }
      if (!conn) return;

      conn.on('VoiceExistingPeers', (existingPeers: VoicePeerDto[]) => {
        webrtcVoiceService.handleExistingPeers(existingPeers);
      });

      conn.on('VoicePeerJoined', (userId: string, userName: string) => {
        webrtcVoiceService.handlePeerJoined(userId, userName);
      });

      conn.on('VoicePeerLeft', (userId: string) => {
        webrtcVoiceService.handlePeerLeft(userId);
      });

      conn.on('ReceiveOffer', (fromUserId: string, sdp: string) => {
        webrtcVoiceService.handleReceiveOffer(fromUserId, sdp);
      });

      conn.on('ReceiveAnswer', (fromUserId: string, sdp: string) => {
        webrtcVoiceService.handleReceiveAnswer(fromUserId, sdp);
      });

      conn.on('ReceiveIceCandidate', (fromUserId: string, candidate: string) => {
        webrtcVoiceService.handleReceiveIceCandidate(fromUserId, candidate);
      });

      // Join the voice room group on backend
      await signalRService.joinVoice(roomCode);
    };

    registerVoiceListeners();

    return () => {
      signalRService.leaveVoice(roomCode).catch(() => {});
      if (conn) {
        conn.off('VoiceExistingPeers');
        conn.off('VoicePeerJoined');
        conn.off('VoicePeerLeft');
        conn.off('ReceiveOffer');
        conn.off('ReceiveAnswer');
        conn.off('ReceiveIceCandidate');
      }
      webrtcVoiceService.leaveSession();
    };
  }, [roomCode]);

  const toggleMic = async () => {
    if (isMicMuted) {
      const success = await webrtcVoiceService.startLocalAudio();
      if (success) {
        setIsMicMuted(false);
        setErrorMessage(null);
      }
    } else {
      webrtcVoiceService.setMicMuted(true);
      setIsMicMuted(true);
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerMuted;
    webrtcVoiceService.setSpeakerMuted(nextState);
    setIsSpeakerMuted(nextState);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '0.35rem' : '0.65rem',
        background: compact ? 'rgba(255, 255, 255, 0.05)' : 'rgba(32, 23, 16, 0.92)',
        border: compact ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(229, 231, 235, 0.25)',
        padding: compact ? '0.2rem 0.5rem' : '0.4rem 0.85rem',
        borderRadius: '9999px',
        backdropFilter: 'blur(8px)',
        boxShadow: compact ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.65)',
        position: 'relative'
      }}
    >
      {/* Voice Status Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: compact ? '0.7rem' : '0.75rem',
          fontWeight: 700,
          color: peers.length > 0 ? '#10b981' : 'var(--platinum-silver)',
          padding: '0.12rem 0.4rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.06)'
        }}
        title="حالة الاتصال الصوتي"
      >
        <Radio size={compact ? 11 : 12} className={peers.length > 0 ? 'turn-pulse' : ''} />
        <span>{peers.length > 0 ? `${peers.length}` : 'مباشر'}</span>
      </div>

      {/* Mic Button */}
      <button
        onClick={toggleMic}
        className="btn"
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 36,
          height: compact ? 28 : 36,
          background: isMicMuted
            ? '#2d241e'
            : isLocalSpeaking
            ? '#10b981'
            : 'linear-gradient(135deg, #7a4e2d 0%, #5c3a21 100%)',
          color: isMicMuted ? '#9ca3af' : '#fff',
          border: isMicMuted
            ? '1px solid #4b3e34'
            : isLocalSpeaking
            ? '1px solid #34d399'
            : '1px solid var(--platinum-silver)',
          boxShadow: isLocalSpeaking ? '0 0 12px rgba(16, 185, 129, 0.8)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={isMicMuted ? 'تشغيل المايكروفون' : 'كتم المايكروفون'}
      >
        {isMicMuted ? <MicOff size={compact ? 14 : 16} /> : <Mic size={compact ? 14 : 16} />}
      </button>

      {/* Speaker Button */}
      <button
        onClick={toggleSpeaker}
        className="btn"
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 36,
          height: compact ? 28 : 36,
          background: isSpeakerMuted ? '#7f1d1d' : '#2d241e',
          color: isSpeakerMuted ? '#fca5a5' : 'var(--platinum-silver)',
          border: isSpeakerMuted ? '1px solid #ef4444' : '1px solid #4b3e34',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={isSpeakerMuted ? 'تشغيل السماعة' : 'كتم السماعة'}
      >
        {isSpeakerMuted ? <VolumeX size={compact ? 14 : 16} /> : <Volume2 size={compact ? 14 : 16} />}
      </button>

      {/* Peer Speaking Indicators */}
      {peers.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {peers.map((peer) => (
            <div
              key={peer.userId}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: peer.isSpeaking ? '#10b981' : '#64748b',
                boxShadow: peer.isSpeaking ? '0 0 8px #10b981' : 'none',
                transition: 'all 0.2s'
              }}
              title={`${peer.userName} (${peer.isSpeaking ? 'بيتكلم' : 'ساكت'})`}
            />
          ))}
        </div>
      )}

      {/* Error Message Tooltip */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '125%',
            left: 0,
            background: '#b91c1c',
            color: '#fff',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 15px rgba(0, 0, 0, 0.7)',
            zIndex: 100
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              marginLeft: '0.4rem',
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
