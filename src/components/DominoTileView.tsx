import React from 'react';
import { DominoTile } from '../types/domino';

export interface DominoTileViewProps {
  tile?: DominoTile;
  isConcealed?: boolean;
  orientation?: 'vertical' | 'horizontal';
  isPlayable?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isDragging?: boolean;
  isShaking?: boolean;
  size?: 'tiny' | 'small' | 'normal' | 'large';
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  className?: string;
}

interface PipCoord {
  x: number;
  y: number;
}

/**
 * Standard Double-Six Domino Pip Coordinates within a 100x100 half-square.
 * When isHalfVertical is true (vertical tile), 6 pips render as 2 vertical columns of 3.
 * When isHalfVertical is false (horizontal tile), 6 pips render as 2 horizontal rows of 3.
 */
function getPipCoordinates(count: number, isHalfVertical: boolean, offsetX: number, offsetY: number): PipCoord[] {
  const clamped = Math.max(0, Math.min(6, Math.floor(count)));
  const base: PipCoord[] = [];

  switch (clamped) {
    case 0:
      break;
    case 1:
      base.push({ x: 50, y: 50 });
      break;
    case 2:
      base.push({ x: 28, y: 28 }, { x: 72, y: 72 });
      break;
    case 3:
      base.push({ x: 28, y: 28 }, { x: 50, y: 50 }, { x: 72, y: 72 });
      break;
    case 4:
      base.push({ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 });
      break;
    case 5:
      base.push({ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 50, y: 50 }, { x: 28, y: 72 }, { x: 72, y: 72 });
      break;
    case 6:
      if (isHalfVertical) {
        // Two vertical columns of 3
        base.push(
          { x: 28, y: 26 },
          { x: 28, y: 50 },
          { x: 28, y: 74 },
          { x: 72, y: 26 },
          { x: 72, y: 50 },
          { x: 72, y: 74 }
        );
      } else {
        // Two horizontal rows of 3
        base.push(
          { x: 26, y: 28 },
          { x: 50, y: 28 },
          { x: 74, y: 28 },
          { x: 26, y: 72 },
          { x: 50, y: 72 },
          { x: 74, y: 72 }
        );
      }
      break;
  }

  return base.map((p) => ({
    x: p.x + offsetX,
    y: p.y + offsetY
  }));
}

export const DominoGlobalDefs: React.FC = () => (
  <svg
    id="domino-global-defs"
    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    aria-hidden="true"
  >
    <defs>
      {/* Luxury Ivory/Resin Tile Body Gradient */}
      <linearGradient id="domino-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fcfaf5" />
        <stop offset="45%" stopColor="#f6f2e8" />
        <stop offset="100%" stopColor="#ebe4d4" />
      </linearGradient>

      {/* Realistic Metallic Brass Pin Gradient */}
      <linearGradient id="domino-brass-grad" x1="20%" y1="20%" x2="80%" y2="80%">
        <stop offset="0%" stopColor="#ffe699" />
        <stop offset="40%" stopColor="#d4af37" />
        <stop offset="70%" stopColor="#a37c22" />
        <stop offset="100%" stopColor="#694e0e" />
      </linearGradient>

      {/* Recessed Inlaid Obsidian/Espresso Pip Gradient */}
      <radialGradient id="domino-pip-grad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#3a2f26" />
        <stop offset="70%" stopColor="#18120c" />
        <stop offset="100%" stopColor="#080604" />
      </radialGradient>

      {/* Concealed Tile Ebony/Rosewood Wood Back Gradient */}
      <linearGradient id="domino-concealed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2c1d14" />
        <stop offset="50%" stopColor="#1e130c" />
        <stop offset="100%" stopColor="#110a06" />
      </linearGradient>
    </defs>
  </svg>
);

const bodyGradId = 'domino-body-grad';
const brassGradId = 'domino-brass-grad';
const pipGradId = 'domino-pip-grad';
const concealedGradId = 'domino-concealed-grad';

