import React, { useState } from 'react';
import { soundService } from '../services/soundService';
import { Volume2, VolumeX, Sliders, Check, X } from 'lucide-react';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const settings = soundService.getSettings();
  const [gameplayEnabled, setGameplayEnabled] = useState(settings.gameplayEnabled);
  const [soundboardEnabled, setSoundboardEnabled] = useState(settings.soundboardEnabled);
  const [volume, setVolume] = useState(Math.round(settings.volume * 100));

  if (!isOpen) return null;

  const handleToggleGameplay = () => {
    const next = !gameplayEnabled;
    setGameplayEnabled(next);
    soundService.setGameplaySoundsEnabled(next);
  };

  const handleToggleSoundboard = () => {
    const next = !soundboardEnabled;
    setSoundboardEnabled(next);
    soundService.setSoundboardEnabled(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    soundService.setVolume(val / 100);
  };

  const testGameplaySound = () => {
    soundService.playGameplay('play');
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 550,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#131b28',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '1.25rem',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} style={{ color: 'var(--gold-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-primary)', margin: 0 }}>
              إعدادات الصوت والمؤثرات 🎧
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Master Volume Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>مستوى الصوت العام</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)' }}>{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: '100%',
                accentColor: 'var(--gold-primary)',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Toggle Gameplay Sounds */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={handleToggleGameplay}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                مؤثرات اللعب التلقائية
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                أصوات رمي الدومينو، الخلط، السحب، والتعدية
              </div>
            </div>

            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: gameplayEnabled ? '#10b981' : '#334155',
                position: 'relative',
                transition: 'background 0.2s'
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: gameplayEnabled ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }}
              />
            </div>
          </div>

          {/* Toggle Soundboard Clips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={handleToggleSoundboard}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                ريأكشنات وأصوات اللعيبة
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                المقاطع الصوتية التي يشغلها اللاعبون أثناء الجيم
              </div>
            </div>

            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: soundboardEnabled ? '#10b981' : '#334155',
                position: 'relative',
                transition: 'background 0.2s'
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: soundboardEnabled ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              onClick={testGameplaySound}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              <Volume2 size={15} />
              <span>تجربة صوت رمي الدومينو</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}>
            <Check size={16} />
            <span>حفظ وإغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
