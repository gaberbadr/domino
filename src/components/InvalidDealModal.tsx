import React from 'react';
import { InvalidDealNotificationDto } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { STRINGS } from '../constants/strings';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface InvalidDealModalProps {
  notification: InvalidDealNotificationDto | null;
  onDismiss: () => void;
}

export const InvalidDealModal: React.FC<InvalidDealModalProps> = ({
  notification,
  onDismiss
}) => {
  if (!notification) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px', border: '2px solid #ef4444' }}>
        <div className="modal-header" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
            <AlertTriangle size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {STRINGS.invalidDealTitle}
            </h3>
          </div>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
            اللاعب المتسبب: <span style={{ color: 'var(--gold-primary)' }}>{notification.invalidUserName}</span>
          </p>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontWeight: 600,
              marginBottom: '1.5rem'
            }}
          >
            سبب الإلغاء: {notification.reason}
          </div>

          <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1rem' }}>
            {STRINGS.invalidDealRevealed}
          </p>

          {/* Reveal Invalid Hand */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#0a0f18',
              padding: '1rem',
              borderRadius: '1rem',
              border: '1px solid #1e293b',
              marginBottom: '1.5rem'
            }}
          >
            {notification.revealedHand.map((tile) => (
              <DominoTileView key={tile.id} tile={tile} orientation="vertical" size="small" />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 600 }}>
            <RefreshCw size={18} className="animate-spin" />
            <span>بيتم شخللة وإعادة توزيع الورق من جديد...</span>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onDismiss}>
            فهمت، كمل اللعبة
          </button>
        </div>
      </div>
    </div>
  );
};
