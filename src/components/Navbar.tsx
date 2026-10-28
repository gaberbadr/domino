import React from 'react';
import { UserProfileDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { User, LogIn, LogOut, ShieldCheck, Edit3 } from 'lucide-react';

interface NavbarProps {
  user: UserProfileDto | null;
  onlineCount: number;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onEditProfileClick: () => void;
  onAdminClick: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onlineCount,
  onLoginClick,
  onLogoutClick,
  onEditProfileClick,
  onAdminClick,
  onLogoClick
}) => {
  return (
    <header
      style={{
        background: 'rgba(10, 14, 23, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.75rem 0'
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand / Logo */}
        <div
          onClick={onLogoClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '2px solid var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px var(--gold-glow)'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🀄</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              {STRINGS.appTitle}
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>اللعبة الجماعية أونلاين</span>
          </div>
        </div>

        {/* Center: Online Presence */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#34d399'
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }}
          />
          <span>{onlineCount} {onlineCount === 1 ? 'لاعب متصل' : 'لعيبة متصلين'}</span>
        </div>

        {/* Left Side: Auth & User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user ? (
            <>
              {user.isAdmin && (
                <button
                  className="btn btn-secondary"
                  onClick={onAdminClick}
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', borderColor: 'rgba(212, 175, 55, 0.4)' }}
                  title={STRINGS.adminPanel}
                >
                  <ShieldCheck size={16} color="var(--gold-primary)" />
                  <span style={{ color: 'var(--gold-primary)' }}>الأدمن</span>
                </button>
              )}

              {/* User profile dropdown / trigger */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#141c2b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.75rem'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gold-primary)'
                  }}
                >
                  <User size={18} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                  {user.fullName}
                </span>
                <button
                  onClick={onEditProfileClick}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                  title={STRINGS.editProfile}
                >
                  <Edit3 size={15} />
                </button>
              </div>

              {/* Logout button */}
              <button
                className="btn btn-secondary"
                onClick={onLogoutClick}
                style={{ padding: '0.5rem 0.75rem' }}
                title={STRINGS.signOut}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="btn btn-google" onClick={onLoginClick}>
              <LogIn size={18} />
              <span>{STRINGS.googleSignIn}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
