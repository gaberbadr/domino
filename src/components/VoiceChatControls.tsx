import React, { useState, useEffect } from 'react';
import { webrtcVoiceService, VoicePeerState } from '../services/webrtc';
import { STRINGS } from '../constants/strings';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface VoiceChatControlsProps {
  roomCode: string;
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = () => {
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [peers, setPeers] = useState<VoicePeerState[]>([]);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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

    return () => {
      webrtcVoiceService.leaveSession();
    };
  }, []);

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
        gap: '0.75rem',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.5rem 0.85rem',
        borderRadius: '9999px',
        backdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Mic Button */}
      <button
        onClick={toggleMic}
        className="btn"
        style={{
          padding: '0.45rem',
          borderRadius: '50%',
          width: 38,
          height: 38,
          background: isMicMuted ? '#334155' : isLocalSpeaking ? '#10b981' : 'var(--gold-primary)',
          color: isMicMuted ? '#94a3b8' : '#000',
          boxShadow: isLocalSpeaking ? '0 0 12px rgba(16, 185, 129, 0.8)' : 'none'
        }}
        title={isMicMuted ? STRINGS.micOff : STRINGS.micOn}
      >
        {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* Speaker Button */}
      <button
        onClick={toggleSpeaker}
        className="btn"
        style={{
          padding: '0.45rem',
          borderRadius: '50%',
          width: 38,
          height: 38,
          background: isSpeakerMuted ? '#ef4444' : '#1e293b',
          color: '#fff'
        }}
        title={isSpeakerMuted ? STRINGS.speakerOff : STRINGS.speakerOn}
      >
        {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Peer Speaking Badges */}
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        {peers.map((peer) => (
          <div
            key={peer.userId}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: peer.isSpeaking ? '#10b981' : '#64748b',
              boxShadow: peer.isSpeaking ? '0 0 8px #10b981' : 'none'
            }}
            title={`${peer.userName} (${peer.isSpeaking ? 'بيتكلم' : 'ساكت'})`}
          />
        ))}
      </div>

      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            left: 0,
            background: '#ef4444',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.4rem' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
