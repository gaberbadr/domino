import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminPlayerDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { ShieldCheck, Search, Ban, CheckCircle, RefreshCw } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [players, setPlayers] = useState<AdminPlayerDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPlayers = async (searchTerm = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.admin.getPlayers(searchTerm);
      setPlayers(data.players);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات اللاعبين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayers('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBlockToggle = async (player: AdminPlayerDto) => {
    try {
      if (player.isActive) {
        await api.admin.blockPlayer(player.userId);
        setActionSuccess(`تم حظر اللاعب ${player.displayName} بنجاح`);
      } else {
        await api.admin.unblockPlayer(player.userId);
        setActionSuccess(`تم إلغاء حظر اللاعب ${player.displayName} بنجاح`);
      }
      fetchPlayers();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث حالة اللاعب');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '840px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
              {STRINGS.adminPanel} - {STRINGS.playersManagement}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Search bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder={STRINGS.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchPlayers(search);
                }}
              />
              <Search
                size={18}
                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => fetchPlayers(search)} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>بحث</span>
            </button>
          </div>

          {actionSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '0.6rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
              {actionSuccess}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '0.6rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#0b111c', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>الاسم المستعار</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>الحالة</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>تاريخ التسجيل</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      {isLoading ? 'بيحمل بيانات اللعيبة...' : 'مفيش لعيبة مطابقين للبحث'}
                    </td>
                  </tr>
                ) : (
                  players.map((p) => (
                    <tr key={p.userId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {p.displayName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.9rem', direction: 'ltr', textAlign: 'right' }}>
                        {p.email}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                          {p.isActive ? STRINGS.activeStatus : STRINGS.blockedStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          className={`btn ${p.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleBlockToggle(p)}
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          {p.isActive ? (
                            <>
                              <Ban size={14} />
                              <span>{STRINGS.blockPlayer}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              <span>{STRINGS.unblockPlayer}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
