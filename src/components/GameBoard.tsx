import React, { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { GameMatchDto, BoardPlacedTile, GameMode, BoardEnd, MatchStatus } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { ConcealedHandView } from './ConcealedHandView';
import { DominoBankView } from './DominoBankView';
import { ExitConfirmationModal } from './ExitConfirmationModal';
import { AutoSkipButton } from './AutoSkipButton';
import { VoiceChatControls } from './VoiceChatControls';
import { calculateBoardLayout } from '../services/dominoLayoutEngine';
import { STRINGS } from '../constants/strings';
import { Clock, Hand, LogOut, Volume2, Sliders, History, X, Award, Scale, ShieldAlert } from 'lucide-react';

interface GameBoardProps {
  match: GameMatchDto;
  currentUserId: string;
  canDraw: boolean;
  canSkip: boolean;
  isDrawing?: boolean;
  drawingTarget?: 'me' | 'opponent' | null;
  isChoiceActive?: boolean;
  roomCode?: string;
  onDraw: () => void;
  onSkip: () => void;
  onRequestTeammateStart?: () => void;
  onDropTileOnEnd?: (tileId: number, end: BoardEnd) => void;
  onSelectEnd?: (end: BoardEnd) => void;
  onCancelChoice?: () => void;
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
  drawingTarget = null,
  isChoiceActive = false,
  roomCode,
  onDraw,
  onSkip,
  onRequestTeammateStart,
  onDropTileOnEnd,
  onSelectEnd,
  onCancelChoice,
  onExitGame,
  onOpenSoundboard,
  onOpenSoundSettings
}) => {
  const [dragOverEnd, setDragOverEnd] = useState<BoardEnd | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500
  });

  // Synchronous pre-paint measurement on initial mount to guarantee correct coordinates on return
  useLayoutEffect(() => {
    const el = tableContainerRef.current;
    if (el && el.clientWidth > 100 && el.clientHeight > 100) {
      setBoardDimensions({
        width: Math.round(el.clientWidth),
        height: Math.round(el.clientHeight)
      });
    }
  }, []);

  // Observe board felt canvas size dynamically
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    let animId: number;

    const updateDims = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        if (!tableContainerRef.current) return;
        const w = tableContainerRef.current.clientWidth;
        const h = tableContainerRef.current.clientHeight;
        if (w > 100 && h > 100) {
          setBoardDimensions((prev) => {
            if (Math.abs(prev.width - w) < 4 && Math.abs(prev.height - h) < 4) {
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

          {/* Score Ownership Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {match.mode === GameMode.Individual ? (
              // 1v1 Mode: Explicit current user vs opponent score
              (() => {
                const opponentPlayer = match.players.find((p) => p.userId !== currentUserId);
                const myScore = myPlayer?.seatIndex === 0 ? match.team1Score : match.team2Score;
                const oppScore = myPlayer?.seatIndex === 0 ? match.team2Score : match.team1Score;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {/* Current User Score */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'rgba(212, 175, 55, 0.16)',
                        border: '1.5px solid rgba(212, 175, 55, 0.5)',
                        boxShadow: '0 0 10px rgba(212, 175, 55, 0.2)'
                      }}
                      title="مجموع نقاطك التراكمي (أنت)"
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gold-primary)' }}>أنت:</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fcfaf6' }}>{myScore}</span>
                    </div>

                    <span style={{ color: '#64748b', fontWeight: 900, fontSize: '0.9rem' }}>:</span>

                    {/* Opponent Score */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1.5px solid rgba(56, 189, 248, 0.4)'
                      }}
                      title={`مجموع نقاط الخصم (${opponentPlayer?.displayName || 'الخصم'})`}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>
                        {opponentPlayer?.displayName ? (opponentPlayer.displayName.length > 7 ? opponentPlayer.displayName.slice(0, 6) + '..' : opponentPlayer.displayName) : 'الخصم'}:
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fcfaf6' }}>{oppScore}</span>
                    </div>
                  </div>
                );
              })()
            ) : match.mode === GameMode.Quadruple ? (
              // Quadruple 4p Mode: Team 1 vs Team 2 with user's team marked
              (() => {
                const isTeam1 = myPlayer?.teamIndex === 1;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: isTeam1 ? 'rgba(212, 175, 55, 0.16)' : 'rgba(56, 189, 248, 0.12)',
                        border: isTeam1 ? '1.5px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(56, 189, 248, 0.35)'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isTeam1 ? 'var(--gold-primary)' : '#38bdf8' }}>
                        {isTeam1 ? 'فريقك (1):' : 'فريق 1:'}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fcfaf6' }}>{match.team1Score}</span>
                    </div>

                    <span style={{ color: '#64748b', fontWeight: 900, fontSize: '0.9rem' }}>:</span>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: !isTeam1 ? 'rgba(212, 175, 55, 0.16)' : 'rgba(56, 189, 248, 0.12)',
                        border: !isTeam1 ? '1.5px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(56, 189, 248, 0.35)'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: !isTeam1 ? 'var(--gold-primary)' : '#38bdf8' }}>
                        {!isTeam1 ? 'فريقك (2):' : 'فريق 2:'}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fcfaf6' }}>{match.team2Score}</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Triple Mode: Individual players
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {match.players.map((p) => {
                  const isMe = p.userId === currentUserId;
                  return (
                    <div
                      key={p.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.18rem 0.45rem',
                        borderRadius: '9999px',
                        background: isMe ? 'rgba(212, 175, 55, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                        border: isMe ? '1.5px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isMe ? 'var(--gold-primary)' : '#94a3b8' }}>
                        {isMe ? 'أنت' : p.displayName.slice(0, 5)}:
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fcfaf6' }}>
                        {p.cumulativeScore ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score Summary & Round History Icon Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsHistoryOpen(true)}
              style={{
                padding: '0.22rem 0.5rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#e2e8f0'
              }}
              title="عرض سجل الجولات والنقاط"
            >
              <History size={13} color="var(--gold-primary)" />
              <span className="hidden sm:inline">السجل</span>
            </button>
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
          ref={tableContainerRef}
          className="board-felt-canvas"
          onClick={(e) => {
            if (isChoiceActive && onCancelChoice && e.target === e.currentTarget) {
              onCancelChoice();
            }
          }}
          style={{
            flex: 1,
            position: 'relative',
            margin: '0.45rem',
            borderRadius: '1rem',
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at center, #19523a 0%, #113c2a 65%, #092318 100%)',
            border: isChoiceActive ? '2px solid var(--gold-primary)' : '2px solid rgba(229, 231, 235, 0.1)',
            boxShadow: isChoiceActive
              ? 'inset 0 0 50px rgba(0, 0, 0, 0.75), 0 0 15px rgba(212, 175, 55, 0.35)'
              : 'inset 0 0 45px rgba(0, 0, 0, 0.75)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        >
          {/* Subtle Choice Mode Banner Guide */}
          {isChoiceActive && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                background: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1.5px solid var(--gold-primary)',
                borderRadius: '9999px',
                padding: '0.35rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.65)',
                pointerEvents: 'auto'
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
                اضغط على أحد الطرفين المضاءين للعب الورقة
              </span>
              {onCancelChoice && (
                <button
                  type="button"
                  onClick={onCancelChoice}
                  style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="إلغاء التحديد"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

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
                    left: isChoiceActive
                      ? `${layoutResult.leftDropZone.x - layoutResult.boundingBox.minX + layoutResult.leftDropZone.width / 2}px`
                      : `${layoutResult.leftDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: isChoiceActive
                      ? `${layoutResult.leftDropZone.y - layoutResult.boundingBox.minY + layoutResult.leftDropZone.height / 2}px`
                      : `${layoutResult.leftDropZone.y - layoutResult.boundingBox.minY}px`,
                    transform: isChoiceActive ? 'translate(-50%, -50%)' : 'none',
                    width: isChoiceActive ? 'auto' : `${layoutResult.leftDropZone.width}px`,
                    height: `${layoutResult.leftDropZone.height}px`
                  }}
                  title={isChoiceActive ? 'اضغط هنا للعب على الطرف الشمال' : 'طرف اللعب المفتوح (شمال)'}
                >
                  {isChoiceActive ? (
                    <span className="choice-btn-text">👈 العب شمال</span>
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
                    left: isChoiceActive
                      ? `${layoutResult.rightDropZone.x - layoutResult.boundingBox.minX + layoutResult.rightDropZone.width / 2}px`
                      : `${layoutResult.rightDropZone.x - layoutResult.boundingBox.minX}px`,
                    top: isChoiceActive
                      ? `${layoutResult.rightDropZone.y - layoutResult.boundingBox.minY + layoutResult.rightDropZone.height / 2}px`
                      : `${layoutResult.rightDropZone.y - layoutResult.boundingBox.minY}px`,
                    transform: isChoiceActive ? 'translate(-50%, -50%)' : 'none',
                    width: isChoiceActive ? 'auto' : `${layoutResult.rightDropZone.width}px`,
                    height: `${layoutResult.rightDropZone.height}px`
                  }}
                  title={isChoiceActive ? 'اضغط هنا للعب على الطرف اليمين' : 'طرف اللعب المفتوح (يمين)'}
                >
                  {isChoiceActive ? (
                    <span className="choice-btn-text">👉 العب يمين</span>
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
              drawTargetDirection={drawingTarget === 'opponent' ? 'up' : 'down'}
              onDraw={onDraw}
            />
          )}
        </div>
      </div>

      {/* Round History Popover Panel */}
      {isHistoryOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsHistoryOpen(false)}
          style={{ zIndex: 110 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '1.25rem', textAlign: 'right' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fcfaf6', margin: 0 }}>
                  سجل جولات الماتش (101 بنط)
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsHistoryOpen(false)}
                style={{ padding: '0.2rem 0.4rem' }}
                title="إغلاق السجل"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Match Status Banner */}
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '0.65rem',
                padding: '0.65rem 0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.88rem'
              }}
            >
              <span style={{ color: '#cbd5e1' }}>حالة الماتش الحالية:</span>
              <strong style={{ color: match.status === MatchStatus.Completed ? '#10b981' : 'var(--gold-primary)' }}>
                {match.status === MatchStatus.Completed ? 'ماتش منتهي' : `جولة ${match.roundNumber} (الماتش مستمر لـ 101 بنط)`}
              </strong>
            </div>

            {/* Completed Rounds List */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(!match.roundHistories || match.roundHistories.length === 0) ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.75rem', fontSize: '0.9rem' }}>
                  لسه مفيش جولات انتهت في هذا الماتش.
                </div>
              ) : (
                match.roundHistories.map((h) => {
                  const isDraw = h.outcomeType === 2; // Draw
                  const isBlocked = h.outcomeType === 1; // Blocked
                  return (
                    <div
                      key={h.roundNumber}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            background: '#0d131f',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#94a3b8'
                          }}
                        >
                          ج {h.roundNumber}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: isDraw ? '#60a5fa' : isBlocked ? 'var(--gold-primary)' : '#10b981', display: 'block' }}>
                            {isDraw ? 'تعادل (DRAW)' : isBlocked ? `فوز بالقفلة (${h.winnerName || 'فائز'})` : `فائز: ${h.winnerName || 'لاعب'}`}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{h.reason}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: isDraw ? '#94a3b8' : 'var(--gold-primary)' }}>
                          {isDraw ? '0 بنط' : `+${h.pointsAwarded} بنط`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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
