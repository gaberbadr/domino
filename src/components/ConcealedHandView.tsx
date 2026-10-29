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

/**
 * Compact visual representation of the opponent's face-down domino tiles.
 * Renders an overlapping mini stack of 1-4 face-down dominoes with gold inlay and brass pins.
 */
const MiniConcealedStack: React.FC<{ count: number }> = ({ count }) => {
  const stackSize = Math.max(1, Math.min(count, 4));
  return (
    <div
      className="mini-concealed-stack"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        width: `${14 + (stackSize - 1) * 3}px`,
        height: '18px',
        marginRight: '0.15rem',
        marginLeft: '0.15rem',
        verticalAlign: 'middle',
        flexShrink: 0
      }}
      aria-hidden="true"
    >
      {Array.from({ length: stackSize }).map((_, i) => (
        <div
          key={i}
          className="mini-face-down-tile"
          style={{
            position: 'absolute',
            left: `${i * 3}px`,
            top: 0,
            width: '12px',
            height: '18px',
            borderRadius: '2.5px',
            background: 'linear-gradient(135deg, #2c2015 0%, #17110a 60%, #291e14 100%)',
            border: '1px solid rgba(217, 181, 109, 0.75)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.65)',
            zIndex: i + 1,
            transform: `rotate(${(i - Math.floor(stackSize / 2)) * 3}deg)`
          }}
        >
          {/* Miniature central brass spinner */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: '#D9B56D'
            }}
          />
        </div>
      ))}
    </div>
  );
};

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
  // Clamp number of visual tiles to display for the larger fan on desktop
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
          gap: '0.45rem',
          padding: '0.3rem 0.75rem',
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
            boxShadow: isConnected ? '0 0 6px #10b981' : 'none',
            flexShrink: 0
          }}
          title={isConnected ? 'متصل' : 'غير متصل (مهلة دقيقتين)'}
        />

        {/* Player Name */}
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: isTeammate ? 'var(--gold-primary)' : '#f8fafc',
            maxWidth: '110px',
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
            style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
          >
            {isTeammate ? 'شريكك' : `فريق ${teamIndex}`}
          </span>
        )}

        {/* Opponent Remaining Tiles Visual Stack + Synchronized Numeric Count */}
        <div
          className="opponent-tiles-indicator"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '9999px',
            background: isCurrentTurn ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.08)',
            border: isCurrentTurn ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)'
          }}
          title={`${tileCount} ورقة في يد اللاعب`}
        >
          {tileCount > 0 && <MiniConcealedStack count={tileCount} />}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 900,
              color: isCurrentTurn ? '#10b981' : '#f8fafc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15rem'
            }}
          >
            <span>{tileCount}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 700 }}>
              {tileCount === 1 ? 'ورقة' : 'ورقات'}
            </span>
          </span>
        </div>

        {/* Turn indicator pulse */}
        {isCurrentTurn && (
          <Clock size={13} style={{ color: '#10b981', animation: 'spin 4s linear infinite', flexShrink: 0 }} />
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
