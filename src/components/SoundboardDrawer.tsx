import React, { useState } from 'react';
import { REPLAY_SOUNDS_CATALOG, ReplaySoundItem } from '../services/soundService';
import { Volume2, Search, X, Sparkles } from 'lucide-react';

interface SoundboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySound: (soundKey: string) => void;
  cooldownSeconds?: number;
}

export const SoundboardDrawer: React.FC<SoundboardDrawerProps> = ({
  isOpen,
  onClose,
  onPlaySound,
  cooldownSeconds = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyPlayedKey, setRecentlyPlayedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSounds = REPLAY_SOUNDS_CATALOG.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSoundClick = (item: ReplaySoundItem) => {
    if (cooldownSeconds > 0) return;
    setRecentlyPlayedKey(item.key);
    onPlaySound(item.key);
    setTimeout(() => {
      setRecentlyPlayedKey(null);
    }, 1500);
  };

  return (
    <div
      className="soundboard-drawer-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="soundboard-content"
        style={{
          background: 'linear-gradient(145deg, #131b28 0%, #0c121d 100%)',
          border: '2px solid var(--gold-primary)',
          borderRadius: '1.25rem',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(7, 10, 16, 0.5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-primary)'
              }}
            >
              <Volume2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-primary)', margin: 0 }}>
                أصوات وريأكشنات القهوة 🎙️
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                شارك صوت مع باقي اللعيبة على التربيزة
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Cooldown Banner */}
        <div style={{ padding: '0.75rem 1.25rem 0.25rem' }}>
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                top: '50%',
                right: '0.75rem',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }}
            />
            <input
              type="text"
              placeholder="ابحث في الريأكشنات (بهجت صابر، دمرتني، متعيطش...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingRight: '2.25rem',
                fontSize: '0.85rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem'
              }}
            />
          </div>

          {cooldownSeconds > 0 && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                textAlign: 'center',
                marginBottom: '0.4rem',
                fontWeight: 700
              }}
            >
              استنى {cooldownSeconds} ثواني عشان تشغّل صوت تاني بدون إزعاج ⏳
            </div>
          )}
        </div>

        {/* Sound Buttons Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem 1.25rem 1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.65rem',
            maxHeight: '400px'
          }}
        >
          {filteredSounds.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '2rem',
                color: '#64748b'
              }}
            >
              مفيش ريأكشن بالاسم ده يا معلم!
            </div>
          ) : (
            filteredSounds.map((item) => {
              const isPlaying = recentlyPlayedKey === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSoundClick(item)}
                  disabled={cooldownSeconds > 0}
                  className="sound-tile-btn"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.75rem 0.5rem',
                    borderRadius: '0.85rem',
                    background: isPlaying
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isPlaying ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isPlaying ? '#10b981' : '#f8fafc',
                    cursor: cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isPlaying ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                    transform: isPlaying ? 'scale(1.04)' : 'none',
                    textAlign: 'center',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ marginBottom: '0.35rem', opacity: isPlaying ? 1 : 0.7 }}>
                    {isPlaying ? (
                      <Sparkles size={18} style={{ color: '#10b981', animation: 'spin 2s linear infinite' }} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
