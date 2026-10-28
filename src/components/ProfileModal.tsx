import React, { useState } from 'react';
import { STRINGS } from '../constants/strings';

interface ProfileModalProps {
  currentName: string;
  isOpen: boolean;
  onSave: (newName: string) => Promise<void>;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentName,
  isOpen,
  onSave,
  onClose
}) => {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2 || name.trim().length > 50) {
      setError('الاسم يجب أن يكون بين حرفين و 50 حرفاً');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل تعديل الاسم');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
            {STRINGS.editProfile}
          </h3>
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
              <label className="form-label">{STRINGS.displayName}</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب اسمك المستعار في اللعبة..."
                autoFocus
                maxLength={50}
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {STRINGS.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'بيحفظ...' : STRINGS.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
