import React from 'react';
import { BoardEnd, DominoTile } from '../types/domino';
import { DominoTileView } from './DominoTileView';
import { STRINGS } from '../constants/strings';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ChooseEndModalProps {
  tile: DominoTile | null;
  openLeft: number | null;
  openRight: number | null;
  onSelectEnd: (end: BoardEnd) => void;
  onCancel: () => void;
}

export const ChooseEndModal: React.FC<ChooseEndModalProps> = ({
  tile,
  openLeft,
  openRight,
  onSelectEnd,
  onCancel
}) => {
  if (!tile) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: 'center' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
            اختيار طرف اللعب
          </h3>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <DominoTileView tile={tile} orientation="horizontal" size="large" />
          </div>

          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1.5rem' }}>
            {STRINGS.chooseEndPrompt}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => onSelectEnd(BoardEnd.Right)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1.25rem 1rem',
                borderColor: 'rgba(212, 175, 55, 0.4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-primary)', fontWeight: 700 }}>
                <span>{STRINGS.chooseRight}</span>
                <ArrowRight size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                رقم الطرف: <strong style={{ color: '#fff' }}>{openRight}</strong>
              </span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => onSelectEnd(BoardEnd.Left)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1.25rem 1rem',
                borderColor: 'rgba(59, 130, 246, 0.4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>
                <ArrowLeft size={20} />
                <span>{STRINGS.chooseLeft}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                رقم الطرف: <strong style={{ color: '#fff' }}>{openLeft}</strong>
              </span>
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {STRINGS.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
