import React, { useState, useEffect, useRef } from 'react';
import { DominoTile, LegalMoveDto } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { MoveHorizontal } from 'lucide-react';

interface PlayerHandProps {
  hand: DominoTile[];
  legalMoves: LegalMoveDto[];
  isMyTurn: boolean;
  rejectedTileId?: number | null;
  recentlyDrawnTileId?: number | null;
  onTileClick: (tile: DominoTile) => void;
  onTileDragStartPlay?: (tile: DominoTile) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  legalMoves,
  isMyTurn,
  rejectedTileId = null,
  recentlyDrawnTileId = null,
  onTileClick,
  onTileDragStartPlay
}) => {
  // Local presentation order of tiles in hand (allows player to drag-and-drop to reorder)
  const [orderedTiles, setOrderedTiles] = useState<DominoTile[]>(hand);
  const [draggedTileIndex, setDraggedTileIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  // Touch Drag-and-Drop state ref (touchscreen reordering on mobile devices)
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    currentIndex: number;
    tile: DominoTile;
    isDragging: boolean;
    hasMoved: boolean;
  } | null>(null);

  // Sync hand while preserving user's custom ordering
  useEffect(() => {
    setOrderedTiles((prevOrdered) => {
      const currentIds = new Set(hand.map((t) => t.id));
      const preserved = prevOrdered.filter((t) => currentIds.has(t.id));
      const preservedIds = new Set(preserved.map((t) => t.id));
      const newTiles = hand.filter((t) => !preservedIds.has(t.id));
      const combined = [...preserved, ...newTiles];
      return combined.length === hand.length ? combined : hand;
    });
  }, [hand]);

  const isTilePlayable = (tileId: number) => {
    if (!isMyTurn) return false;
    return legalMoves.some((m) => m.tile.id === tileId);
  };

  // Reorder logic: Move tile from sourceIndex to targetIndex
  const reorderTiles = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    setOrderedTiles((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(sourceIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  // Drag-and-drop HTML5 handlers (Mouse on Desktop/Laptop)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number, tile: DominoTile) => {
    setDraggedTileIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('domino/tile-id', tile.id.toString());

    if (onTileDragStartPlay && isTilePlayable(tile.id)) {
      onTileDragStartPlay(tile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedTileIndex !== null) {
      reorderTiles(draggedTileIndex, targetIndex);
    }
    setDraggedTileIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTileIndex(null);
    setDragOverIndex(null);
  };

  // Touch Drag-and-Drop Handlers (Mobile Touchscreens)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number, tile: DominoTile) => {
    const touch = e.touches[0];
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentIndex: index,
      tile,
      isDragging: false,
      hasMoved: false
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStateRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStateRef.current.startX;
    const dy = touch.clientY - touchStateRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // If moved more than 8px predominantly horizontally, activate reorder mode
    if (!touchStateRef.current.isDragging && dist > 8) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        touchStateRef.current.isDragging = true;
        touchStateRef.current.hasMoved = true;
        setDraggedTileIndex(touchStateRef.current.currentIndex);
      }
    }

    if (touchStateRef.current.isDragging) {
      if (e.cancelable) {
        e.preventDefault();
      }
      // Locate which tile wrapper is under the current touch point
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetWrapper = el?.closest('[data-tile-index]');
      if (targetWrapper) {
        const targetIdx = Number(targetWrapper.getAttribute('data-tile-index'));
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < orderedTiles.length) {
          setDragOverIndex(targetIdx);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, index: number, tile: DominoTile) => {
    if (!touchStateRef.current) return;
    const { isDragging, hasMoved } = touchStateRef.current;

    if (isDragging && dragOverIndex !== null && dragOverIndex !== index) {
      reorderTiles(index, dragOverIndex);
    }

    touchStateRef.current = null;
    setDraggedTileIndex(null);
    setDragOverIndex(null);

    // If no drag occurred, this was a clean tap -> select or play the tile!
    if (!hasMoved) {
      setSelectedTileId(tile.id);
      onTileClick(tile);
    }
  };

  const handleTouchCancel = () => {
    touchStateRef.current = null;
    setDraggedTileIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      className="player-hand-container"
      style={{
        background: 'linear-gradient(180deg, rgba(32, 23, 16, 0.98) 0%, rgba(18, 13, 9, 0.99) 100%)',
        borderTop: '2px solid rgba(229, 231, 235, 0.25)',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.8)',
        padding: '0.45rem 1rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 30,
        position: 'relative'
      }}
    >
      {/* Hand Header: Info & Reorder tips */}
      <div
        className="player-hand-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1000px',
          marginBottom: '0.25rem',
          padding: '0 0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
            ورقك في اليد ({hand.length} ورقات)
          </span>

          <span
            className="reorder-tip-text"
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <MoveHorizontal size={13} />
            <span>اسحب بالماوس/اللمس لترتيب ورقك</span>
          </span>
        </div>

        {/* Playable count pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isMyTurn && legalMoves.length > 0 && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              معاك {legalMoves.length} {legalMoves.length === 1 ? 'ورقة قابلة للعب' : 'ورقات تقدر تلعبهم'}
            </span>
          )}
        </div>
      </div>

      {/* Tiles Row / Touch-reorderable container */}
      <div
        className="hand-tiles-row"
        style={{
          display: 'flex',
          gap: orderedTiles.length > 8 ? '0.25rem' : '0.45rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '0.25rem 0.4rem 0.35rem',
          maxWidth: '100%',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          scrollBehavior: 'smooth',
          touchAction: 'pan-x'
        }}
      >
        {orderedTiles.map((tile, index) => {
          const playable = isTilePlayable(tile.id);
          const isSelected = selectedTileId === tile.id;
          const isBeingDragged = draggedTileIndex === index;
          const isTargeted = dragOverIndex === index && draggedTileIndex !== index;
          const isShaking = rejectedTileId === tile.id;

          return (
            <div
              key={tile.id}
              data-tile-index={index}
              className={`hand-tile-wrapper ${isBeingDragged ? 'is-dragged' : ''} ${
                isTargeted ? 'is-drop-target' : ''
              } ${recentlyDrawnTileId === tile.id ? 'just-drawn' : ''}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onTouchStart={(e) => handleTouchStart(e, index, tile)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, index, tile)}
              onTouchCancel={handleTouchCancel}
              style={{
                flexShrink: 0,
                position: 'relative',
                transform: isTargeted ? 'scale(1.08)' : isSelected ? 'translateY(-8px)' : 'none',
                transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                padding: '0 2px',
                touchAction: 'none'
              }}
            >
              {/* Drop Target Marker */}
              {isTargeted && <div className="drag-insert-marker" />}

              <DominoTileView
                tile={tile}
                orientation="vertical"
                size={orderedTiles.length > 8 ? 'small' : 'normal'}
                isPlayable={playable}
                isSelected={isSelected}
                isDisabled={isMyTurn && !playable}
                isDragging={isBeingDragged}
                isShaking={isShaking}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index, tile)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  // Only handle desktop mouse clicks here; touch is handled cleanly in handleTouchEnd
                  if (!('ontouchstart' in window) || window.matchMedia('(pointer: fine)').matches) {
                    setSelectedTileId(tile.id);
                    onTileClick(tile);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
