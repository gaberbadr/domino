import React, { useState } from 'react';
import { STRINGS } from '../constants/strings';
import { Lock, LogIn } from 'lucide-react';

interface JoinPrivateModalProps {
  isOpen: boolean;
  initialRoomCode?: string;
  onClose: () => void;
  onJoin: (roomCode: string, password?: string) => Promise<void>;
}

export const JoinPrivateModal: React.FC<JoinPrivateModalProps> = ({
  isOpen,
  initialRoomCode = '',
  onClose,
  onJoin
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('برجاء إدخال كود الأوضة');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onJoin(roomCode.trim().toUpperCase(), password.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'تعذر دخول الأوضة، تأكد من الكود والباسورد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={22} color="var(--platinum-silver)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {STRINGS.joinPrivateRoom}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">{STRINGS.roomCode}</label>
              <input
                type="text"
                className="form-input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="اكتب كود الأوضة المكون من 6 حروف..."
                maxLength={10}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">الرقم السري (إن وجد)</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اكتب باسورد الأوضة إذا كانت خاصة..."
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              {STRINGS.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <LogIn size={16} />
              <span>{isSubmitting ? 'جاري الدخول...' : 'دخول الأوضة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
