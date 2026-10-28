import React, { useRef, useEffect, useState } from 'react';
import { GameMatchDto, BoardPlacedTile, GameMode, BoardEnd } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { ConcealedHandView } from './ConcealedHandView';
import { DominoBankView } from './DominoBankView';
import { STRINGS } from '../constants/strings';
import { Clock, Layers, SkipForward, Hand, ArrowLeftRight, Focus, LogOut, Volume2, Sliders } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [autoSkipSeconds, setAutoSkipSeconds] = useState<number>(3);
  const [dragOverEnd, setDragOverEnd] = useState<BoardEnd | null>(null);

  const isMyTurn = match.currentTurnUserId === currentUserId;
  const currentTurnPlayer = match.players.find((p) => p.userId === match.currentTurnUserId);

  // Find my seat index
  const myIndex = match.players.findIndex((p) => p.userId === currentUserId);
  const myPlayer = match.players[myIndex] || match.players[0];
  const totalPlayers = match.players.length;

  // Relative seating calculation:
  // In 1v1: top = opponent
  // In 3p: right = (myIndex + 1) % 3, top = (myIndex + 2) % 3
  // In 4p: right = (myIndex + 1) % 4 (Opponent), top = (myIndex + 2) % 4 (Teammate), left = (myIndex + 3) % 4 (Opponent)
  let topPlayer = totalPlayers > 1 ? match.players[(myIndex + (totalPlayers === 3 ? 2 : totalPlayers === 4 ? 2 : 1)) % totalPlayers] : null;
  let rightPlayer = totalPlayers >= 3 ? match.players[(myIndex + 1) % totalPlayers] : null;
  let leftPlayer = totalPlayers === 4 ? match.players[(myIndex + 3) % totalPlayers] : null;

  // Turn timer countdown synchronized with turnDeadlineUtc
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

  // Center the domino chain on board update
  const centerBoard = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    centerBoard();
  }, [match.boardChain.length]);

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
        border: '4px solid #3d2712',
        borderRadius: '1.5rem',
        margin: '0.5rem 0.75rem',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 70px rgba(0, 0, 0, 0.85), 0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Top Header: Scoreboard & Turn Banner */}
      <div
        className="game-table-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1.25rem',
          background: 'rgba(7, 10, 16, 0.82)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
          backdropFilter: 'blur(8px)',
          zIndex: 20
        }}
      >
        {/* Match info: Round & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>الجولة</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--gold-primary)' }}>{match.roundNumber}</strong>
          </div>

          <div style={{ height: 26, width: 1, background: 'rgba(255, 255, 255, 0.12)' }} />

          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
              {match.mode === GameMode.Quadruple ? 'النتيجة (فريقك - الخصم)' : 'النتيجة (101 بنط)'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? '#60a5fa' : 'var(--gold-primary)'
                }}
              >
                {match.team1Score}
              </span>
              <span style={{ color: '#64748b', fontWeight: 800 }}>:</span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: myPlayer?.teamIndex === 2 ? 'var(--gold-primary)' : '#60a5fa'
                }}
              >
                {match.team2Score}
              </span>
            </div>
          </div>
        </div>

        {/* Turn Status Pill & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '0.25rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 800,
              background: isMyTurn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1e293b',
              color: isMyTurn ? '#000' : '#f8fafc',
              boxShadow: isMyTurn ? '0 0 12px rgba(16, 185, 129, 0.55)' : 'none',
              animation: isMyTurn ? 'pulseGlow 2s infinite ease-in-out' : 'none'
            }}
          >
            {isMyTurn ? STRINGS.yourTurn : `دور: ${currentTurnPlayer?.displayName || 'اللاعب'}`}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: secondsRemaining <= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: secondsRemaining <= 5 ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
              color: secondsRemaining <= 5 ? '#ef4444' : secondsRemaining <= 10 ? '#f59e0b' : '#f8fafc',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}
          >
            <Clock size={15} />
            <span>{secondsRemaining}ث</span>
          </div>
        </div>

        {/* Header Action Buttons (Skip / Request Teammate / Center Board) */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
              title="أصوات وريأكشنات القهوة"
            >
              <Volume2 size={14} />
              <span>أصوات القهوة 🎙️</span>
            </button>
          )}

          {onOpenSoundSettings && (
            <button
              className="btn btn-secondary"
              onClick={onOpenSoundSettings}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
              title="إعدادات الصوت"
            >
              <Sliders size={15} />
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={centerBoard}
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
            title="توسيط التربيزة"
          >
            <Focus size={15} />
          </button>

          {onExitGame && (
            <button
              className="btn btn-secondary"
              onClick={onExitGame}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#f87171' }}
              title="مغادرة الماتش"
            >
              <LogOut size={15} />
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
              paddingTop: '0.4rem',
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

        {/* Center Felt Board with Central Domino Chain */}
        <div
          ref={scrollRef}
          className="domino-board-felt"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: match.boardChain.length > 4 ? 'flex-start' : 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '1.5rem 2rem',
            position: 'relative',
            cursor: 'grab'
          }}
        >
          {match.boardChain.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.35)',
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
                <p style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', marginTop: '0.3rem' }}>
                  الجولة الأولى تبدأ بالدوش (6-6)
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0,
                padding: '1rem',
                margin: 'auto'
              }}
            >
              {/* Left End Drop Zone / Indicator */}
              {match.openLeft !== null && (
                <div
                  className={`board-end-drop-zone left-zone ${dragOverEnd === BoardEnd.Left ? 'active-drop' : ''}`}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Left)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Left)}
                  title={`طرف مفتوح: ${match.openLeft}`}
                >
                  <span className="end-badge">طرف {match.openLeft}</span>
                </div>
              )}

              {/* Placed Domino Tiles Chain */}
              {match.boardChain.map((tile: BoardPlacedTile, idx: number) => {
                const isDouble = tile.leftPip === tile.rightPip;
                return (
                  <div
                    key={`${tile.tileId}-${idx}`}
                    className="chain-tile-container"
                    style={{
                      transform: isDouble ? 'scale(1.05)' : 'none',
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.7))',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <DominoTileView
                      tile={{ id: tile.tileId, end1: tile.leftPip, end2: tile.rightPip }}
                      orientation={isDouble ? 'vertical' : 'horizontal'}
                      size="normal"
                    />
                  </div>
                );
              })}

              {/* Right End Drop Zone / Indicator */}
              {match.openRight !== null && (
                <div
                  className={`board-end-drop-zone right-zone ${dragOverEnd === BoardEnd.Right ? 'active-drop' : ''}`}
                  onDragOver={(e) => handleBoardDragOver(e, BoardEnd.Right)}
                  onDrop={(e) => handleBoardDrop(e, BoardEnd.Right)}
                  title={`طرف مفتوح: ${match.openRight}`}
                >
                  <span className="end-badge">طرف {match.openRight}</span>
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
    </div>
  );
};
