import React from 'react';
import { UserProfileDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { User, LogIn, LogOut, ShieldCheck, Edit3, Loader2 } from 'lucide-react';

interface NavbarProps {
  user: UserProfileDto | null;
  onlineCount: number;
  isAuthLoading?: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onEditProfileClick: () => void;
  onAdminClick: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onlineCount,
  isAuthLoading = false,
  onLoginClick,
  onLogoutClick,
  onEditProfileClick,
  onAdminClick,
  onLogoClick
}) => {
  return (
    <header
      className="navbar"
      style={{
        background: 'rgba(26, 20, 16, 0.95)',
        borderBottom: '1px solid rgba(229, 231, 235, 0.15)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.65rem 0'
      }}
    >
      <div className="container navbar-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
        {/* Brand / Logo */}
        <div
          className="navbar-brand-wrapper"
          onClick={onLogoClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, var(--mocha-light) 0%, var(--mocha-dark) 100%)',
              border: '2px solid var(--platinum-silver)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px var(--mocha-glow)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🀄</span>
          </div>
          <div>
            <h1 className="navbar-brand-title" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
              {STRINGS.appTitle}
            </h1>
            <span className="navbar-brand-subtitle" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>اللعبة الجماعية أونلاين</span>
          </div>
        </div>

        {/* Center: Online Presence */}
        <div
          className="navbar-online-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.28rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#34d399',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              flexShrink: 0
            }}
          />
          <span className="online-text-long">{onlineCount} {onlineCount === 1 ? 'لاعب متصل' : 'لعيبة متصلين'}</span>
          <span className="online-text-short">{onlineCount} متصل</span>
        </div>

        {/* Left Side: Auth & User Actions */}
        <div className="navbar-auth-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {user ? (
            <>
              {user.isAdmin && (
                <button
                  className="btn btn-secondary"
                  onClick={onAdminClick}
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', borderColor: 'var(--platinum-border)', touchAction: 'manipulation' }}
                  title={STRINGS.adminPanel}
                >
                  <ShieldCheck size={15} color="var(--platinum-primary)" />
                  <span className="admin-btn-label" style={{ color: 'var(--platinum-primary)' }}>الأدمن</span>
                </button>
              )}

              {/* User profile badge */}
              <div
                className="navbar-user-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(229, 231, 235, 0.15)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.75rem'
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--mocha-dark)',
                    border: '1px solid var(--mocha-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--platinum-primary)',
                    flexShrink: 0
                  }}
                >
                  <User size={16} />
                </div>
                <span className="navbar-user-name" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {user.fullName}
                </span>
                <button
                  onClick={onEditProfileClick}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, touchAction: 'manipulation' }}
                  title={STRINGS.editProfile}
                >
                  <Edit3 size={14} />
                </button>
              </div>

              {/* Logout button */}
              <button
                id="navbar-logout-btn"
                className="btn btn-secondary"
                onClick={onLogoutClick}
                disabled={isAuthLoading}
                style={{
                  padding: '0.45rem 0.75rem',
                  minHeight: '38px',
                  minWidth: '38px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isAuthLoading ? 'not-allowed' : 'pointer',
                  opacity: isAuthLoading ? 0.6 : 1,
                  touchAction: 'manipulation'
                }}
                title={STRINGS.signOut}
              >
                {isAuthLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
              </button>
            </>
          ) : (
            <button
              id="navbar-google-login-btn"
              className="btn btn-google"
              onClick={onLoginClick}
              disabled={isAuthLoading}
              style={{
                padding: '0.45rem 0.85rem',
                minHeight: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAuthLoading ? 'not-allowed' : 'pointer',
                opacity: isAuthLoading ? 0.7 : 1,
                touchAction: 'manipulation'
              }}
            >
              {isAuthLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              <span className="google-btn-full">{STRINGS.googleSignIn}</span>
              <span className="google-btn-short">دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
