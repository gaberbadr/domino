import React, { useState } from 'react';
import { CreateRoomRequest, GameMode } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { Users, Lock, Unlock, Play } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateRoomRequest) => Promise<void>;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GameMode>(GameMode.Individual);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPrivate && !password.trim()) {
      setError('برجاء كتابة رقم سري للأوضة الخاصة');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim() || 'أوضة الدومينو',
        mode,
        isPrivate,
        password: isPrivate ? password.trim() : undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الأوضة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={22} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
              {STRINGS.createRoom}
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
            {/* Room Name */}
            <div className="form-group">
              <label className="form-label">اسم الأوضة</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: قعدة الحبايب..."
                maxLength={40}
              />
            </div>

            {/* Mode Selection */}
            <div className="form-group">
              <label className="form-label">نظام اللعبة</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={`btn ${mode === GameMode.Individual ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', textAlign: 'center' }}
                  onClick={() => setMode(GameMode.Individual)}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>فردي (1v1)</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>لاعبين</span>
                </button>

                <button
                  type="button"
                  className={`btn ${mode === GameMode.Triple ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', textAlign: 'center' }}
                  onClick={() => setMode(GameMode.Triple)}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>ثلاثي (3P)</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>3 لعيبة</span>
                </button>

                <button
                  type="button"
                  className={`btn ${mode === GameMode.Quadruple ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', textAlign: 'center' }}
                  onClick={() => setMode(GameMode.Quadruple)}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>رباعي (4P)</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>فريقين</span>
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                {mode === GameMode.Individual && STRINGS.modeIndividualDesc}
                {mode === GameMode.Triple && STRINGS.modeTripleDesc}
                {mode === GameMode.Quadruple && STRINGS.modeQuadrupleDesc}
              </p>
            </div>

            {/* Privacy Toggle */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isPrivate ? <Lock size={18} color="var(--gold-primary)" /> : <Unlock size={18} color="#94a3b8" />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>أوضة خاصة برقم سري</span>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Password input if private */}
            {isPrivate && (
              <div className="form-group">
                <label className="form-label">الرقم السري للأوضة</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="اكتب باسورد دخول الأوضة..."
                />
              </div>
            )}

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
              <Play size={16} />
              <span>{isSubmitting ? 'بيعمل الأوضة...' : 'إنشاء الأوضة الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
