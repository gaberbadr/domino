import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GameMatchDto, BoardPlacedTile, GameMode, BoardEnd, MatchStatus } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { ConcealedHandView } from './ConcealedHandView';
import { DominoBankView } from './DominoBankView';
import { ExitConfirmationModal } from './ExitConfirmationModal';
import { calculateBoardLayout } from '../services/dominoLayoutEngine';
import { STRINGS } from '../constants/strings';
import { Clock, SkipForward, Hand, LogOut, Volume2, Sliders } from 'lucide-react';

interface GameBoardProps {
  match: GameMatchDto;
  currentUserId: string;
  canDraw: boolean;
  canSkip: boolean;
  isDrawing?: boolean;
  onDraw: () => void;
  onSkip: () => void;
  onRequestTeammateStart?: () => void;
  onDropTileOnEnd?: (tileId: number, end: BoardEnd) => void;
  onExitGame?: () => void;
  onOpenSoundboard?: () => void;
  onOpenSoundSettings?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  match,
  currentUserId,
  canDraw,
  canSkip,
  isDrawing = false,
  onDraw,
  onSkip,
  onRequestTeammateStart,
  onDropTileOnEnd,
  onExitGame,
  onOpenSoundboard,
  onOpenSoundSettings
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [autoSkipSeconds, setAutoSkipSeconds] = useState<number>(3);
  const [dragOverEnd, setDragOverEnd] = useState<BoardEnd | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const boardFeltRef = useRef<HTMLDivElement>(null);
  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500
  });

  // Track board felt container size for dynamic responsive layout
  useEffect(() => {
    if (!boardFeltRef.current) return;
    const updateDims = () => {
      if (boardFeltRef.current) {
        const { clientWidth, clientHeight } = boardFeltRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setBoardDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(boardFeltRef.current);
    return () => ro.disconnect();
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

  // Turn timer countdown
  useEffect(() => {
    if (!match.turnDeadlineUtc) return;

    const deadline = new Date(match.turnDeadlineUtc).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [match.turnDeadlineUtc, match.currentTurnUserId]);

  // Auto-skip countdown if canSkip is active
  useEffect(() => {
    if (!canSkip || !isMyTurn) {
      setAutoSkipSeconds(3);
      return;
    }

    const timer = setInterval(() => {
      setAutoSkipSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canSkip, isMyTurn, onSkip]);

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
      {/* Top Header: Scoreboard & Distinct Controls Bar */}
      <div
        className="game-table-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 1.15rem',
          background: 'rgba(26, 18, 12, 0.88)',
          borderBottom: '1px solid rgba(229, 231, 235, 0.15)',
          backdropFilter: 'blur(8px)',
          zIndex: 20
        }}
      >
        {/* Match info: Round & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>الجولة</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--platinum-silver)' }}>{match.roundNumber}</strong>
          </div>

          <div style={{ height: 24, width: 1, background: 'rgba(255, 255, 255, 0.12)' }} />

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
              {match.mode === GameMode.Quadruple ? 'النتيجة (فريقك - الخصم)' : 'النتيجة (101 بنط)'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? '#60a5fa' : 'var(--platinum-light)'
                }}
              >
                {match.team1Score}
              </span>
              <span style={{ color: '#64748b', fontWeight: 800 }}>:</span>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? 'var(--platinum-light)' : '#60a5fa'
                }}
              >
                {match.team2Score}
              </span>
            </div>
          </div>
        </div>

        {/* Turn Status Pill & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              padding: '0.22rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 800,
              background: isMyTurn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#2a221b',
              color: isMyTurn ? '#000' : '#f8fafc',
              border: isMyTurn ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isMyTurn ? '0 0 12px rgba(16, 185, 129, 0.55)' : 'none'
            }}
          >
            {isMyTurn ? STRINGS.yourTurn : `دور: ${currentTurnPlayer?.displayName || 'اللاعب'}`}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: secondsRemaining <= 5 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: secondsRemaining <= 5 ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
              color: secondsRemaining <= 5 ? '#ef4444' : secondsRemaining <= 10 ? '#f59e0b' : '#f8fafc',
              fontWeight: 800,
              fontSize: '0.82rem'
            }}
          >
            <Clock size={14} />
            <span>{secondsRemaining}ث</span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          {isMyTurn && canSkip && (
            <button
              className="btn btn-danger"
              onClick={onSkip}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
            >
              <SkipForward size={14} />
              <span>{STRINGS.skipTurn} ({autoSkipSeconds})</span>
            </button>
          )}

          {match.mode === GameMode.Quadruple && onRequestTeammateStart && !isMyTurn && (
            <button
              className="btn btn-secondary"
              onClick={onRequestTeammateStart}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}
            >
              <Hand size={13} />
              <span>طلب البداية</span>
            </button>
          )}

          {onOpenSoundboard && (
            <button
              className="btn btn-primary"
              onClick={onOpenSoundboard}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
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
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
              title="إعدادات الصوت"
            >
              <Sliders size={15} />
            </button>
          )}

          {onExitGame && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsExitModalOpen(true)}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              title="مغادرة الماتش"
            >
              <LogOut size={15} />
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
        {/* Top Opponent (or Teammate in Quadruple) */}
        {topPlayer && (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '0.3rem',
              zIndex: 10
            }}
          >
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
          </div>
        )}

        {/* Left Opponent (in Quadruple Mode) */}
        {leftPlayer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '0.5rem',
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

        {/* Center Felt Board with Continuous Domino Chain Layout */}
        <div
          ref={boardFeltRef}
          className="domino-board-felt"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'auto',
            width: '100%',
            height: '100%'
          }}
        >
          {match.boardChain.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.45)',
                userSelect: 'none',
                padding: '2rem'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
                🀄
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                تربيزة الدومينو جاهزة! {isMyTurn ? 'العب أول ورقة للبدء' : 'في انتظار أول ورقة...'}
              </p>
              {match.mode === GameMode.Quadruple && (
                <p style={{ fontSize: '0.85rem', color: 'var(--platinum-silver)', marginTop: '0.3rem' }}>
                  الجولة الأولى تبدأ بالدوش (6-6)
                </p>
              )}
            </div>
          ) : (
            <div
              className="continuous-domino-canvas"
              style={{
                position: 'relative',
                width: `${layoutResult.boundingBox.width}px`,
                height: `${layoutResult.boundingBox.height}px`,
                transform: `scale(${layoutResult.scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                flexShrink: 0
              }}
            >
              {/* Left End Drop Zone */}
              {layoutResult.leftDropZone && (
                <div
                  className={`board-end-drop-zone left-zone ${dragOverEnd === BoardEnd.Left ? 'active-drop' : ''}`}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Left)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Left)}
                  style={{
                    position: 'absolute',
                    left: `${layoutResult.leftDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: `${layoutResult.leftDropZone.y - layoutResult.boundingBox.minY}px`,
                    width: `${layoutResult.leftDropZone.width}px`,
                    height: `${layoutResult.leftDropZone.height}px`
                  }}
                  title={`طرف مفتوح: ${layoutResult.leftDropZone.openPip}`}
                >
                  <span className="end-badge">طرف {layoutResult.leftDropZone.openPip}</span>
                </div>
              )}

              {/* Placed Continuous Domino Tiles */}
              {layoutResult.tiles.map((placed) => {
                const isNewest = placed.orderIndex === maxOrderIndex && match.boardChain.length > 1;
                return (
                  <div
                    key={`${placed.tileId}-${placed.orderIndex}`}
                    className="chain-tile-container"
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

              {/* Right End Drop Zone */}
              {layoutResult.rightDropZone && (
                <div
                  className={`board-end-drop-zone right-zone ${dragOverEnd === BoardEnd.Right ? 'active-drop' : ''}`}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Right)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Right)}
                  style={{
                    position: 'absolute',
                    left: `${layoutResult.rightDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: `${layoutResult.rightDropZone.y - layoutResult.boundingBox.minY}px`,
                    width: `${layoutResult.rightDropZone.width}px`,
                    height: `${layoutResult.rightDropZone.height}px`
                  }}
                  title={`طرف مفتوح: ${layoutResult.rightDropZone.openPip}`}
                >
                  <span className="end-badge">طرف {layoutResult.rightDropZone.openPip}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Opponent & Domino Bank Area */}
        <div
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
};
