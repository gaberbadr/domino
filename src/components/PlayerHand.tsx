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

  const longPressTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newly drawn tile so it is immediately visible to the player
  useEffect(() => {
    if (recentlyDrawnTileId && scrollContainerRef.current) {
      const el = scrollContainerRef.current.querySelector(`[data-tile-id="${recentlyDrawnTileId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [recentlyDrawnTileId]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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

  // Touch Handlers: seamlessly distinguishing horizontal swipe vs deliberate drag vs tap
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number, tile: DominoTile) => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touch = e.touches[0];
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentIndex: index,
      tile,
      isDragging: false,
      hasMoved: false
    };

    // Deliberate hold activates tile reorder (220ms)
    longPressTimerRef.current = window.setTimeout(() => {
      if (touchStateRef.current && !touchStateRef.current.hasMoved) {
        touchStateRef.current.isDragging = true;
        setDraggedTileIndex(index);
        try {
          if ('vibrate' in navigator) navigator.vibrate(30);
        } catch {}
      }
    }, 220);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStateRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStateRef.current.startX;
    const dy = touch.clientY - touchStateRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // If movement occurs before long-press fires:
    if (!touchStateRef.current.isDragging) {
      if (dist > 8) {
        touchStateRef.current.hasMoved = true;
        // Check if movement is an intentional upward pull (dy < -20 and primarily vertical)
        if (dy < -20 && Math.abs(dy) > Math.abs(dx)) {
          if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          touchStateRef.current.isDragging = true;
          setDraggedTileIndex(touchStateRef.current.currentIndex);
        } else {
          // Horizontal motion is a swipe through hand!
          // Cancel reorder timer so scrolling never enters drag mode
          if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          // Do NOT prevent default; allow native smooth horizontal touch scroll!
          return;
        }
      } else {
        return;
      }
    }

    // Active reorder drag: prevent scrolling and track drop target
    if (e.cancelable) {
      e.preventDefault();
    }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetWrapper = el?.closest('[data-tile-index]');
    if (targetWrapper) {
      const targetIdx = Number(targetWrapper.getAttribute('data-tile-index'));
      if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < orderedTiles.length) {
        setDragOverIndex(targetIdx);
      }
    }

    // Auto-scroll when dragging near container boundaries
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const edgeThreshold = 40;
      if (touch.clientX < rect.left + edgeThreshold) {
        scrollContainerRef.current.scrollLeft -= 8;
      } else if (touch.clientX > rect.right - edgeThreshold) {
        scrollContainerRef.current.scrollLeft += 8;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, index: number, tile: DominoTile) => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStateRef.current) return;
    const { isDragging, hasMoved } = touchStateRef.current;

    if (isDragging && dragOverIndex !== null && dragOverIndex !== index) {
      reorderTiles(index, dragOverIndex);
    }

    touchStateRef.current = null;
    setDraggedTileIndex(null);
    setDragOverIndex(null);

    // If no drag and no movement occurred, clean tap selects/plays the tile
    if (!isDragging && !hasMoved) {
      setSelectedTileId(tile.id);
      onTileClick(tile);
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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

      {/* Horizontal Touch Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="hand-tiles-scroll-container"
        style={{
          width: '100%',
          maxWidth: '1000px',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          padding: '0.25rem 0.2rem 0.35rem',
          scrollbarWidth: 'none'
        }}
      >
        <div
          className="hand-tiles-row"
          style={{
            display: 'flex',
            gap: orderedTiles.length > 8 ? '0.25rem' : '0.45rem',
            minWidth: '100%',
            width: 'max-content',
            justifyContent: 'center',
            alignItems: 'center'
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
                data-tile-id={tile.id}
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
                  touchAction: isBeingDragged ? 'none' : 'pan-x'
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
    </div>
  );
};