export const DominoTileView: React.FC<DominoTileViewProps> = ({
  tile,
  isConcealed = false,
  orientation = 'vertical',
  isPlayable = false,
  isSelected = false,
  isDisabled = false,
  isDragging = false,
  isShaking = false,
  size = 'normal',
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  onTouchStart,
  style = {},
  className = ''
}) => {
  const isVertical = orientation === 'vertical';

  // Concealed Tile (Face Down)
  if (isConcealed || !tile) {
    return (
      <div
        className={`domino-tile concealed ${orientation} size-${size} ${className}`}
        style={style}
        title="ورقة دومينو مقلوبة"
      >
        <svg
          viewBox={isVertical ? '0 0 100 200' : '0 0 200 100'}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          className="domino-tile-svg"
        >
          {isVertical ? (
            <>
              {/* Outer Tile Rect */}
              <rect
                x="1.5"
                y="1.5"
                width="97"
                height="197"
                rx="9"
                ry="9"
                fill={`url(#${concealedGradId})`}
                stroke="#84572c"
                strokeWidth="2"
              />
              {/* Inner Decorative Dashed Border */}
              <rect
                x="7"
                y="7"
                width="86"
                height="186"
                rx="6"
                ry="6"
                fill="none"
                stroke="rgba(212, 175, 55, 0.45)"
                strokeWidth="1.2"
                strokeDasharray="4 2.5"
              />
              {/* Central Diamond Motif */}
              <polygon
                points="50,86 64,100 50,114 36,100"
                fill="none"
                stroke="rgba(212, 175, 55, 0.6)"
                strokeWidth="1.5"
              />
              {/* Central Brass Pivot */}
              <circle cx="50" cy="100" r="4.5" fill="#3a2f1d" />
              <circle cx="50" cy="100" r="3.5" fill={`url(#${brassGradId})`} />
              <circle cx="48.5" cy="98.5" r="1.2" fill="#fff" opacity="0.8" />
            </>
          ) : (
            <>
              {/* Horizontal Concealed Rect */}
              <rect
                x="1.5"
                y="1.5"
                width="197"
                height="97"
                rx="9"
                ry="9"
                fill={`url(#${concealedGradId})`}
                stroke="#84572c"
                strokeWidth="2"
              />
              <rect
                x="7"
                y="7"
                width="186"
                height="86"
                rx="6"
                ry="6"
                fill="none"
                stroke="rgba(212, 175, 55, 0.45)"
                strokeWidth="1.2"
                strokeDasharray="4 2.5"
              />
              <polygon
                points="100,36 114,50 100,64 86,50"
                fill="none"
                stroke="rgba(212, 175, 55, 0.6)"
                strokeWidth="1.5"
              />
              <circle cx="100" cy="50" r="4.5" fill="#3a2f1d" />
              <circle cx="100" cy="50" r="3.5" fill={`url(#${brassGradId})`} />
              <circle cx="98.5" cy="48.5" r="1.2" fill="#fff" opacity="0.8" />
            </>
          )}
        </svg>
      </div>
    );
  }

  const isDouble = tile.end1 === tile.end2;

  // Calculate Pip Coordinates for Both Halves
  const half1Pips = isVertical
    ? getPipCoordinates(tile.end1, true, 0, 0)
    : getPipCoordinates(tile.end1, false, 0, 0);

  const half2Pips = isVertical
    ? getPipCoordinates(tile.end2, true, 0, 100)
    : getPipCoordinates(tile.end2, false, 100, 0);

  return (
    <div
      className={`domino-tile ${orientation} size-${size} ${isPlayable ? 'playable' : ''} ${
        isSelected ? 'selected' : ''
      } ${isDisabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''} ${
        isShaking ? 'tile-rejected-shake' : ''
      } ${isDouble ? 'is-double' : ''} ${className}`}
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onClick={() => {
        if (!isDisabled && onClick) {
          onClick();
        }
      }}
      title={`[${tile.end1}|${tile.end2}]`}
    >
      <svg
        viewBox={isVertical ? '0 0 100 200' : '0 0 200 100'}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="domino-tile-svg"
      >
        {isVertical ? (
          <>
            {/* Tile Base */}
            <rect
              x="1.5"
              y="1.5"
              width="97"
              height="197"
              rx="9"
              ry="9"
              fill={`url(#${bodyGradId})`}
              stroke="#cfc7b6"
              strokeWidth="1.5"
            />
            {/* Inner Bevel Light */}
            <rect
              x="3.5"
              y="3.5"
              width="93"
              height="193"
              rx="7"
              ry="7"
              fill="none"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="1"
            />

            {/* Engraved Horizontal Dividing Line */}
            <line x1="8" y1="100" x2="92" y2="100" stroke="#7e766a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="101.5" x2="92" y2="101.5" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" strokeLinecap="round" />

            {/* Central Brass Spinner Pin */}
            <circle cx="50" cy="100" r="4.5" fill="#3a2f1d" />
            <circle cx="50" cy="100" r="3.5" fill={`url(#${brassGradId})`} />
            <circle cx="48.5" cy="98.5" r="1.2" fill="#fff" opacity="0.85" />
          </>
        ) : (
          <>
            {/* Horizontal Tile Base */}
            <rect
              x="1.5"
              y="1.5"
              width="197"
              height="97"
              rx="9"
              ry="9"
              fill={`url(#${bodyGradId})`}
              stroke="#cfc7b6"
              strokeWidth="1.5"
            />
            {/* Inner Bevel Light */}
            <rect
              x="3.5"
              y="3.5"
              width="193"
              height="93"
              rx="7"
              ry="7"
              fill="none"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="1"
            />

            {/* Engraved Vertical Dividing Line */}
            <line x1="100" y1="8" x2="100" y2="92" stroke="#7e766a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="101.5" y1="8" x2="101.5" y2="92" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1" strokeLinecap="round" />

            {/* Central Brass Spinner Pin */}
            <circle cx="100" cy="50" r="4.5" fill="#3a2f1d" />
            <circle cx="100" cy="50" r="3.5" fill={`url(#${brassGradId})`} />
            <circle cx="98.5" cy="48.5" r="1.2" fill="#fff" opacity="0.85" />
          </>
        )}

        {/* Render Half 1 Pips */}
        {half1Pips.map((p, idx) => (
          <g key={`h1-${idx}`}>
            <circle cx={p.x} cy={p.y} r="7.2" fill={`url(#${pipGradId})`} />
            <circle cx={p.x - 1.8} cy={p.y - 1.8} r="2.2" fill="#fff" opacity="0.18" />
          </g>
        ))}

        {/* Render Half 2 Pips */}
        {half2Pips.map((p, idx) => (
          <g key={`h2-${idx}`}>
            <circle cx={p.x} cy={p.y} r="7.2" fill={`url(#${pipGradId})`} />
            <circle cx={p.x - 1.8} cy={p.y - 1.8} r="2.2" fill="#fff" opacity="0.18" />
          </g>
        ))}
      </svg>
    </div>
  );
};
