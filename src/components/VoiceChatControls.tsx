import React, { useState, useEffect, useRef } from 'react';
import {
  livekitVoiceService,
  VoiceParticipant,
  MicState,
  VoiceConnectionState
} from '../services/livekitVoice';
import { getUserFromToken } from '../services/api';
import { UserProfileDto } from '../types/domino';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Loader2,
  Volume1,
  AlertCircle,
  Headphones,
  Users
} from 'lucide-react';

interface VoiceChatControlsProps {
  roomCode: string;
  currentUser?: UserProfileDto;
  compact?: boolean;
  autoJoin?: boolean;
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = ({
  roomCode,
  currentUser,
  compact = false,
  autoJoin = true
}) => {
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>(
    livekitVoiceService.getConnectionState()
  );
  const [micState, setMicState] = useState<MicState>(livekitVoiceService.getMicState());
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(
    livekitVoiceService.isSpeakerMutedState()
  );
  const [participants, setParticipants] = useState<VoiceParticipant[]>(
    livekitVoiceService.getParticipants()
  );
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(
    livekitVoiceService.getIsAutoplayBlocked()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoJoinedRef = useRef<boolean>(false);
  const userExplicitlyLeftRef = useRef<boolean>(false);

  // Reset auto-join tracking when roomCode changes
  useEffect(() => {
    hasAutoJoinedRef.current = false;
    userExplicitlyLeftRef.current = false;
  }, [roomCode]);

  // Close roster dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRoster(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    // 1. Subscribe to real-time group voice events
    const unsubscribe = livekitVoiceService.subscribe({
      onConnectionStateChanged: (state) => setConnectionState(state),
      onMicStateChanged: (state) => setMicState(state),
      onParticipantsChanged: (newParticipants) => setParticipants([...newParticipants]),
      onSpeakingChanged: (id, speaking) => {
        if (id === 'local') {
          setIsLocalSpeaking(speaking);
        } else {
          setParticipants((prev) =>
            prev.map((p) => (p.userId === id ? { ...p, isSpeaking: speaking } : p))
          );
        }
      },
      onAutoplayBlockedChanged: (blocked) => setIsAutoplayBlocked(blocked),
      onError: (msg) => setErrorMessage(msg)
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleJoinVoice = async () => {
    livekitVoiceService.unlockAudio();
    setErrorMessage(null);
    userExplicitlyLeftRef.current = false;

    const tokenUser = getUserFromToken();
    const userId = currentUser?.userId || tokenUser?.userId || '';
    const userName = currentUser?.fullName || tokenUser?.fullName || 'لاعب';

    try {
      await livekitVoiceService.joinRoom(roomCode, userId, userName);
    } catch (err: any) {
      console.warn('Voice room connection notice:', err);
    }
  };

  // Automatically join voice when entering active game room
  useEffect(() => {
    if (
      autoJoin &&
      roomCode &&
      connectionState === 'disconnected' &&
      !hasAutoJoinedRef.current &&
      !userExplicitlyLeftRef.current
    ) {
      hasAutoJoinedRef.current = true;
      handleJoinVoice().catch(() => {});
    }
  }, [autoJoin, roomCode, connectionState]);

  const handleLeaveVoice = async () => {
    userExplicitlyLeftRef.current = true;
    await livekitVoiceService.leaveRoom();
  };

  const toggleMic = async () => {
    livekitVoiceService.unlockAudio();

    if (micState === 'active') {
      await livekitVoiceService.setMicMuted(true);
    } else {
      await livekitVoiceService.setMicMuted(false);
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerMuted;
    livekitVoiceService.setSpeakerMuted(nextState);
    setIsSpeakerMuted(nextState);
  };

  const handleUnlockAudio = () => {
    livekitVoiceService.unlockAudio();
    setIsAutoplayBlocked(false);
  };

  const getMicTooltip = (): string => {
    switch (micState) {
      case 'active':
        return isLocalSpeaking ? 'تتحدث الآن 🎙️ - انقر للكتم' : 'المايكروفون يعمل - انقر للكتم 🎙️';
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
    if (micState === 'connecting') return '#854d0e';
    if (micState === 'permission_denied' || micState === 'failed') return '#7f1d1d';
    if (micState === 'active') {
      return isLocalSpeaking ? '#10b981' : 'linear-gradient(135deg, #15803d 0%, #166534 100%)';
    }
    return '#204B3F';
  };

  // =========================================================================
  // State 1: DISCONNECTED (Discord-Style Join Voice Prompt)
  // =========================================================================
  if (connectionState === 'disconnected') {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          position: 'relative',
          zIndex: 10
        }}
      >
        <button
          onClick={handleJoinVoice}
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? '0.35rem' : '0.5rem',
            background: 'linear-gradient(135deg, #1B5142 0%, #134235 100%)',
            border: '1px solid #426B5D',
            color: '#F5F3EA',
            padding: compact ? '0.28rem 0.65rem' : '0.45rem 0.95rem',
            borderRadius: '9999px',
            fontSize: compact ? '0.75rem' : '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.2s ease'
          }}
          title="انضمام للمحادثة الصوتية"
        >
          <Headphones size={compact ? 13 : 15} style={{ color: '#D9B56D' }} />
          <span>انضمام للصوت</span>
        </button>

        {errorMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: '125%',
              right: 0,
              background: '#991b1b',
              color: '#fff',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
              zIndex: 100,
              border: '1px solid #ef4444'
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // State 2: CONNECTING / RECONNECTING
  // =========================================================================
  if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: '#1B5142',
          border: '1px solid #426B5D',
          padding: compact ? '0.25rem 0.6rem' : '0.4rem 0.85rem',
          borderRadius: '9999px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          fontSize: compact ? '0.72rem' : '0.8rem',
          color: '#E2C485'
        }}
      >
        <Loader2 size={compact ? 13 : 15} className="animate-spin" />
        <span>
          {connectionState === 'reconnecting' ? 'إعادة الاتصال بالصوت...' : 'جاري الاتصال...'}
        </span>
      </div>
    );
  }

