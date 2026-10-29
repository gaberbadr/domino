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
          opacity: 0.5,
          userSelect: 'none'
        }}
      >
        <div
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '0.75rem',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}
        >
          السحبة خلصت (0)
        </div>
      </div>
    );
  }

  // Visual stack layer count (up to 4 layers for 3D depth)
  const stackLayers = Math.min(bankCount, 4);

  return (
    <div
      className={`bank-stack-container ${canDraw ? 'can-draw' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        zIndex: 10,
        userSelect: 'none'
      }}
    >
      {/* 3D Stack of Concealed Tiles */}
      <div
        className="bank-tiles-stack"
        onClick={() => {
          if (canDraw && !isDrawing) {
            onDraw();
          }
        }}
        style={{
          position: 'relative',
          width: '70px',
          height: '60px',
          cursor: canDraw && !isDrawing ? 'pointer' : 'default',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        title={canDraw ? 'اضغط لسحب ورقة من السحبة' : `السحبة متبقي فيها ${bankCount} ورقة`}
      >
        {Array.from({ length: stackLayers }).map((_, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: `${idx * -4}px`,
              left: `${idx * 2}px`,
              zIndex: idx,
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.6)',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <DominoTileView
              isConcealed={true}
              orientation="horizontal"
              size="small"
              className={canDraw && idx === stackLayers - 1 ? 'top-bank-tile' : ''}
            />
          </div>
        ))}

        {/* Flying tile draw animation element when isDrawing is true */}
        {isDrawing && (
          <div className={`flying-draw-tile ${drawTargetDirection === 'up' ? 'flying-up' : 'flying-down'}`}>
            <DominoTileView isConcealed={true} orientation="vertical" size="small" />
          </div>
        )}
      </div>

      {/* Bank Count & Action Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: canDraw ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: canDraw ? 'var(--gold-primary)' : '#e2e8f0',
            backdropFilter: 'blur(4px)',
            boxShadow: canDraw ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none'
          }}
        >
          <Layers size={13} />
          <span>السحبة: {bankCount}</span>
        </div>

        {canDraw && (
          <button
            onClick={onDraw}
            disabled={isDrawing}
            className="btn btn-primary"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              gap: '0.3rem',
              animation: 'pulseGlow 1.8s infinite ease-in-out'
            }}
          >
            <ArrowDown size={14} />
            <span>{isDrawing ? 'جاري السحب...' : STRINGS.drawTile}</span>
          </button>
        )}
      </div>
    </div>
  );
};
