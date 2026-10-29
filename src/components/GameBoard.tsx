import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GameMatchDto, BoardPlacedTile, GameMode, BoardEnd, MatchStatus } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { ConcealedHandView } from './ConcealedHandView';
import { DominoBankView } from './DominoBankView';
import { ExitConfirmationModal } from './ExitConfirmationModal';
import { AutoSkipButton } from './AutoSkipButton';
import { VoiceChatControls } from './VoiceChatControls';
import { calculateBoardLayout } from '../services/dominoLayoutEngine';
import { STRINGS } from '../constants/strings';
import { Clock, Hand, LogOut, Volume2, Sliders } from 'lucide-react';

interface GameBoardProps {
  match: GameMatchDto;
  currentUserId: string;
  canDraw: boolean;
  canSkip: boolean;
  isDrawing?: boolean;
  isChoiceActive?: boolean;
  roomCode?: string;
  onDraw: () => void;
  onSkip: () => void;
  onRequestTeammateStart?: () => void;
  onDropTileOnEnd?: (tileId: number, end: BoardEnd) => void;
  onSelectEnd?: (end: BoardEnd) => void;
  onExitGame?: () => void;
  onOpenSoundboard?: () => void;
  onOpenSoundSettings?: () => void;
}

export const TurnTimerPill: React.FC<{ turnDeadlineUtc?: string | null }> = React.memo(({ turnDeadlineUtc }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  useEffect(() => {
    if (!turnDeadlineUtc) return;
    const deadline = new Date(turnDeadlineUtc).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsRemaining(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [turnDeadlineUtc]);

  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 10;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        background: isUrgent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)',
        border: isUrgent ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
        color: isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : '#f8fafc',
        fontWeight: 800,
        fontSize: '0.82rem',
        transition: 'background 0.3s, color 0.3s'
      }}
    >
      <Clock size={14} />
      <span>{secondsRemaining}ث</span>
    </div>
  );
});

