import React, { useEffect, useState } from 'react';
import { RoundEndResultDto, RoundOutcomeType, RoomPlayerDto, GameMode } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { Lock, Scale, Trophy, Check } from 'lucide-react';
import { soundService } from '../services/soundService';

interface BlockedRoundTableOverlayProps {
  result: RoundEndResultDto | null;
  players: RoomPlayerDto[];
  gameMode: GameMode;
  currentUserId: string;
  onViewPrompt?: () => void;
}

export const BlockedRoundTableOverlay: React.FC<BlockedRoundTableOverlayProps> = ({
  result,
  players,
  gameMode,
  currentUserId,
  onViewPrompt
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Trigger ONLY when outcome is BlockedWin or Draw
  const isBlocked = Boolean(
    result &&
    (result.outcomeType === RoundOutcomeType.BlockedWin || result.outcomeType === RoundOutcomeType.Draw)
  );

  useEffect(() => {
    if (isBlocked) {
      setIsVisible(true);
      try {
        soundService.playGameplay('drawOrClose');
      } catch {
        // Sound service fallback
      }
    }
  }, [result?.roundNumber, isBlocked]);

  if (!isBlocked || !result || !isVisible) return null;

  const isDraw = result.outcomeType === RoundOutcomeType.Draw || result.isDraw;

  return (
    <div
      className="blocked-round-table-overlay"
      style={{
        position: 'absolute',
        inset: '8px',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(10, 26, 21, 0.94) 0%, rgba(6, 18, 14, 0.97) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '1.25rem',
        border: '1.5px solid var(--gold-primary)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75), inset 0 0 24px rgba(217, 181, 109, 0.15)',
        padding: '1rem',
        animation: 'blockedOverlayAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overflowY: 'auto',
        direction: 'rtl'
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
          marginBottom: '0.85rem',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: isDraw ? 'rgba(59, 130, 246, 0.18)' : 'rgba(217, 181, 109, 0.18)',
            border: `1px solid ${isDraw ? 'rgba(59, 130, 246, 0.4)' : 'rgba(217, 181, 109, 0.45)'}`,
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}
        >
          {isDraw ? <Scale size={20} color="#60a5fa" /> : <Lock size={20} color="var(--gold-primary)" />}
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 900,
              color: isDraw ? '#93c5fd' : 'var(--gold-primary)',
              letterSpacing: '0.3px'
            }}
          >
            {isDraw ? '⚖️ قفلة الدور - تعادل' : '🔒 قفلة الدور (كشف الأوراق والنقط)'}
          </span>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#B8C9C0', maxWidth: '480px', lineHeight: 1.4 }}>
          {result.reason}
        </p>
      </div>

      {/* Players Revealed Hands Grid */}
      <div
        className="blocked-players-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: players.length === 2 ? 'repeat(2, 1fr)' : players.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '780px',
          marginBottom: '0.85rem'
        }}
      >
        {players.map((player) => {
          const handTiles = result.playerRemainingHands?.[player.userId] ?? [];
          const pipSum =
            result.playerRemainingPips?.[player.userId] ??
            handTiles.reduce((acc, t) => acc + (t.pipSum ?? (t.end1 + t.end2)), 0);

          const isWinningPlayer = !isDraw && (
            gameMode === GameMode.Quadruple
              ? player.teamIndex === result.winningTeamIndex
              : player.userId === result.winnerUserId
          );

          const isLowestInTeam = !isDraw && gameMode === GameMode.Quadruple && player.userId === result.winnerUserId;

          return (
            <div
              key={`blocked-player-${player.userId}`}
              style={{
                background: isWinningPlayer ? 'rgba(217, 181, 109, 0.12)' : 'rgba(32, 75, 63, 0.45)',
                border: isWinningPlayer ? '2px solid var(--gold-primary)' : '1px solid rgba(66, 107, 93, 0.45)',
                borderRadius: '0.85rem',
                padding: '0.65rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                boxShadow: isWinningPlayer ? '0 4px 18px rgba(217, 181, 109, 0.22)' : 'var(--shadow-sm)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Card Header: Name + Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isWinningPlayer ? 'var(--gold-primary)' : '#F5F3EA' }}>
                    {player.displayName}
                  </span>
                  {player.userId === currentUserId && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(أنت)</span>
                  )}
                </div>

                {gameMode === GameMode.Quadruple && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.35rem',
                      background: player.teamIndex === 1 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                      color: player.teamIndex === 1 ? '#93c5fd' : '#fca5a5'
                    }}
                  >
                    فريق {player.teamIndex}
                  </span>
                )}
              </div>

              {/* Hand Tiles Showcase */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.3rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  minHeight: '44px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.35rem 0.4rem',
                  borderRadius: '0.5rem'
                }}
              >
                {handTiles.length > 0 ? (
                  handTiles.map((tile) => (
                    <DominoTileView
                      key={`blocked-tile-${player.userId}-${tile.id}`}
                      tile={tile}
                      size="tiny"
                      orientation="horizontal"
                    />
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>لا توجد أوراق</span>
                )}
              </div>

              {/* Footer: Pip Total & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                  المجموع: <strong style={{ color: isWinningPlayer ? 'var(--gold-primary)' : '#cbd5e1' }}>{pipSum} بنط</strong>
                </span>

                {isWinningPlayer && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--gold-primary)',
                      background: 'rgba(217, 181, 109, 0.2)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.4rem'
                    }}
                  >
                    <Trophy size={13} />
                    <span>{gameMode === GameMode.Quadruple ? (isLowestInTeam ? 'أقل ورقة فائزة 🏆' : 'فريق فائز 🏆') : 'الفائز بالقفلة 🏆'}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action to dismiss/continue */}
      <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
        {onViewPrompt && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onViewPrompt}
            style={{
              padding: '0.55rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Check size={16} />
            <span>متابعة للجولة التالية</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsVisible(false)}
          style={{
            padding: '0.55rem 1rem',
            fontSize: '0.85rem'
          }}
          title="تصغير لمعاينة الطاولة"
        >
          <span>إخفاء الكشف</span>
        </button>
      </div>
    </div>
  );
};
