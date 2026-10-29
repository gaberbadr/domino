import React, { useState, useEffect } from 'react';
import { webrtcVoiceService, VoicePeerState, MicState } from '../services/webrtc';
import { getUserFromToken } from '../services/api';
import { UserProfileDto } from '../types/domino';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Radio, Loader2, Volume1 } from 'lucide-react';

interface VoiceChatControlsProps {
  roomCode: string;
  currentUser?: UserProfileDto;
  compact?: boolean;
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = ({
  roomCode,
  currentUser,
  compact = false
}) => {
  const [micState, setMicState] = useState<MicState>(webrtcVoiceService.getMicState());
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(webrtcVoiceService.isSpeakerMutedState());
  const [peers, setPeers] = useState<VoicePeerState[]>(webrtcVoiceService.getPeers());
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(webrtcVoiceService.getIsAutoplayBlocked());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Resolve user credentials
    const tokenUser = getUserFromToken();
    const userId = currentUser?.userId || tokenUser?.userId || '';
    const userName = currentUser?.fullName || tokenUser?.fullName || 'لاعب';

    // 2. Subscribe to real-time WebRTC voice updates
    webrtcVoiceService.subscribe({
      onMicStateChanged: (state) => setMicState(state),
      onPeersChanged: (newPeers) => setPeers([...newPeers]),
      onSpeakingChanged: (id, speaking) => {
        if (id === 'local') {
          setIsLocalSpeaking(speaking);
        } else {
          setPeers((prev) =>
            prev.map((p) => (p.userId === id ? { ...p, isSpeaking: speaking } : p))
          );
        }
      },
      onAutoplayBlockedChanged: (blocked) => setIsAutoplayBlocked(blocked),
      onError: (msg) => setErrorMessage(msg)
    });

    // 3. Ensure joined to authoritative room voice channel
    if (roomCode && userId) {
      webrtcVoiceService.joinRoom(roomCode, userId, userName).catch((err) => {
        console.warn('Voice join error:', err);
      });
    }
  }, [roomCode, currentUser]);

  const toggleMic = async () => {
    // Also unlock any pending audio
    webrtcVoiceService.unlockAudio();

    if (micState === 'active') {
      webrtcVoiceService.setMicMuted(true);
    } else {
      await webrtcVoiceService.startLocalAudio();
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerMuted;
    webrtcVoiceService.setSpeakerMuted(nextState);
    setIsSpeakerMuted(nextState);
    webrtcVoiceService.unlockAudio();
  };

  const handleUnlockAudio = () => {
    webrtcVoiceService.unlockAudio();
    setIsAutoplayBlocked(false);
  };

  const getMicTooltip = (): string => {
    switch (micState) {
      case 'active':
        return 'المايكروفون يعمل - انقر للكتم 🎙️';
      case 'connecting':
        return 'جاري الاتصال بالمايكروفون... ⏳';
      case 'permission_denied':
        return 'إذن المايكروفون مرفوض من المتصفح - انقر لإعادة المحاولة 🚫';
      case 'failed':
        return 'تعذر الاتصال بالمايكروفون - انقر للمحاولة مجدداً ⚠️';
      case 'muted':
      default:
        return 'المايكروفون مكتوم - انقر للتحدث 🔇';
    }
  };

  const getMicBackground = (): string => {
    if (micState === 'connecting') {
      return '#854d0e';
    }
    if (micState === 'permission_denied' || micState === 'failed') {
      return '#7f1d1d';
    }
    if (micState === 'active') {
      return isLocalSpeaking ? '#10b981' : 'linear-gradient(135deg, #15803d 0%, #166534 100%)';
    }
    return '#2d241e';
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.35rem' : '0.65rem',
        background: compact ? 'rgba(255, 255, 255, 0.05)' : 'rgba(32, 23, 16, 0.94)',
        border: compact ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(229, 231, 235, 0.25)',
        padding: compact ? '0.2rem 0.5rem' : '0.4rem 0.85rem',
        borderRadius: '9999px',
        backdropFilter: 'blur(8px)',
        boxShadow: compact ? 'none' : '0 4px 15px rgba(0, 0, 0, 0.65)',
        position: 'relative',
        zIndex: 10
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
          padding: '0.12rem 0.45rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.06)'
        }}
        title={`المتصلون بالصوت في هذه الغرفة: ${peers.length + 1}`}
      >
        <Radio size={compact ? 11 : 12} className={peers.length > 0 ? 'turn-pulse' : ''} />
        <span>{peers.length > 0 ? `${peers.length + 1}` : 'غرفة 1'}</span>
      </div>

      {/* Mic Button */}
      <button
        onClick={toggleMic}
        className="btn"
        disabled={micState === 'connecting'}
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 36,
          height: compact ? 28 : 36,
          background: getMicBackground(),
          color: micState === 'muted' ? '#9ca3af' : '#fff',
          border: micState === 'active'
            ? isLocalSpeaking
              ? '2px solid #34d399'
              : '1px solid #10b981'
            : micState === 'permission_denied' || micState === 'failed'
            ? '1px solid #ef4444'
            : '1px solid #4b3e34',
          boxShadow: isLocalSpeaking ? '0 0 14px rgba(16, 185, 129, 0.85)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: micState === 'connecting' ? 'wait' : 'pointer',
          transition: 'all 0.2s ease'
        }}
        title={getMicTooltip()}
      >
        {micState === 'connecting' ? (
          <Loader2 size={compact ? 14 : 16} className="animate-spin" />
        ) : micState === 'active' ? (
          <Mic size={compact ? 14 : 16} />
        ) : (
          <MicOff size={compact ? 14 : 16} />
        )}
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
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        title={isSpeakerMuted ? 'تشغيل سماعة المحادثة' : 'كتم سماعة المحادثة'}
      >
        {isSpeakerMuted ? <VolumeX size={compact ? 14 : 16} /> : <Volume2 size={compact ? 14 : 16} />}
      </button>

      {/* Peer Speaking Indicators */}
      {peers.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginLeft: '0.2rem' }}>
          {peers.map((peer) => (
            <div
              key={peer.userId}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: peer.isSpeaking ? '#10b981' : '#64748b',
                boxShadow: peer.isSpeaking ? '0 0 9px #10b981' : 'none',
                transition: 'all 0.2s ease'
              }}
              title={`${peer.userName} (${peer.isSpeaking ? 'يتحدث 🎙️' : 'صامت'})`}
            />
          ))}
        </div>
      )}

      {/* Autoplay blocked banner unlock */}
      {isAutoplayBlocked && (
        <button
          onClick={handleUnlockAudio}
          className="btn"
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            border: '1px solid #fef08a',
            boxShadow: '0 0 10px rgba(217, 119, 6, 0.6)'
          }}
          title="اضغط هنا لتفعيل صوت اللاعبين بسبب قيود المتصفح"
        >
          <Volume1 size={13} />
          <span>تفعيل الصوت</span>
        </button>
      )}

      {/* Error Message Tooltip */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '125%',
            left: 0,
            background: '#991b1b',
            color: '#fff',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.6rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.75)',
            zIndex: 100,
            border: '1px solid #ef4444'
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
