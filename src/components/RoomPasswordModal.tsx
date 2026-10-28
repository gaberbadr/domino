import React, { useState, useEffect, useRef } from 'react';
import { RoomDto, GameMode } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { Lock, LogIn, AlertCircle, Users, Shield } from 'lucide-react';

interface RoomPasswordModalProps {
  room: RoomDto | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomCode: string, password: string) => Promise<void>;
}

export const RoomPasswordModal: React.FC<RoomPasswordModalProps> = ({
  room,
  isOpen,
  onClose,
  onJoin
}) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Reset internal state whenever modal opens or room changes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSubmitting(false);
      // Auto-focus the password field
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, room?.id]);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('برجاء كتابة كلمة سر الأوضة');
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Send the entered password together with the selected room's known roomCode
      await onJoin(room.roomCode, password.trim());
      onClose();
    } catch (err: any) {
      // Show exact error and keep modal open so the user can retry without re-selecting room
      setError(err.message || 'كلمة سر الأوضة غير صحيحة أو الأوضة لم تعد متاحة');
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModeBadge = (mode: GameMode) => {
    switch (mode) {
      case GameMode.Individual:
        return <span className="badge badge-mocha">فردي (1v1)</span>;
      case GameMode.Triple:
        return <span className="badge badge-blue">ثلاثي (3P)</span>;
      case GameMode.Quadruple:
        return <span className="badge badge-green">رباعي (4P)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          border: '1px solid var(--mocha-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, var(--mocha-surface) 0%, var(--bg-card) 100%)',
            borderBottom: '1px solid rgba(229, 231, 235, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '0.5rem',
                background: 'var(--mocha-dark)',
                border: '1px solid var(--mocha-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Lock size={18} color="var(--platinum-silver)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                دخول أوضة محمية برقم سري
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                أدخل الرقم السري للانضمام إلى التربيزة
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
            title={STRINGS.cancel}
          >
            ✕
          </button>
        </div>

        {/* Selected Room Summary (Read-Only info, user does NOT re-enter room code) */}
        <div
          style={{
            padding: '1rem 1.25rem 0',
            background: 'rgba(39, 23, 12, 0.35)',
            borderBottom: '1px solid rgba(229, 231, 235, 0.08)'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--mocha-border)',
              borderRadius: '0.75rem',
              padding: '0.85rem 1rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {room.name}
              </strong>
              {getModeBadge(room.mode)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={14} color="var(--platinum-silver)" />
                <span>المضيف: <strong style={{ color: 'var(--text-main)' }}>{room.hostName}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 700 }}>
                <Users size={14} />
                <span>{room.currentPlayersCount} / {room.maxPlayers} لعيبة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: error ? '0.75rem' : '0' }}>
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-main)'
                }}
              >
                <span>الرقم السري للأوضة (Password)</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>مطلوب</span>
              </label>

              <input
                ref={passwordInputRef}
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="اكتب باسورد الأوضة هنا..."
                disabled={isSubmitting}
                style={{
                  fontSize: '1rem',
                  padding: '0.75rem 1rem',
                  borderColor: error ? '#ef4444' : undefined,
                  boxShadow: error ? '0 0 0 1px #ef4444' : undefined
                }}
              />
            </div>

            {/* Error Feedback with Retry guidance */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginTop: '0.75rem',
                  lineHeight: 1.5
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderTop: '1px solid rgba(229, 231, 235, 0.1)'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {STRINGS.cancel}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !password.trim()}
              style={{ padding: '0.65rem 1.5rem', fontWeight: 800 }}
            >
              <LogIn size={16} />
              <span>{isSubmitting ? 'جاري التحقق...' : 'دخول الأوضة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
