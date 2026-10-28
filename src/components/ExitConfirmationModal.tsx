import React from 'react';
import { GameMode } from '../types/domino';
import { AlertTriangle, LogOut, ArrowRight } from 'lucide-react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode?: GameMode;
  isMatchActive?: boolean;
  isLobby?: boolean;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode = GameMode.Individual,
  isMatchActive = true,
  isLobby = false
}) => {
  if (!isOpen) return null;

  const getConsequenceText = () => {
    if (isLobby) {
      return 'أنت حالياً في صالة الانتظار. خروجك من الأوضة سيحذفها إذا كنت المضيف ولم يتبق لاعبون، أو سينقل دور المضيف إلى لاعب آخر.';
    }

    if (!isMatchActive) {
      return 'الماتش منتهي. يمكنك مغادرة التربيزة والعودة إلى الصفحة الرئيسية بأمان.';
    }

    switch (mode) {
      case GameMode.Individual:
        return 'أنت في ماتش فردي نشط (1 ضد 1). خروجك الآن سيعتبر انسحاباً رسمياً ويؤدي إلى فوز الخصم بالماتش مباشرة!';
      case GameMode.Quadruple:
        return 'أنت في ماتش رباعي نشط (2 ضد 2). خروجك الآن سيعتبر انسحاباً ويؤدي إلى خسارة فريقك وفوز الفريق المنافس بالماتش!';
      case GameMode.Triple:
        return 'أنت في ماتش ثلاثي نشط. خروجك سيبدأ مهلة الـ 60 ثانية قبل إلغاء الماتش وحذف الأوضة دون فوز أحد.';
      default:
        return 'خروجك من الماتش النشط قد يؤدي إلى خسارة الجولة والماتش.';
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
        }}
      >
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={24} color="#ef4444" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {isMatchActive && !isLobby ? 'تأكيد الانسحاب ومغادرة الماتش' : 'تأكيد مغادرة الأوضة'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem 1.25rem' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '0.75rem',
              padding: '1rem',
              color: '#fca5a5',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              fontWeight: 600
            }}
          >
            {getConsequenceText()}
          </div>

          <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            هل أنت متأكد من رغبتك في المغادرة الآن؟
          </p>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowRight size={16} />
            <span>إلغاء ومتابعة اللعب</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1.25rem',
              fontWeight: 800
            }}
          >
            <LogOut size={16} />
            <span>نعم، تأكيد الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
