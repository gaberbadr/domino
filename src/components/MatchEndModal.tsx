import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MatchEndResultDto } from '../types/domino';
import { Trophy, Home } from 'lucide-react';

interface MatchEndModalProps {
  result: MatchEndResultDto | null;
  onReturnToLobby: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  result,
  onReturnToLobby
}) => {
  useEffect(() => {
    if (result) {
      // Confetti fire
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [result]);

  if (!result) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', textAlign: 'center', border: '2px solid var(--gold-primary)' }}>
        <div className="modal-header" style={{ justifyContent: 'center', background: 'rgba(212, 175, 55, 0.15)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={48} color="var(--gold-primary)" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gold-primary)' }}>
              مبروووك الفوز بالماتش! 🎉
            </h2>
          </div>
        </div>

        <div className="modal-body">
          {result.winnerName ? (
            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
              الفائز: <span style={{ color: 'var(--gold-primary)' }}>{result.winnerName}</span>
            </p>
          ) : result.winningTeamIndex ? (
            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
              الفريق الفائز: <span style={{ color: 'var(--gold-primary)' }}>فريق {result.winningTeamIndex}</span>
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
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gold-primary)' }}>
              {result.finalTeam1Score} - {result.finalTeam2Score}
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
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