export const GameBoard: React.FC<GameBoardProps> = React.memo(({
  match,
  currentUserId,
  canDraw,
  canSkip,
  isDrawing = false,
  isChoiceActive = false,
  roomCode,
  onDraw,
  onSkip,
  onRequestTeammateStart,
  onDropTileOnEnd,
  onSelectEnd,
  onExitGame,
  onOpenSoundboard,
  onOpenSoundSettings
}) => {
  const [dragOverEnd, setDragOverEnd] = useState<BoardEnd | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500
  });

  // Observe outer table container size (avoids scrollbar-triggered layout oscillations)
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    let animId: number;

    const updateDims = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        if (!tableContainerRef.current) return;
        const w = tableContainerRef.current.clientWidth - 130;
        const h = tableContainerRef.current.clientHeight - 85;
        if (w > 100 && h > 100) {
          setBoardDimensions((prev) => {
            if (Math.abs(prev.width - w) < 16 && Math.abs(prev.height - h) < 16) {
              return prev;
            }
            return { width: Math.round(w), height: Math.round(h) };
          });
        }
      });
    };

    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  const isMyTurn = match.currentTurnUserId === currentUserId;
  const currentTurnPlayer = match.players.find((p) => p.userId === match.currentTurnUserId);

  // Find my seat index & relative seating
  const myIndex = match.players.findIndex((p) => p.userId === currentUserId);
  const myPlayer = match.players[myIndex] || match.players[0];
  const totalPlayers = match.players.length;

  let topPlayer = totalPlayers > 1 ? match.players[(myIndex + (totalPlayers === 3 ? 2 : totalPlayers === 4 ? 2 : 1)) % totalPlayers] : null;
  let rightPlayer = totalPlayers >= 3 ? match.players[(myIndex + 1) % totalPlayers] : null;
  let leftPlayer = totalPlayers === 4 ? match.players[(myIndex + 3) % totalPlayers] : null;

  // Calculate continuous domino chain layout
  const layoutResult = useMemo(() => {
    return calculateBoardLayout({
      chain: match.boardChain,
      openLeft: match.openLeft ?? null,
      openRight: match.openRight ?? null,
      boardWidth: boardDimensions.width,
      boardHeight: boardDimensions.height
    });
  }, [match.boardChain, match.openLeft, match.openRight, boardDimensions]);

  // Max order index to identify newest played tile
  const maxOrderIndex = match.boardChain.length > 0
    ? Math.max(...match.boardChain.map((t) => t.orderIndex))
    : -1;

  // Board Drop Handlers for Drag-to-Play
  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>, end: BoardEnd) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverEnd !== end) {
      setDragOverEnd(end);
    }
  };

  const handleBoardDrop = (e: React.DragEvent<HTMLDivElement>, end: BoardEnd) => {
    e.preventDefault();
    setDragOverEnd(null);
    const tileIdStr = e.dataTransfer.getData('domino/tile-id');
    if (tileIdStr && onDropTileOnEnd) {
      const tileId = parseInt(tileIdStr, 10);
      if (!isNaN(tileId)) {
        onDropTileOnEnd(tileId, end);
      }
    }
  };

  return (
    <div
      ref={tableContainerRef}
      className="game-table-container"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'var(--bg-table)',
        border: '3px solid var(--table-border)',
        borderRadius: '1.25rem',
        margin: '0.4rem 0.65rem',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 70px rgba(0, 0, 0, 0.85), 0 12px 35px rgba(0, 0, 0, 0.65)'
      }}
    >
      {/* Top Header: Organized via Flexbox into 4 Distinct Logical Groups */}
      <div
        className="game-table-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
          padding: '0.45rem 1rem',
          background: 'rgba(26, 18, 12, 0.92)',
          borderBottom: '1px solid rgba(229, 231, 235, 0.15)',
          backdropFilter: 'blur(10px)',
          zIndex: 20
        }}
      >
        {/* Group 1: Match & Round Information */}
        <div className="toolbar-group match-info-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>الجولة</span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--platinum-silver)' }}>{match.roundNumber}</strong>
          </div>

          <div style={{ height: 22, width: 1, background: 'rgba(255, 255, 255, 0.12)' }} />

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
              {match.mode === GameMode.Quadruple ? 'النتيجة (فريقك - الخصم)' : 'النتيجة (101 بنط)'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? '#60a5fa' : 'var(--platinum-light)'
                }}
              >
                {match.team1Score}
              </span>
              <span style={{ color: '#64748b', fontWeight: 800 }}>:</span>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? 'var(--platinum-light)' : '#60a5fa'
                }}
              >
                {match.team2Score}
              </span>
            </div>
          </div>
        </div>

        {/* Group 2: Turn Status & Timer Controls */}
        <div className="toolbar-group turn-timer-group" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              padding: '0.22rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 800,
              background: isMyTurn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#2a221b',
              color: isMyTurn ? '#000' : '#f8fafc',
              border: isMyTurn ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isMyTurn ? '0 0 12px rgba(16, 185, 129, 0.55)' : 'none'
            }}
          >
            {isMyTurn ? STRINGS.yourTurn : `دور: ${currentTurnPlayer?.displayName || 'اللاعب'}`}
          </div>

          <TurnTimerPill turnDeadlineUtc={match.turnDeadlineUtc} />

          {isMyTurn && canSkip && (
            <AutoSkipButton onSkip={onSkip} initialSeconds={3} />
          )}

          {match.mode === GameMode.Quadruple && onRequestTeammateStart && !isMyTurn && (
            <button
              className="btn btn-secondary"
              onClick={onRequestTeammateStart}
              style={{ padding: '0.32rem 0.65rem', fontSize: '0.75rem', gap: '0.25rem' }}
              title="طلب بداية الجولة بدلاً من الزميل"
            >
              <Hand size={13} />
              <span>طلب البداية</span>
            </button>
          )}
        </div>

        {/* Group 3: Audio & Voice Controls */}
        <div className="toolbar-group audio-controls-group" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {roomCode && (
            <VoiceChatControls roomCode={roomCode} compact={true} />
          )}

          {onOpenSoundboard && (
            <button
              className="btn btn-primary"
              onClick={onOpenSoundboard}
              style={{ padding: '0.32rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
              title="ريأكشنات وأصوات القهوة"
            >
              <Volume2 size={14} />
              <span>أصوات القهوة 🎙️</span>
            </button>
          )}

          {onOpenSoundSettings && (
            <button
              className="btn btn-secondary"
              onClick={onOpenSoundSettings}
              style={{ padding: '0.32rem 0.55rem', fontSize: '0.75rem' }}
              title="إعدادات الصوت"
            >
              <Sliders size={14} />
            </button>
          )}
        </div>

        {/* Group 4: Exit Control (Separate & Isolated) */}
        <div className="toolbar-group exit-controls-group" style={{ display: 'flex', alignItems: 'center' }}>
          {onExitGame && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsExitModalOpen(true)}
              style={{
                padding: '0.32rem 0.65rem',
                fontSize: '0.78rem',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)'
              }}
              title="مغادرة الماتش"
            >
              <LogOut size={14} />
              <span style={{ marginRight: '0.25rem' }}>خروج</span>
            </button>
          )}
        </div>
      </div>

      {/* Virtual Table Canvas with Opponents on Perimeters */}
      <div
        className="virtual-felt-area"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          gridTemplateColumns: leftPlayer ? 'auto 1fr auto' : '1fr auto',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Opponent (Across table in 1v1, 3p, or 4p) */}
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '0.35rem',
            paddingBottom: '0.2rem',
            zIndex: 10
          }}
        >
          {topPlayer && (
            <ConcealedHandView
              displayName={topPlayer.displayName}
              tileCount={topPlayer.tileCount}
              isCurrentTurn={match.currentTurnUserId === topPlayer.userId}
              isConnected={topPlayer.isConnected}
              teamIndex={topPlayer.teamIndex}
              mode={match.mode}
              position="top"
              isTeammate={match.mode === GameMode.Quadruple && topPlayer.teamIndex === myPlayer.teamIndex}
            />
          )}
        </div>

        {/* Left Opponent (in 4p Quadruple mode) */}
        {leftPlayer && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '0.75rem',
              zIndex: 10
            }}
          >
            <ConcealedHandView
              displayName={leftPlayer.displayName}
              tileCount={leftPlayer.tileCount}
              isCurrentTurn={match.currentTurnUserId === leftPlayer.userId}
              isConnected={leftPlayer.isConnected}
              teamIndex={leftPlayer.teamIndex}
              mode={match.mode}
              position="left"
              isTeammate={false}
            />
          </div>
        )}

        {/* Center Board Green Felt with Continuous Chain */}
        <div
          className="board-felt-canvas"
          style={{
            flex: 1,
            position: 'relative',
            margin: '0.45rem',
            borderRadius: '1rem',
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at center, #19523a 0%, #113c2a 65%, #092318 100%)',
            border: '2px solid rgba(229, 231, 235, 0.1)',
            boxShadow: 'inset 0 0 45px rgba(0, 0, 0, 0.75)'
          }}
        >
          {match.boardChain.length === 0 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '0.95rem',
                fontWeight: 600,
                gap: '0.5rem',
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 28,
                  borderRadius: 6,
                  border: '2px dashed rgba(255, 255, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}
              >
                6 | 6
              </div>
              <span>{STRINGS.waitingFirstMove}</span>
            </div>
          ) : (
            <div
              className="domino-chain-layout"
              style={{
                position: 'absolute',
                left: `${layoutResult.offsetX}px`,
                top: `${layoutResult.offsetY}px`,
                width: `${layoutResult.boundingBox.width}px`,
                height: `${layoutResult.boundingBox.height}px`,
                transform: `scale(${layoutResult.scale})`,
                transformOrigin: '0 0',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Left End Connection Point / Drop Zone (Strictly Outside Tile) */}
              {layoutResult.leftDropZone && (
                <div
                  className={`endpoint-marker left-end ${dragOverEnd === BoardEnd.Left ? 'active-drop' : ''} ${
                    isChoiceActive ? 'choice-active' : ''
                  }`}
                  onClick={() => {
                    if (isChoiceActive && onSelectEnd) onSelectEnd(BoardEnd.Left);
                  }}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Left)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Left)}
                  style={{
                    position: 'absolute',
                    left: `${layoutResult.leftDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: `${layoutResult.leftDropZone.y - layoutResult.boundingBox.minY}px`,
                    width: isChoiceActive ? 'auto' : `${layoutResult.leftDropZone.width}px`,
                    height: `${layoutResult.leftDropZone.height}px`
                  }}
                  title={isChoiceActive ? 'اضغط هنا للعب على الطرف الشمال' : 'طرف اللعب المفتوح (شمال)'}
                >
                  {isChoiceActive ? (
                    <span className="choice-btn-text">👈 هنا</span>
                  ) : (
                    <div className="endpoint-dock-dot" />
                  )}
                </div>
              )}

              {/* Placed Continuous Domino Tiles */}
              {layoutResult.tiles.map((placed) => {
                const isNewest = placed.orderIndex === maxOrderIndex && match.boardChain.length > 1;
                return (
                  <div
                    key={`${placed.tileId}-${placed.orderIndex}`}
                    className={`chain-tile-container ${placed.isLeftOpenEnd ? 'is-left-open' : ''} ${placed.isRightOpenEnd ? 'is-right-open' : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${placed.x - layoutResult.boundingBox.minX}px`,
                      top: `${placed.y - layoutResult.boundingBox.minY}px`,
                      width: `${placed.width}px`,
                      height: `${placed.height}px`,
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.75))',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <DominoTileView
                      tile={{
                        id: placed.tileId,
                        end1: placed.displayEnd1,
                        end2: placed.displayEnd2
                      }}
                      orientation={placed.orientation}
                      className={isNewest ? 'newly-played' : ''}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                );
              })}

              {/* Right End Connection Point / Drop Zone (Strictly Outside Tile) */}
              {layoutResult.rightDropZone && (
                <div
                  className={`endpoint-marker right-end ${dragOverEnd === BoardEnd.Right ? 'active-drop' : ''} ${
                    isChoiceActive ? 'choice-active' : ''
                  }`}
                  onClick={() => {
                    if (isChoiceActive && onSelectEnd) onSelectEnd(BoardEnd.Right);
                  }}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Right)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Right)}
                  style={{
                    position: 'absolute',
                    left: `${layoutResult.rightDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: `${layoutResult.rightDropZone.y - layoutResult.boundingBox.minY}px`,
                    width: isChoiceActive ? 'auto' : `${layoutResult.rightDropZone.width}px`,
                    height: `${layoutResult.rightDropZone.height}px`
                  }}
                  title={isChoiceActive ? 'اضغط هنا للعب على الطرف اليمين' : 'طرف اللعب المفتوح (يمين)'}
                >
                  {isChoiceActive ? (
                    <span className="choice-btn-text">👉 هنا</span>
                  ) : (
                    <div className="endpoint-dock-dot" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Opponent & Domino Bank Area */}
        <div
          className="table-right-sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingRight: '0.75rem',
            gap: '1rem',
            zIndex: 10
          }}
        >
          {/* Right Opponent (in 3p or 4p mode) */}
          {rightPlayer && (
            <ConcealedHandView
              displayName={rightPlayer.displayName}
              tileCount={rightPlayer.tileCount}
              isCurrentTurn={match.currentTurnUserId === rightPlayer.userId}
              isConnected={rightPlayer.isConnected}
              teamIndex={rightPlayer.teamIndex}
              mode={match.mode}
              position="right"
              isTeammate={false}
            />
          )}

          {/* Dedicated Bank Stack (Individual 1v1 mode ONLY) */}
          {match.mode === GameMode.Individual && (
            <DominoBankView
              bankCount={match.bankCount}
              canDraw={isMyTurn && canDraw}
              isDrawing={isDrawing}
              onDraw={onDraw}
            />
          )}
        </div>
      </div>

      {/* Leave Game Confirmation Modal */}
      <ExitConfirmationModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirm={() => {
          setIsExitModalOpen(false);
          onExitGame?.();
        }}
        mode={match.mode}
        isMatchActive={match.status === MatchStatus.Active}
        isLobby={false}
      />
    </div>
  );
});
