import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { signalRService } from '../services/signalr';
import {
  GameMatchDto,
  PlayerPrivateStateDto,
  UserProfileDto,
  DominoTile,
  BoardEnd,
  BoardUpdateDto,
  InvalidDealNotificationDto,
  RoundEndResultDto,
  MatchEndResultDto,
  LegalMoveDto,
  RoundOutcomeType
} from '../types/domino';
import { GameBoard } from '../components/GameBoard';
import { PlayerHand } from '../components/PlayerHand';
import { ChooseEndModal } from '../components/ChooseEndModal';
import { InvalidDealModal } from '../components/InvalidDealModal';
import { RoundEndModal } from '../components/RoundEndModal';
import { MatchEndModal } from '../components/MatchEndModal';
import { VoiceChatControls } from '../components/VoiceChatControls';
import { RotateDeviceOverlay } from '../components/RotateDeviceOverlay';
import { SoundboardDrawer } from '../components/SoundboardDrawer';
import { SoundSettingsModal } from '../components/SoundSettingsModal';
import { soundService } from '../services/soundService';
import { STRINGS } from '../constants/strings';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface GamePageProps {
  initialMatch: GameMatchDto;
  initialPrivateState: PlayerPrivateStateDto;
  currentUser: UserProfileDto;
  roomCode: string;
  onExitGame: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  initialMatch,
  initialPrivateState,
  currentUser,
  roomCode,
  onExitGame
}) => {
  const [match, setMatch] = useState<GameMatchDto>(initialMatch);
  const [privateState, setPrivateState] = useState<PlayerPrivateStateDto>(initialPrivateState);

  // Orientation handling
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState<boolean>(false);

  // Modals & Action States
  const [choiceTile, setChoiceTile] = useState<DominoTile | null>(null);
  const [invalidDealNotice, setInvalidDealNotice] = useState<InvalidDealNotificationDto | null>(null);
  const [roundEndResult, setRoundEndResult] = useState<RoundEndResultDto | null>(null);
  const [matchEndResult, setMatchEndResult] = useState<MatchEndResultDto | null>(null);
  const [teammateRequest, setTeammateRequest] = useState<{ requesterId: string; requesterName: string } | null>(null);

  // Soundboard & Audio Settings
  const [isSoundboardOpen, setIsSoundboardOpen] = useState<boolean>(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);
  const [soundboardCooldown, setSoundboardCooldown] = useState<number>(0);

  // In-flight request guards
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Landscape Orientation Lock & Detection
  useEffect(() => {
    const checkOrientation = () => {
      const isMobileOrTablet = window.innerWidth <= 1024 || 'ontouchstart' in window;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobileOrTablet && isPortraitMode);
    };

    // Try locking landscape orientation if supported
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Gracefully fallback when browser policy blocks automatic lock
        });
      }
    } catch {
      // Ignore unsupported orientation lock
    }

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // SignalR Event Listeners
  useEffect(() => {
    const conn = signalRService.getConnection();
    if (!conn) return;

    // 1. Board Updated
    conn.on('BoardUpdated', (update: BoardUpdateDto) => {
      soundService.playGameplay('play', `play_${update.placedTile.tileId}_${update.placedTile.orderIndex}`);
      setMatch((prev) => {
        const chain = [...prev.boardChain, update.placedTile];
        const players = prev.players.map((p) =>
          p.userId === update.playedByUserId
            ? { ...p, tileCount: update.playerRemainingTileCount }
            : p
        );
        return {
          ...prev,
          boardChain: chain,
          openLeft: update.newOpenLeft ?? prev.openLeft,
          openRight: update.newOpenRight ?? prev.openRight,
          players
        };
      });
      setIsSubmittingMove(false);
    });

    // 2. Private Hand Updated
    conn.on('HandUpdated', (hand: DominoTile[], legalMoves: LegalMoveDto[], canDraw: boolean, canSkip: boolean) => {
      setPrivateState({
        hand,
        legalMoves,
        canDraw,
        canSkip
      });
      setIsDrawing(false);
    });

    // 3. Turn Changed
    conn.on('TurnChanged', (currentTurnUserId: string, _seconds: number, turnDeadlineUtc: string) => {
      setMatch((prev) => ({
        ...prev,
        currentTurnUserId,
        turnDeadlineUtc
      }));
    });

    // 4. Tile Drawn
    conn.on('TileDrawn', (drawerUserId: string, remainingBankCount: number, drawnTile: DominoTile | null) => {
      setIsDrawing(false);
      soundService.playGameplay('take', `take_${drawerUserId}_${remainingBankCount}`);
      setMatch((prev) => {
        const players = prev.players.map((p) =>
          p.userId === drawerUserId ? { ...p, tileCount: p.tileCount + 1 } : p
        );
        return {
          ...prev,
          bankCount: remainingBankCount,
          players
        };
      });

      if (drawerUserId === currentUser.userId && drawnTile) {
        showToast(`سحبت ورقة: [${drawnTile.end1}|${drawnTile.end2}]`, 'info');
      } else {
        const drawer = match.players.find((p) => p.userId === drawerUserId);
        showToast(`${drawer?.displayName || 'الخصم'} سحب ورقة من السحبة`, 'info');
      }
    });

    // 5. Turn Skipped / Auto Action
    conn.on('TurnSkipped', (_userId: string, message: string) => {
      soundService.playGameplay('skip');
      showToast(message, 'info');
    });

    conn.on('AutoActionExecuted', (_userId: string, actionDescription: string) => {
      showToast(actionDescription, 'info');
    });

    // 6. Invalid Deal Notification
    conn.on('InvalidDealOccurred', (notification: InvalidDealNotificationDto) => {
      setInvalidDealNotice(notification);
    });

    // 7. Round Ended
    conn.on('RoundEnded', (result: RoundEndResultDto) => {
      if (result.outcomeType === RoundOutcomeType.Draw || result.outcomeType === RoundOutcomeType.BlockedWin) {
        soundService.playGameplay('drawOrClose');
      }
      setRoundEndResult(result);
      setMatch((prev) => ({
        ...prev,
        team1Score: result.team1ScoreAfter,
        team2Score: result.team2ScoreAfter,
        roundNumber: result.roundNumber
      }));
    });

    // 8. Match Ended
    conn.on('MatchEnded', (result: MatchEndResultDto) => {
      setMatchEndResult(result);
    });

    // 9. Player Connection Status Changed
    conn.on('PlayerConnectionChanged', (userId: string, isConnected: boolean, _deadline: string | null) => {
      const p = match.players.find((x) => x.userId === userId);
      const name = p?.displayName || 'لاعب';
      if (!isConnected) {
        showToast(`${name} فصل من اللعبة.. معاه دقيقتين يرجع فيهم`, 'error');
      } else {
        showToast(`${name} رجع للعبة تاني!`, 'success');
      }

      setMatch((prev) => ({
        ...prev,
        players: prev.players.map((x) => (x.userId === userId ? { ...x, isConnected } : x))
      }));
    });

    // 10. Teammate Start Request
    conn.on('TeammateStartRequested', (requesterUserId: string, requesterName: string) => {
      setTeammateRequest({ requesterId: requesterUserId, requesterName });
    });

    conn.on('TeammateStartDecision', (approved: boolean, starterUserId: string) => {
      const starter = match.players.find((p) => p.userId === starterUserId);
      if (approved) {
        showToast(`تمت الموافقة! البادئ في الجولة هو: ${starter?.displayName}`, 'success');
      } else {
        showToast('تم رفض طلب البداية بدلاً', 'info');
      }
    });

    // 11. Soundboard Clip Broadcast
    conn.on('SoundboardClipPlayed', (_senderUserId: string, senderDisplayName: string, soundKey: string) => {
      soundService.playReplay(soundKey);
      showToast(`📢 ${senderDisplayName} شغّل: ${soundKey}`, 'info');
    });

    return () => {
      conn.off('BoardUpdated');
      conn.off('HandUpdated');
      conn.off('TurnChanged');
      conn.off('TileDrawn');
      conn.off('TurnSkipped');
      conn.off('AutoActionExecuted');
      conn.off('InvalidDealOccurred');
      conn.off('RoundEnded');
      conn.off('MatchEnded');
      conn.off('PlayerConnectionChanged');
      conn.off('TeammateStartRequested');
      conn.off('TeammateStartDecision');
      conn.off('SoundboardClipPlayed');
    };
  }, [match.players, currentUser.userId, showToast]);

  // Audio unlock and shuffle on deal
  useEffect(() => {
    soundService.unlockAudio();
    soundService.playGameplay('shuffle', `shuffle_round_${match.roundNumber}`);
  }, [match.roundNumber]);

  // Soundboard Cooldown timer
  useEffect(() => {
    if (soundboardCooldown <= 0) return;
    const timer = setInterval(() => {
      setSoundboardCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [soundboardCooldown]);

  // Execute Move on Server
  const executeMove = async (tileId: number, chosenEnd?: BoardEnd) => {
    if (isSubmittingMove) return;
    setIsSubmittingMove(true);
    try {
      await api.game.playTile(match.id, tileId, chosenEnd);
      setChoiceTile(null);
    } catch (err: any) {
      setIsSubmittingMove(false);
      showToast(err.message || 'فشل لعب الورقة', 'error');
    }
  };

  // Handle Tile Click in Hand
  const handleTileClick = async (tile: DominoTile) => {
    if (match.currentTurnUserId !== currentUser.userId || isSubmittingMove) return;

    const legalMove = privateState.legalMoves.find((m) => m.tile.id === tile.id);
    if (!legalMove) return;

    if (legalMove.requiresChoice && match.openLeft !== null && match.openRight !== null) {
      setChoiceTile(tile);
    } else {
      const chosenEnd = legalMove.canPlaceLeft ? BoardEnd.Left : BoardEnd.Right;
      await executeMove(tile.id, chosenEnd);
    }
  };

  // Handle Drag-to-Drop on Board End
  const handleDropTileOnEnd = async (tileId: number, end: BoardEnd) => {
    if (match.currentTurnUserId !== currentUser.userId || isSubmittingMove) return;

    const legalMove = privateState.legalMoves.find((m) => m.tile.id === tileId);
    if (!legalMove) return;

    const canPlaceOnTarget = end === BoardEnd.Left ? legalMove.canPlaceLeft : legalMove.canPlaceRight;
    if (!canPlaceOnTarget) {
      showToast('الورقة لا تناسب هذا الطرف من السلسلة!', 'error');
      return;
    }

    await executeMove(tileId, end);
  };

  // Handle Draw Tile
  const handleDraw = async () => {
    if (isDrawing || !privateState.canDraw) return;
    setIsDrawing(true);
    try {
      await api.game.drawTile(match.id);
    } catch (err: any) {
      setIsDrawing(false);
      showToast(err.message || 'فشل سحب الورقة', 'error');
    }
  };

  // Handle Skip
  const handleSkip = async () => {
    try {
      await api.game.skipTurn(match.id);
    } catch (err: any) {
      showToast(err.message || 'فشل التعدية', 'error');
    }
  };

  // Teammate Start Handling
  const handleRequestTeammateStart = async () => {
    try {
      await api.game.requestTeammateStart(match.id);
      showToast('تم إرسال طلب البداية إلى زميلك في الفريق', 'info');
    } catch (err: any) {
      showToast(err.message || 'تعذر إرسال الطلب', 'error');
    }
  };

  const handleApproveTeammateDecision = async (approved: boolean) => {
    try {
      await api.game.approveTeammateStart(match.id, approved);
      setTeammateRequest(null);
    } catch (err: any) {
      showToast(err.message || 'فشل الرد على الطلب', 'error');
    }
  };

  return (
    <div
      className="gameplay-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        position: 'relative',
        background: '#04070e',
        overflow: 'hidden'
      }}
    >
      {/* Rotate Device Overlay for Portrait Phones */}
      {isPortrait && !dismissRotatePrompt && (
        <RotateDeviceOverlay onDismiss={() => setDismissRotatePrompt(true)} />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '0.85rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 800,
            background:
              toastMessage.type === 'error'
                ? '#dc2626'
                : toastMessage.type === 'success'
                ? '#059669'
                : '#1e293b',
            color: '#fff',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.65)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={16} />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Floating Voice Chat Control (Compact Top Corner) */}
      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          left: '1rem',
          zIndex: 40
        }}
      >
        <VoiceChatControls roomCode={roomCode} />
      </div>

      {/* Main Table Board */}
      <GameBoard
        match={match}
        currentUserId={currentUser.userId}
        canDraw={privateState.canDraw}
        canSkip={privateState.canSkip}
        isDrawing={isDrawing}
        onDraw={handleDraw}
        onSkip={handleSkip}
        onRequestTeammateStart={handleRequestTeammateStart}
        onDropTileOnEnd={handleDropTileOnEnd}
        onExitGame={onExitGame}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        onOpenSoundSettings={() => setIsSoundSettingsOpen(true)}
      />

      {/* Interactive Player Hand at Bottom */}
      <PlayerHand
        hand={privateState.hand}
        legalMoves={privateState.legalMoves}
        isMyTurn={match.currentTurnUserId === currentUser.userId}
        onTileClick={handleTileClick}
      />

      {/* Choose End Modal (When tile fits both Left and Right) */}
      <ChooseEndModal
        tile={choiceTile}
        openLeft={match.openLeft ?? null}
        openRight={match.openRight ?? null}
        onSelectEnd={(end) => {
          if (choiceTile) executeMove(choiceTile.id, end);
        }}
        onCancel={() => setChoiceTile(null)}
      />

      {/* Invalid Deal Reveal Modal */}
      <InvalidDealModal
        notification={invalidDealNotice}
        onDismiss={() => setInvalidDealNotice(null)}
      />

      {/* Round End Modal */}
      <RoundEndModal
        result={roundEndResult}
        onContinue={() => setRoundEndResult(null)}
      />

      {/* Match End Modal */}
      <MatchEndModal
        result={matchEndResult}
        onReturnToLobby={onExitGame}
      />

      {/* Teammate Start Approval Modal */}
      {teammateRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
                {STRINGS.teammateRequestTitle}
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1.5rem' }}>
                زميلك في الفريق <strong style={{ color: 'var(--gold-primary)' }}>{teammateRequest.requesterName}</strong> طالب يبدأ الجولة بدالك.. موافق؟
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleApproveTeammateDecision(true)}
                  style={{ flex: 1 }}
                >
                  {STRINGS.approve}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleApproveTeammateDecision(false)}
                  style={{ flex: 1 }}
                >
                  {STRINGS.reject}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Soundboard Drawer (Player Replay Clips) */}
      <SoundboardDrawer
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        onPlaySound={(soundKey) => {
          if (soundboardCooldown === 0) {
            setSoundboardCooldown(3);
            signalRService.playSoundboardClip(roomCode, soundKey);
          }
        }}
        cooldownSeconds={soundboardCooldown}
      />

      {/* Audio & Effects Settings Modal */}
      <SoundSettingsModal
        isOpen={isSoundSettingsOpen}
        onClose={() => setIsSoundSettingsOpen(false)}
      />
    </div>
  );
};
