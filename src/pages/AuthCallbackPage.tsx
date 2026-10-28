import React, { useEffect, useState, useRef } from 'react';
import { tokenStorage } from '../services/api';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface AuthCallbackPageProps {
  onSuccess: () => void;
  onError: () => void;
}

export const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({
  onSuccess,
  onError
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const accessTokenExpiresAt = params.get('accessTokenExpiresAt') || undefined;
    const refreshTokenExpiresAt = params.get('refreshTokenExpiresAt') || undefined;

    if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
      return;
    }

    if (!accessToken || !refreshToken) {
      if (tokenStorage.getAccessToken()) {
        setStatus('success');
        window.history.replaceState({}, document.title, '/');
        setTimeout(() => {
          onSuccess();
        }, 500);
        return;
      }
      setStatus('error');
      setErrorMessage('بيانات تسجيل الدخول غير مكتملة، برجاء المحاولة مرة أخرى');
      return;
    }

    tokenStorage.setTokens(accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
    setStatus('success');

    // Clean URL back to root
    window.history.replaceState({}, document.title, '/');

    setTimeout(() => {
      onSuccess();
    }, 1200);
  }, [onSuccess]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        {status === 'loading' && (
          <div>
            <RefreshCw size={48} className="animate-spin" color="var(--gold-primary)" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
              جاري تسجيل الدخول بحساب Google...
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              ثواني وبنجهز قعدتك في اللعبة
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginBottom: '0.5rem' }}>
              تم تسجيل الدخول بنجاح!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              بنحولك لتربيزة اللعب دلوقتي...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444', marginBottom: '0.5rem' }}>
              فشل تسجيل الدخول
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {errorMessage}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                window.history.replaceState({}, document.title, '/');
                onError();
              }}
            >
              العودة للرئيسية
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
