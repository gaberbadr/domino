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

// Explicit, deterministic standard pip slot maps for 0–6 in 3x3 grid:
// 0: top-left,   1: top-center,   2: top-right
// 3: mid-left,   4: center,       5: mid-right
// 6: bot-left,   7: bot-center,   8: bot-right
const VERTICAL_PIP_MAP: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8] // 2 vertical columns of 3
};

const HORIZONTAL_PIP_MAP: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 1, 2, 6, 7, 8] // 2 horizontal rows of 3
};

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
  // Render pip dots for a half using explicit standard mapping
  const renderPips = (count: number) => {
    const clampedCount = Math.max(0, Math.min(6, count));
    const activeIndices = orientation === 'vertical'
      ? VERTICAL_PIP_MAP[clampedCount] || []
      : HORIZONTAL_PIP_MAP[clampedCount] || [];

    const pipSizeClass =
      size === 'tiny' ? 'pip-tiny' : size === 'small' ? 'pip-small' : size === 'large' ? 'pip-large' : 'pip-normal';

    return (
      <div className="domino-tile-half" data-pips={clampedCount}>
        {Array.from({ length: 9 }).map((_, index) => {
          const hasPip = activeIndices.includes(index);
          return (
            <div
              key={index}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {hasPip && <div className={`domino-pip ${pipSizeClass}`} />}
            </div>
          );
        })}
      </div>
    );
  };

  // Concealed Tile Back Design (Islamic geometric engraving & brass center pin)
  if (isConcealed || !tile) {
    return (
      <div
        className={`domino-tile concealed ${orientation} size-${size} ${className}`}
        style={{ ...style }}
        title="ورقة دومينو مقلوبة"
      >
        <div className="domino-back-pattern">
          <div className="domino-back-inner">
            <div className="domino-back-ornament" />
            <div className="domino-brass-pin" />
          </div>
        </div>
      </div>
    );
  }

  const isDouble = tile.end1 === tile.end2;

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
      {renderPips(tile.end1)}
      <div className={orientation === 'vertical' ? 'domino-divider-vertical' : 'domino-divider-horizontal'}>
        <div className="domino-brass-pin" />
      </div>
      {renderPips(tile.end2)}
    </div>
  );
};
