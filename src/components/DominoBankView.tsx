import React from 'react';
import { DominoTileView } from './DominoTileView';
import { Layers, ArrowDown } from 'lucide-react';
import { STRINGS } from '../constants/strings';

interface DominoBankViewProps {
  bankCount: number;
  canDraw: boolean;
  isDrawing: boolean;
  drawTargetDirection?: 'down' | 'up' | null;
  onDraw: () => void;
}

export const DominoBankView: React.FC<DominoBankViewProps> = ({
  bankCount,
  canDraw,
  isDrawing,
  drawTargetDirection = 'down',
  onDraw
}) => {
  if (bankCount <= 0) {
    return (
      <div
        className="bank-stack-container empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          opacity: 0.45,
          userSelect: 'none',
          pointerEvents: 'none'
        }}
        title="السحبة فارغة"
      >
        <div
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            fontSize: '0.75rem',
            color: '#94a3b8',
            backdropFilter: 'blur(4px)'
          }}
        >
          السحبة: 0
        </div>
      </div>
    );
  }

  // Visual stack layer count (up to 3 layers for realistic 3D depth, matching reference image)
  const stackLayers = Math.min(bankCount, 3);

  const handleBankClick = () => {
    if (canDraw && !isDrawing) {
      onDraw();
    }
  };

  return (
    <div
      className={`bank-stack-container ${canDraw ? 'can-draw' : ''}`}
      onClick={handleBankClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
        zIndex: 20,
        userSelect: 'none',
        cursor: canDraw && !isDrawing ? 'pointer' : 'default',
        touchAction: 'manipulation',
        transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.18s ease'
      }}
      title={canDraw ? 'اضغط هنا لسحب ورقة من السحبة' : `السحبة متبقي فيها ${bankCount} ورقة`}
    >
      {/* 3D Layered Stack of Concealed Face-Down Domino Tiles (Reference Image Style) */}
      <div
        className="bank-tiles-stack"
        style={{
          position: 'relative',
          width: '74px',
          height: '42px',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {Array.from({ length: stackLayers }).map((_, idx) => {
          // Offsets create isometric card/tile stack depth
          const offsetTop = (stackLayers - 1 - idx) * -3;
          const offsetLeft = (idx - Math.floor(stackLayers / 2)) * 1.5;
          const isTopTile = idx === stackLayers - 1;

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: `${offsetTop}px`,
                left: `calc(50% - 36px + ${offsetLeft}px)`,
                zIndex: idx + 1,
                borderRadius: '8px',
                boxShadow: isTopTile
                  ? (canDraw
                      ? '0 4px 14px rgba(0, 0, 0, 0.7), 0 0 12px rgba(217, 181, 109, 0.55)'
                      : '0 4px 10px rgba(0, 0, 0, 0.65)')
                  : '0 2px 5px rgba(0, 0, 0, 0.45)',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease'
              }}
            >
              <DominoTileView
                isConcealed={true}
                orientation="horizontal"
                size="small"
                className={canDraw && isTopTile ? 'top-bank-tile' : ''}
              />
            </div>
          );
        })}

        {/* Flying tile draw animation element when isDrawing is true */}
        {isDrawing && (
          <div className={`flying-draw-tile ${drawTargetDirection === 'up' ? 'flying-up' : 'flying-down'}`}>
            <DominoTileView isConcealed={true} orientation="vertical" size="small" />
          </div>
        )}
      </div>

      {/* Reference Image Style Pill Badge (Count & Interactive Draw Prompt) */}
      <div
        className={`bank-count-pill ${canDraw ? 'active-draw' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.3rem',
          padding: canDraw ? '0.22rem 0.65rem' : '0.18rem 0.55rem',
          borderRadius: '9999px',
          background: canDraw
            ? 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 55%, #d97706 100%)'
            : 'rgba(15, 23, 42, 0.88)',
          border: canDraw ? '1px solid #ffe885' : '1px solid rgba(255, 255, 255, 0.15)',
          color: canDraw ? '#181204' : '#e2e8f0',
          fontSize: '0.78rem',
          fontWeight: 800,
          backdropFilter: 'blur(6px)',
          boxShadow: canDraw
            ? '0 0 14px rgba(245, 158, 11, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)'
            : '0 2px 6px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease'
        }}
      >
        {canDraw ? (
          <>
            <ArrowDown size={13} strokeWidth={2.8} />
            <span style={{ letterSpacing: '0.2px' }}>
              {isDrawing ? 'جاري السحب...' : `اسحب (${bankCount})`}
            </span>
          </>
        ) : (
          <>
            <Layers size={12} opacity={0.8} />
            <span>{bankCount}</span>
          </>
        )}
      </div>
    </div>
  );
};
