import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MatchEndResultDto } from '../types/domino';
import { Trophy, Home, Award, LogOut } from 'lucide-react';

interface MatchEndModalProps {
  result: MatchEndResultDto | null;
  onReturnToLobby: () => void;
  currentUserId?: string;
  currentUserTeam?: number;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  result,
  onReturnToLobby,
  currentUserId,
  currentUserTeam
}) => {
  // Determine if the current client is the true winner
  const isForfeitedByUser = Boolean(
    result?.isForfeit && currentUserId && result.forfeitedUserId === currentUserId
  );

  const isUserWinner = Boolean(
    result &&
    !isForfeitedByUser &&
    (result.winnerUserId
      ? result.winnerUserId === currentUserId
      : result.winningTeamIndex != null && currentUserTeam != null
      ? result.winningTeamIndex === currentUserTeam
      : false)
  );

  useEffect(() => {
    if (result && isUserWinner) {
      // Fire victory confetti only for the actual winner
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      // Reset any active confetti immediately
      confetti.reset();
    }

    return () => {
      confetti.reset();
    };
  }, [result, isUserWinner]);

  if (!result) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          border: isUserWinner ? '2px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isUserWinner ? '0 8px 32px rgba(217, 181, 109, 0.25)' : 'var(--shadow-lg)'
        }}
      >
        <div
          className="modal-header"
          style={{
            justifyContent: 'center',
            background: isUserWinner
              ? 'rgba(212, 175, 55, 0.15)'
              : isForfeitedByUser
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(148, 163, 184, 0.1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            {isUserWinner ? (
              <>
                <Trophy size={48} color="var(--gold-primary)" />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gold-primary)' }}>
                  مبروووك الفوز بالماتش! 🎉
                </h2>
              </>
            ) : isForfeitedByUser ? (
              <>
                <LogOut size={48} color="#f87171" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>
                  لقد غادرت المباراة
                </h2>
              </>
            ) : (
              <>
                <Award size={48} color="#94a3b8" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#cbd5e1' }}>
                  هارد لك، انتهت المباراة
                </h2>
              </>
            )}
          </div>
        </div>

        <div className="modal-body">
          {result.winnerName ? (
            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
              الفائز بالماتش:{' '}
              <span style={{ color: isUserWinner ? 'var(--gold-primary)' : '#60a5fa' }}>
                {result.winnerName}
              </span>
            </p>
          ) : result.winningTeamIndex ? (
            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
              الفريق الفائز:{' '}
              <span style={{ color: isUserWinner ? 'var(--gold-primary)' : '#60a5fa' }}>
                فريق {result.winningTeamIndex}
              </span>
            </p>
          ) : null}

          <div
            style={{
              background: '#0a0f18',
              padding: '1.25rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.5rem'
            }}
          >
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
              النتيجة النهائية للماتش
            </span>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: isUserWinner ? 'var(--gold-primary)' : '#f8fafc'
              }}
            >
              {result.finalTeam1Score} - {result.finalTeam2Score}
            </div>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              {result.reason}
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onReturnToLobby} style={{ padding: '0.85rem 2rem' }}>
            <Home size={18} />
            <span>العودة للوبي الرئيسي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