  // =========================================================================
  // State 3: ERROR STATE
  // =========================================================================
  if (connectionState === 'error') {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: '#7f1d1d',
          border: '1px solid #ef4444',
          padding: compact ? '0.25rem 0.6rem' : '0.4rem 0.85rem',
          borderRadius: '9999px',
          fontSize: compact ? '0.72rem' : '0.78rem',
          color: '#fff'
        }}
      >
        <AlertCircle size={compact ? 13 : 15} />
        <span>تعذر الاتصال بالصوت</span>
        <button
          onClick={handleJoinVoice}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#fff',
            borderRadius: '4px',
            padding: '0.15rem 0.45rem',
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 700
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // =========================================================================
  // State 4: CONNECTED (Discord-Style Live Voice Room)
  // =========================================================================
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.35rem' : '0.65rem',
        background: compact ? 'rgba(27, 81, 66, 0.95)' : 'rgba(27, 81, 66, 0.98)',
        border: '1px solid #426B5D',
        padding: compact ? '0.2rem 0.5rem' : '0.35rem 0.75rem',
        borderRadius: '9999px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* 1. Connected Status Badge / Participant Count Pill */}
      <button
        onClick={() => setShowRoster((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: compact ? '0.7rem' : '0.75rem',
          fontWeight: 700,
          color: '#10b981',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          cursor: 'pointer'
        }}
        title={`المحادثة الصوتية: ${participants.length} متصل (انقر لعرض قائمة اللاعبين)`}
      >
        <Radio size={compact ? 11 : 12} className="turn-pulse" />
        <Users size={compact ? 11 : 12} />
        <span>{participants.length}</span>
      </button>

      {/* 2. Mic Mute/Unmute Button */}
      <button
        onClick={toggleMic}
        className="btn"
        disabled={micState === 'connecting'}
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          background: getMicBackground(),
          color: micState === 'muted' ? '#B8C9C0' : '#fff',
          border:
            micState === 'active'
              ? isLocalSpeaking
                ? '2px solid #34d399'
                : '1px solid #10b981'
              : micState === 'permission_denied' || micState === 'failed'
              ? '1px solid #ef4444'
              : '1px solid #426B5D',
          boxShadow: isLocalSpeaking ? '0 0 12px rgba(16, 185, 129, 0.9)' : 'none',
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

      {/* 3. Speaker Deafen / Unmute Button */}
      <button
        onClick={toggleSpeaker}
        className="btn"
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          background: isSpeakerMuted ? '#7f1d1d' : '#204B3F',
          color: isSpeakerMuted ? '#fca5a5' : '#B8C9C0',
          border: isSpeakerMuted ? '1px solid #ef4444' : '1px solid #426B5D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title={isSpeakerMuted ? 'تشغيل سماعة المحادثة 🔊' : 'كتم سماعة المحادثة 🔇'}
      >
        {isSpeakerMuted ? (
          <VolumeX size={compact ? 14 : 16} />
        ) : (
          <Volume2 size={compact ? 14 : 16} />
        )}
      </button>

      {/* 4. Leave Voice Room Button */}
      <button
        onClick={handleLeaveVoice}
        className="btn"
        style={{
          padding: 0,
          borderRadius: '50%',
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          background: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="مغادرة المحادثة الصوتية ❌"
      >
        <PhoneOff size={compact ? 13 : 15} />
      </button>

      {/* 5. Compact Remote Participant Speaking Dots */}
      {remoteParticipants.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginLeft: '0.2rem' }}>
          {remoteParticipants.map((p) => (
            <div
              key={p.userId}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: p.isSpeaking ? '#10b981' : p.isMuted ? '#ef4444' : '#64748b',
                boxShadow: p.isSpeaking ? '0 0 9px #10b981' : 'none',
                transition: 'all 0.2s ease'
              }}
              title={`${p.userName} (${p.isSpeaking ? 'يتحدث 🎙️' : p.isMuted ? 'مكتوم 🔇' : 'متصل'})`}
            />
          ))}
        </div>
      )}

      {/* 6. Autoplay Blocked Banner Unlock */}
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

      {/* 7. Discord-Style Participants Roster Dropdown */}
      {showRoster && (
        <div
          style={{
            position: 'absolute',
            top: '125%',
            right: 0,
            minWidth: 220,
            background: '#153A30',
            border: '1px solid #426B5D',
            borderRadius: '0.75rem',
            padding: '0.65rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #426B5D',
              paddingBottom: '0.35rem',
              fontSize: '0.75rem',
              color: '#B8C9C0',
              fontWeight: 700
            }}
          >
            <span>المتصلون بالصوت ({participants.length})</span>
            <span style={{ color: '#10b981', fontSize: '0.7rem' }}>صوت مباشر</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 180, overflowY: 'auto' }}>
            {participants.map((p) => (
              <div
                key={p.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.3rem 0.5rem',
                  borderRadius: '0.4rem',
                  background: p.isSpeaking ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: p.isSpeaking ? '1px solid #10b981' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#204B3F',
                      border: p.isSpeaking ? '2px solid #10b981' : '1px solid #426B5D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#F5F3EA'
                    }}
                  >
                    {p.userName.slice(0, 1)}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#F5F3EA', fontWeight: 600 }}>
                    {p.userName} {p.isLocal && <span style={{ color: '#D9B56D', fontSize: '0.7rem' }}>(أنت)</span>}
                  </span>
                </div>

                <div>
                  {p.isSpeaking ? (
                    <Mic size={13} style={{ color: '#10b981' }} />
                  ) : p.isMuted ? (
                    <MicOff size={13} style={{ color: '#ef4444' }} />
                  ) : (
                    <Mic size={13} style={{ color: '#94a3b8' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Error Message Banner */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '125%',
            left: 0,
            background: '#991b1b',
            color: '#fff',
            padding: '0.45rem 0.75rem',
            borderRadius: '0.6rem',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.75)',
            zIndex: 100,
            border: '1px solid #ef4444'
          }}
        >
          <AlertCircle size={14} />
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
