import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UI runtime error intercepted by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--bg-main, #123C32)',
            color: 'var(--text-main, #F5F3EA)',
            direction: 'rtl',
            textAlign: 'center'
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: 480,
              padding: '2rem 1.5rem',
              borderRadius: '1.25rem',
              background: 'var(--bg-card, #1B5142)',
              border: '1px solid var(--border-main, #426B5D)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={48} color="var(--gold-primary, #D9B56D)" />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold-primary, #D9B56D)', marginBottom: '0.75rem' }}>
              حدث خطأ في عرض الواجهة
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted, #B8C9C0)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              واجهت الواجهة مشكلة غير متوقعة. تم حفظ جلستك بأمان، ويمكنك إعادة المحاولة أو العودة للشاشة الرئيسية بدون فقدان الاتصال.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReset}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem', gap: '0.4rem' }}
              >
                <RefreshCw size={16} />
                <span>إعادة المحاولة</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  window.location.href = '/';
                }}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem', gap: '0.4rem' }}
              >
                <Home size={16} />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
