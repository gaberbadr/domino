import React, { useState, useMemo, useEffect } from 'react';
import { GameMatchDto, RoundEndResultDto, RoundOutcomeType, GameMode, DominoTile } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { Award, ShieldAlert, Scale, ArrowRightCircle, LogOut, CheckCircle2, Loader2, Layers } from 'lucide-react';
import { DominoTileView } from './DominoTileView';

interface RoundEndModalProps {
  result: RoundEndResultDto | null;
  match?: GameMatchDto | null;
  onContinue: () => Promise<void> | void;
  onLeave?: () => void;
  agreedCount?: number;
  totalRequired?: number;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  result,
  match,
  onContinue,
  onLeave,
  agreedCount = 0,
  totalRequired = 2
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly reset agreement state whenever a new round result is presented
  useEffect(() => {
    setHasAgreed(false);
    setIsSubmitting(false);
  }, [result?.roundNumber]);

  if (!result || result.isMatchCompleted) return null;

  const isDraw = result.outcomeType === RoundOutcomeType.Draw;
  const isBlocked = result.outcomeType === RoundOutcomeType.BlockedWin;

  const handleContinueClick = async () => {
    setHasAgreed(true);
    setIsSubmitting(true);
    try {
      await onContinue();
    } catch {
      // Allow retry if network call failed
      setHasAgreed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine the losing player(s) whose remaining tiles determined the awarded points
  const losingContributors = useMemo(() => {
    if (!result || isDraw) return [];

    const contributors: Array<{
      userId: string;
      displayName: string;
      teamIndex?: number;
      tiles: DominoTile[];
      pipSum: number;
    }> = [];

    const handsDict = result.playerRemainingHands || {};
    const pipsDict = result.playerRemainingPips || {};
    const players = match?.players || [];

    const getPlayerInfo = (userId: string) => {
      const p = players.find((pl) => pl.userId === userId);
      return {
        displayName: p?.displayName || (userId === result.winnerUserId ? 'الفائز' : 'الخصم'),
        teamIndex: p?.teamIndex
      };
    };

    const buildContributor = (userId: string) => {
      const info = getPlayerInfo(userId);
      const tiles = handsDict[userId] || [];
      const pipSum = pipsDict[userId] ?? tiles.reduce((acc, t) => acc + (t.pipSum ?? (t.end1 + t.end2)), 0);
      return {
        userId,
        displayName: info.displayName,
        teamIndex: info.teamIndex,
        tiles,
        pipSum
      };
    };

    const isQuadruple = match?.mode === GameMode.Quadruple || result.winningTeamIndex != null;

    if (isQuadruple && result.winningTeamIndex != null) {
      // Quadruple: Losing team players contributed to the winner's points
      const losingTeamIndex = result.winningTeamIndex === 1 ? 2 : 1;
      const losingPlayers = players.filter((p) => p.teamIndex === losingTeamIndex);
      if (losingPlayers.length > 0) {
        for (const lp of losingPlayers) {
          contributors.push(buildContributor(lp.userId));
        }
      } else {
        // Fallback from handsDict
        for (const [uid, tiles] of Object.entries(handsDict)) {
          if (uid !== result.winnerUserId && tiles.length > 0) {
            contributors.push(buildContributor(uid));
          }
        }
      }
    } else {
      // Individual or Triple: all other players except the round winner
      const losingPlayers = players.filter((p) => p.userId !== result.winnerUserId);
      if (losingPlayers.length > 0) {
        for (const lp of losingPlayers) {
          contributors.push(buildContributor(lp.userId));
        }
      } else {
        // Fallback from handsDict
        for (const uid of Object.keys(handsDict)) {
          if (uid !== result.winnerUserId) {
            contributors.push(buildContributor(uid));
          }
        }
      }
    }

    return contributors;
  }, [result, match, isDraw]);

  const winnerTitle = result.winnerName || (result.winningTeamIndex ? `فريق ${result.winningTeamIndex}` : 'الفائز');

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div
          className="modal-header"
          style={{
            background: isDraw
              ? 'rgba(59, 130, 246, 0.15)'
              : isBlocked
              ? 'rgba(234, 179, 8, 0.15)'
              : 'rgba(16, 185, 129, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isDraw ? (
              <Scale size={26} color="#60a5fa" />
            ) : isBlocked ? (
              <ShieldAlert size={26} color="var(--gold-primary)" />
            ) : (
              <Award size={26} color="#10b981" />
            )}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isDraw ? STRINGS.drawRound : isBlocked ? `فوز بالقفلة (${winnerTitle})` : `فائز الجولة: ${winnerTitle}`}
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                الجولة رقم {result.roundNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* Points awarded and Cumulative Score banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '0.85rem',
              padding: '0.85rem 1rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block' }}>النقط المكتسبة</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: isDraw || result.pointsAwarded === 0 ? '#94a3b8' : 'var(--gold-primary)' }}>
                {result.pointsAwarded > 0 ? `+${result.pointsAwarded} بنط` : '0 بنط'}
              </span>
            </div>

            <div style={{ width: 1, height: 38, background: 'rgba(255, 255, 255, 0.12)' }} />

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block' }}>المجموع التراكمي</span>
              {match?.mode === GameMode.Triple && match.players.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.2rem' }}>
                  {match.players.map((p) => (
                    <span key={p.userId} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      {p.displayName}: {p.cumulativeScore ?? 0}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  {result.team1ScoreAfter} - {result.team2ScoreAfter}
                </span>
              )}
            </div>
          </div>

          {/* Draw or Losing Remaining Tiles Section */}
          {isDraw ? (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                textAlign: 'center',
                color: '#93c5fd',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
            >
              <span>⚖️ تعادل في القفلة (0 بنط)</span>
            </div>
          ) : (
            <div
              className="round-losing-tiles-container"
              style={{
                background: 'rgba(10, 15, 24, 0.75)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.85rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.65rem'
                }}
              >
                <Layers size={18} color="var(--gold-primary)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
                  الأوراق المحتسبة لرصيد الجولة (+{result.pointsAwarded} بنط)
                </span>
              </div>

              {losingContributors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {losingContributors.map((c) => (
                    <div
                      key={`loser-hand-${c.userId}`}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '0.65rem',
                        padding: '0.6rem 0.75rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.45rem',
                          fontSize: '0.82rem'
                        }}
                      >
                        <strong style={{ color: '#e2e8f0' }}>
                          {c.teamIndex ? `فريق ${c.teamIndex} - ${c.displayName}` : c.displayName}
                        </strong>
                        <span style={{ color: 'var(--gold-primary)', fontWeight: 700 }}>
                          {c.tiles.length} ورقة ({c.pipSum} بنط)
                        </span>
                      </div>

                      {c.tiles.length > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.45rem',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            padding: '0.2rem 0'
                          }}
                        >
                          {c.tiles.map((tile) => (
                            <DominoTileView
                              key={`losing-tile-${c.userId}-${tile.id}`}
                              tile={tile}
                              size="small"
                              orientation="horizontal"
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>لا توجد أوراق متبقية</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  تم احتساب النتيجة حسب أوراق الجولة.
                </span>
              )}
            </div>
          )}

          {/* Next Starter Notice */}
          {result.nextStarterName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '0.75rem',
                padding: '0.65rem 0.85rem',
                color: '#6ee7b7',
                fontSize: '0.88rem',
                marginBottom: '1rem'
              }}
            >
              <ArrowRightCircle size={18} />
              <div>
                <strong>{STRINGS.nextStarter} </strong>
                <span>{result.nextStarterName}</span>
                {result.nextStarterReason && (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#a7f3d0' }}>
                    ({result.nextStarterReason})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Next-Round Agreement Section */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.35rem 0' }}>
              انتقل إلى الجولة التالية؟
            </p>
            {hasAgreed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#34d399',
                  marginTop: '0.4rem'
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                <span>تم تسجيل موافقتك ({Math.max(1, agreedCount)}/{totalRequired}).. في انتظار باقي اللاعبين للبدء</span>
              </div>
            ) : agreedCount > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#60a5fa',
                  marginTop: '0.4rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>اللاعب الآخر وافق على المتابعة ({agreedCount}/{totalRequired})! اضغط للمتابعة</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleContinueClick}
            disabled={hasAgreed || isSubmitting}
            style={{ flex: 1.5, padding: '0.7rem 1rem', fontSize: '0.95rem', fontWeight: 800 }}
          >
            {hasAgreed ? (
              <>
                <CheckCircle2 size={18} />
                <span>في الانتظار ({Math.max(1, agreedCount)}/{totalRequired})...</span>
              </>
            ) : (
              <span>الجولة التالية 🎲</span>
            )}
          </button>

          {onLeave && (
            <button
              className="btn btn-secondary"
              onClick={onLeave}
              style={{
                flex: 1,
                padding: '0.7rem 1rem',
                fontSize: '0.9rem',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)'
              }}
            >
              <LogOut size={16} />
              <span>مغادرة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
