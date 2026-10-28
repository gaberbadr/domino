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
  size?: 'tiny' | 'small' | 'normal' | 'large';
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const DominoTileView: React.FC<DominoTileViewProps> = ({
  tile,
  isConcealed = false,
  orientation = 'vertical',
  isPlayable = false,
  isSelected = false,
  isDisabled = false,
  isDragging = false,
  size = 'normal',
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  onTouchStart,
  style = {},
  className = ''
}) => {
  // Render pip dots for a half
  const renderPips = (count: number) => {
    // 3x3 grid: [0:top-left, 1:top-mid, 2:top-right, 3:mid-left, 4:center, 5:mid-right, 6:bot-left, 7:bot-mid, 8:bot-right]
    const pipSlots = [
      /* 0: top-left   */ count >= 2,
      /* 1: top-mid    */ false,
      /* 2: top-right  */ count >= 4,
      /* 3: mid-left   */ count === 6,
      /* 4: center     */ count === 1 || count === 3 || count === 5,
      /* 5: mid-right  */ count === 6,
      /* 6: bot-left   */ count >= 4,
      /* 7: bot-mid    */ false,
      /* 8: bot-right  */ count >= 2
    ];

    const pipSizeClass =
      size === 'tiny' ? 'pip-tiny' : size === 'small' ? 'pip-small' : size === 'large' ? 'pip-large' : 'pip-normal';

    return (
      <div className="domino-tile-half">
        {pipSlots.map((hasPip, index) => (
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
        ))}
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
      } ${isDisabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''} ${isDouble ? 'is-double' : ''} ${className}`}
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
