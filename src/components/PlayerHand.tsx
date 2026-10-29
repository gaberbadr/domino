import React, { useState, useEffect } from 'react';
import { DominoTile, LegalMoveDto } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { ChevronRight, ChevronLeft, MoveHorizontal } from 'lucide-react';

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

  // Drag-and-drop HTML5 handlers
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

  // Accessible button reordering for keyboard/touch
  const moveSelectedTile = (direction: 'left' | 'right') => {
    if (selectedTileId === null) return;
    const currentIndex = orderedTiles.findIndex((t) => t.id === selectedTileId);
    if (currentIndex === -1) return;

    // RTL context: 'right' means towards index 0, 'left' means towards higher index
    const targetIndex = direction === 'right' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < orderedTiles.length) {
      reorderTiles(currentIndex, targetIndex);
    }
  };

  return (
    <div
      className="player-hand-container"
      style={{
        background: 'linear-gradient(180deg, rgba(32, 23, 16, 0.98) 0%, rgba(18, 13, 9, 0.99) 100%)',
        borderTop: '2px solid rgba(229, 231, 235, 0.25)',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.8)',
        padding: '0.55rem 1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 30,
        position: 'relative'
      }}
    >
      {/* Hand Header: Info & Reorder tools */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1000px',
          marginBottom: '0.35rem',
          padding: '0 0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
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

        {/* Turn & Playable info or Accessibility Reorder controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedTileId !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.15rem 0.4rem',
                borderRadius: '6px'
              }}
            >
              <button
                type="button"
                onClick={() => moveSelectedTile('right')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                title="تحريك الورقة يميناً"
              >
                <ChevronRight size={14} />
              </button>
              <span style={{ fontSize: '0.7rem', color: 'var(--platinum-silver)', fontWeight: 700 }}>
                ترتيب يدوي
              </span>
              <button
                type="button"
                onClick={() => moveSelectedTile('left')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                title="تحريك الورقة يساراً"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}

          {isMyTurn && legalMoves.length > 0 && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              معاك {legalMoves.length} {legalMoves.length === 1 ? 'ورقة قابلة للعب' : 'ورقات تقدر تلعبهم'}
            </span>
          )}
        </div>
      </div>

      {/* Tiles Carousel / Horizontally Scrollable Row */}
      <div
        className="hand-tiles-row"
        style={{
          display: 'flex',
          gap: orderedTiles.length > 8 ? '0.4rem' : '0.65rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '0.4rem 0.5rem 0.6rem',
          maxWidth: '100%',
          width: '100%',
          justifyContent: orderedTiles.length <= 7 ? 'center' : 'flex-start',
          alignItems: 'center',
          scrollBehavior: 'smooth'
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
              className={`hand-tile-wrapper ${isBeingDragged ? 'is-dragged' : ''} ${
                isTargeted ? 'is-drop-target' : ''
              } ${recentlyDrawnTileId === tile.id ? 'just-drawn' : ''}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                flexShrink: 0,
                position: 'relative',
                transform: isTargeted ? 'scale(1.08)' : isSelected ? 'translateY(-10px)' : 'none',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                padding: '0 2px'
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
                  setSelectedTileId(tile.id);
                  onTileClick(tile);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
