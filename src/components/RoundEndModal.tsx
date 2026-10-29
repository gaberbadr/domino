import React, { useState } from 'react';
import { RoundEndResultDto, RoundOutcomeType } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { Award, ShieldAlert, Scale, ArrowRightCircle, LogOut, CheckCircle2, Loader2, Trophy } from 'lucide-react';
import { DominoTileView } from './DominoTileView';

interface RoundEndModalProps {
  result: RoundEndResultDto | null;
  onContinue: () => Promise<void> | void;
  onLeave?: () => void;
  agreedCount?: number;
  totalRequired?: number;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  result,
  onContinue,
  onLeave,
  agreedCount = 0,
  totalRequired = 2
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly reset agreement state whenever a new round result is presented
  React.useEffect(() => {
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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
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
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                {isDraw ? STRINGS.drawRound : isBlocked ? STRINGS.blockedRound : STRINGS.normalWin}
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                الجولة رقم {result.roundNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* Reason explanation */}
          <div
            style={{
              background: '#0d131f',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.25rem',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '1rem',
              color: isDraw ? '#93c5fd' : '#f8fafc'
            }}
          >
            {result.reason}
          </div>

          {/* Points awarded banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '1rem',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block' }}>النقط المكتسبة</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: isDraw ? '#94a3b8' : 'var(--gold-primary)' }}>
                {isDraw ? STRINGS.zeroPoints : `+${result.pointsAwarded} بنط`}
              </span>
            </div>

            <div style={{ width: 1, height: 40, background: 'rgba(255, 255, 255, 0.1)' }} />

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block' }}>المجموع التراكمي</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                {result.team1ScoreAfter} - {result.team2ScoreAfter}
              </span>
            </div>
          </div>

          {/* Winner Remaining Tiles Section */}
          {isDraw ? (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
                color: '#93c5fd',
                fontSize: '0.9rem',
                fontWeight: 700
              }}
            >
              <span>⚖️ تعادل في القفلة: لا يوجد فائز بهذه الجولة</span>
            </div>
          ) : (
            <div
              className="round-winner-tiles-container"
              style={{
                background: 'rgba(10, 15, 24, 0.75)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.5rem'
                }}
              >
                <Trophy size={18} color="var(--gold-primary)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
                  {result.winningTeamIndex
                    ? `ورق الفريق الفائز (فريق ${result.winningTeamIndex}${result.winnerName ? ` - ${result.winnerName}` : ''})`
                    : `ورق الفائز (${result.winnerName || 'الفائز'})`}
                </span>
              </div>

              {result.winnerRemainingHand && result.winnerRemainingHand.length > 0 ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      padding: '0.35rem 0'
                    }}
                  >
                    {result.winnerRemainingHand.map((tile) => (
                      <DominoTileView
                        key={`winner-tile-${tile.id}`}
                        tile={tile}
                        size="small"
                        orientation="horizontal"
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginTop: '0.35rem' }}>
                    مجموع ورق الفائز: {result.winnerRemainingHand.reduce((acc, t) => acc + (t.pipSum ?? (t.end1 + t.end2)), 0)} بنط ({result.winnerRemainingHand.length} ورقة)
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    color: '#34d399',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    padding: '0.35rem 0'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>أنهى جميع أوراقه وكسب الجولة (0 ورقة متبقية)</span>
                </div>
              )}
            </div>
          )}

          {/* Next Starter Notice */}
          {result.nextStarterName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                color: '#6ee7b7',
                fontSize: '0.9rem',
                marginBottom: '1.25rem'
              }}
            >
              <ArrowRightCircle size={20} />
              <div>
                <strong>{STRINGS.nextStarter} </strong>
                <span>{result.nextStarterName}</span>
                {result.nextStarterReason && (
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#a7f3d0' }}>
                    ({result.nextStarterReason})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Standard Arabic Next-Round Prompt */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.85rem',
              padding: '0.9rem',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.4rem' }}>
              انتقل إلى الجولة التالية؟
            </p>
            {hasAgreed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  color: '#34d399',
                  marginTop: '0.5rem'
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
                  fontSize: '0.88rem',
                  color: '#60a5fa',
                  marginTop: '0.5rem'
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
            style={{ flex: 1.5, padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 800 }}
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
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
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
