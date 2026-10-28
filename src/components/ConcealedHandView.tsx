import React from 'react';
import { DominoTileView } from './DominoTileView';
import { GameMode } from '../types/domino';
import { Clock } from 'lucide-react';

interface ConcealedHandViewProps {
  displayName: string;
  tileCount: number;
  isCurrentTurn: boolean;
  isConnected: boolean;
  teamIndex?: number; // 1 or 2 in Quadruple mode
  mode: GameMode;
  position: 'top' | 'right' | 'left';
  isTeammate?: boolean;
}

export const ConcealedHandView: React.FC<ConcealedHandViewProps> = ({
  displayName,
  tileCount,
  isCurrentTurn,
  isConnected,
  teamIndex,
  mode,
  position,
  isTeammate = false
}) => {
  // Clamp number of visual tiles to display (max 7-9 for clean layout)
  const visualTileCount = Math.min(tileCount, 9);
  const visualTiles = Array.from({ length: visualTileCount });

  const isVerticalSeat = position === 'right' || position === 'left';

  return (
    <div
      className={`opponent-seat seat-${position} ${isCurrentTurn ? 'active-turn' : ''} ${
        isTeammate ? 'teammate-seat' : ''
      }`}
      style={{
        display: 'flex',
        flexDirection: isVerticalSeat ? 'column' : 'column',
        alignItems: 'center',
        gap: '0.35rem',
        zIndex: 15
      }}
    >
      {/* Player Header Card */}
      <div
        className={`player-badge-card ${isCurrentTurn ? 'turn-pulse' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '9999px',
          background: isCurrentTurn
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)'
            : isTeammate
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(180, 83, 9, 0.15) 100%)'
            : 'rgba(15, 23, 42, 0.85)',
          border: isCurrentTurn
            ? '2px solid #10b981'
            : isTeammate
            ? '2px solid var(--gold-primary)'
            : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isCurrentTurn
            ? '0 0 15px rgba(16, 185, 129, 0.5)'
            : '0 4px 12px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Connection status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444',
            boxShadow: isConnected ? '0 0 6px #10b981' : 'none'
          }}
          title={isConnected ? 'متصل' : 'غير متصل (مهلة دقيقتين)'}
        />

        {/* Player Name */}
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: isTeammate ? 'var(--gold-primary)' : '#f8fafc',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayName}
        </span>

        {/* Teammate / Team badge */}
        {mode === GameMode.Quadruple && (
          <span
            className={`badge ${isTeammate ? 'badge-gold' : teamIndex === 1 ? 'badge-gold' : 'badge-blue'}`}
            style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
          >
            {isTeammate ? 'شريكك' : `فريق ${teamIndex}`}
          </span>
        )}

        {/* Tile Count Pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            background: isCurrentTurn ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
            color: isCurrentTurn ? '#000' : '#e2e8f0'
          }}
        >
          {tileCount} {tileCount === 1 ? 'ورقة' : 'ورقات'}
        </span>

        {/* Turn indicator pulse */}
        {isCurrentTurn && (
          <Clock size={14} style={{ color: '#10b981', animation: 'spin 4s linear infinite' }} />
        )}
      </div>

      {/* Fan / Row of Concealed Tiles */}
      <div
        className={`concealed-hand-row ${position}`}
        style={{
          display: 'flex',
          flexDirection: isVerticalSeat ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isVerticalSeat ? '-22px' : '-20px',
          padding: '0.2rem'
        }}
      >
        {visualTiles.map((_, idx) => (
          <div
            key={idx}
            style={{
              transform: isVerticalSeat
                ? `translateY(${idx * -14}px)`
                : `translateX(${idx * (position === 'top' ? -12 : 12)}px)`,
              zIndex: idx,
              transition: 'transform 0.2s ease',
              filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.5))'
            }}
          >
            <DominoTileView
              isConcealed={true}
              orientation={isVerticalSeat ? 'horizontal' : 'vertical'}
              size="small"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
