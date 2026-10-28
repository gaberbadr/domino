import React from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

interface RotateDeviceOverlayProps {
  onDismiss?: () => void;
}

export const RotateDeviceOverlay: React.FC<RotateDeviceOverlayProps> = ({ onDismiss }) => {
  return (
    <div
      className="rotate-device-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at center, #0f172a 0%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        color: '#f8fafc',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(212, 175, 55, 0.1)',
          border: '2px solid rgba(212, 175, 55, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          position: 'relative',
          boxShadow: '0 0 30px rgba(212, 175, 55, 0.25)'
        }}
      >
        <Smartphone
          size={56}
          className="phone-rotate-anim"
          style={{
            color: 'var(--gold-primary)',
            filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))'
          }}
        />
        <RotateCw
          size={24}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            color: '#10b981',
            animation: 'spin 3s linear infinite'
          }}
        />
      </div>

      <h2
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--gold-primary)',
          marginBottom: '0.75rem',
          letterSpacing: '-0.5px'
        }}
      >
        اقلب الموبايل بالعرض 📱⟳
      </h2>

      <p
        style={{
          fontSize: '1.05rem',
          color: '#cbd5e1',
          maxWidth: '380px',
          lineHeight: 1.6,
          marginBottom: '2rem'
        }}
      >
        يا معلم، تربيزة الدومينو وسلسلة الورق محتاجة مساحة أفقية.. لف جهازك للوضع الأفقي (Landscape) عشان تستمتع باللعب بأفضل رؤية وتحكم.
      </p>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="btn btn-secondary"
          style={{
            fontSize: '0.85rem',
            padding: '0.5rem 1.25rem',
            opacity: 0.8
          }}
        >
          المتابعة بالوضع الحالي مؤقتاً
        </button>
      )}
    </div>
  );
};
