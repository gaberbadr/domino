import React, { useState } from 'react';
import { RoomDto, UserProfileDto, GameMode } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { VoiceChatControls } from '../components/VoiceChatControls';
import { Copy, Check, Play, UserX, Trash2, LogOut, Users, Shield } from 'lucide-react';

import { ExitConfirmationModal } from '../components/ExitConfirmationModal';

interface LobbyRoomPageProps {
  room: RoomDto;
  currentUser: UserProfileDto;
  onStartMatch: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onKickPlayer: (userId: string) => Promise<void>;
  onDeleteRoom: () => Promise<void>;
}

export const LobbyRoomPage: React.FC<LobbyRoomPageProps> = ({
  room,
  currentUser,
  onStartMatch,
  onLeaveRoom,
  onKickPlayer,
  onDeleteRoom
}) => {
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = room.hostId === currentUser.userId;
  const isFull = room.players.length === room.maxPlayers;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await onStartMatch();
    } catch (err: any) {
      setError(err.message || 'فشل بدء الماتش');
      setIsStarting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '840px', padding: '2rem 1.25rem' }}>
      {/* Room Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                {room.name}
              </h2>
              <span className={`badge ${room.mode === GameMode.Individual ? 'badge-gold' : room.mode === GameMode.Triple ? 'badge-blue' : 'badge-green'}`}>
                {room.mode === GameMode.Individual ? STRINGS.modeIndividual : room.mode === GameMode.Triple ? STRINGS.modeTriple : STRINGS.modeQuadruple}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              المضيف: <strong style={{ color: '#fff' }}>{room.hostName}</strong>
            </span>
          </div>

          {/* Voice Chat widget */}
          <VoiceChatControls roomCode={room.roomCode} />
        </div>

        {/* Room Code Share Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--mocha-surface)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--mocha-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{STRINGS.roomCode}:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--platinum-primary)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {room.roomCode}
            </span>
          </div>

          <button className="btn btn-secondary" onClick={handleCopyCode} style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? STRINGS.codeCopied : STRINGS.copyCode}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Player Seats Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--platinum-silver)" />
            <span>اللعيبة في الأوضة ({room.players.length} / {room.maxPlayers})</span>
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isFull ? '#10b981' : 'var(--platinum-silver)' }}>
            {isFull ? STRINGS.roomFull : STRINGS.waitingForPlayers}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${room.maxPlayers}, 1fr)`, gap: '1rem' }}>
          {Array.from({ length: room.maxPlayers }).map((_, seatIdx) => {
            const player = room.players.find((p) => p.seatIndex === seatIdx);
            return (
              <div
                key={seatIdx}
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: player ? '1px solid var(--mocha-border)' : '2px dashed rgba(229, 231, 235, 0.2)',
                  background: player ? 'var(--bg-card)' : 'transparent',
                  minHeight: 180
                }}
              >
                {player ? (
                  <>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--mocha-light) 0%, var(--mocha-dark) 100%)',
                        border: '2px solid var(--platinum-silver)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        marginBottom: '0.75rem',
                        boxShadow: '0 0 12px var(--mocha-glow)'
                      }}
                    >
                      👤
                    </div>

                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {player.displayName}
                    </strong>

                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      {player.isHost && (
                        <span className="badge badge-gold">
                          <Shield size={12} />
                          المضيف
                        </span>
                      )}
                      {room.mode === GameMode.Quadruple && (
                        <span className={`badge ${player.teamIndex === 1 ? 'badge-gold' : 'badge-blue'}`}>
                          فريق {player.teamIndex}
                        </span>
                      )}
                    </div>

                    {isHost && !player.isHost && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                        onClick={() => onKickPlayer(player.userId)}
                        title={STRINGS.kickPlayer}
                      >
                        <UserX size={13} />
                        <span>طرد</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1.8rem', opacity: 0.4 }}>⏳</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>كرسي فاضي...</span>
                    {room.mode === GameMode.Quadruple && (
                      <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        فريق {(seatIdx % 2 === 0) ? 1 : 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Controls / Player Controls */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem'
        }}
      >
        <button className="btn btn-secondary" onClick={() => setShowExitModal(true)}>
          <LogOut size={16} />
          <span>{STRINGS.leaveRoom}</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isHost ? (
            <>
              <button
                className="btn btn-danger"
                style={{ background: '#7f1d1d', borderColor: '#991b1b' }}
                onClick={onDeleteRoom}
              >
                <Trash2 size={16} />
                <span>{STRINGS.deleteRoom}</span>
              </button>

              <button
                className="btn btn-primary"
                style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}
                disabled={!isFull || isStarting}
                onClick={handleStart}
              >
                <Play size={18} />
                <span>{isStarting ? 'بيبدأ الماتش...' : STRINGS.startMatch}</span>
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              في انتظار المضيف لبدء الماتش...
            </span>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ExitConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={async () => {
          setShowExitModal(false);
          await onLeaveRoom();
        }}
        isLobby={true}
        mode={room.mode}
        isMatchActive={false}
      />
    </div>
  );
};
