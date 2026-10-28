import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminPlayerDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { ShieldCheck, Search, Ban, CheckCircle, RefreshCw, ChevronRight, ChevronLeft, UserX, UserCheck } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [players, setPlayers] = useState<AdminPlayerDto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmTarget, setConfirmTarget] = useState<{
    player: AdminPlayerDto;
    action: 'block' | 'unblock';
  } | null>(null);

  const fetchPlayers = async (
    targetPage = page,
    searchTerm = search,
    status = statusFilter
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.admin.getPlayers(searchTerm, status, targetPage, pageSize);
      setPlayers(data.players);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات اللاعبين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchPlayers(1, search, statusFilter);
    }
  }, [isOpen, statusFilter]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      fetchPlayers(newPage, search, statusFilter);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPlayers(1, search, statusFilter);
  };

  const executeBlockToggle = async () => {
    if (!confirmTarget) return;
    const { player, action } = confirmTarget;
    setConfirmTarget(null);

    try {
      if (action === 'block') {
        await api.admin.blockPlayer(player.userId);
        setActionSuccess(`تم حظر اللاعب ${player.displayName} وإنهاء جلسته بنجاح.`);
      } else {
        await api.admin.unblockPlayer(player.userId);
        setActionSuccess(`تم إلغاء حظر اللاعب ${player.displayName} بنجاح.`);
      }
      fetchPlayers(page, search, statusFilter);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'فشل تنفيذ الإجراء على اللاعب');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '860px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={26} color="var(--platinum-silver)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
              {STRINGS.adminPanel} - إدارة وحظر اللاعبين
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid rgba(229, 231, 235, 0.1)',
              paddingBottom: '0.75rem'
            }}
          >
            <button
              type="button"
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1.15rem', fontSize: '0.88rem' }}
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            >
              <span>كل المستخدمين</span>
            </button>

            <button
              type="button"
              className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1.15rem', fontSize: '0.88rem' }}
              onClick={() => {
                setStatusFilter('active');
                setPage(1);
              }}
            >
              <UserCheck size={16} />
              <span>النشطين</span>
            </button>

            <button
              type="button"
              className={`btn ${statusFilter === 'blocked' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1.15rem', fontSize: '0.88rem' }}
              onClick={() => {
                setStatusFilter('blocked');
                setPage(1);
              }}
            >
              <UserX size={16} />
              <span>المحظورين</span>
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="ابحث بالاسم المستعار أو البريد الإلكتروني..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>بحث</span>
            </button>
          </form>

          {/* Success / Error Alerts */}
          {actionSuccess && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '0.65rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {actionSuccess}
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '0.65rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {error}
            </div>
          )}

          {/* Users Table */}
          <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid rgba(229, 231, 235, 0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#130e0b', borderBottom: '1px solid rgba(229, 231, 235, 0.12)' }}>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>الاسم المستعار</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>الحالة</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>تاريخ التسجيل</th>
                  <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {isLoading ? 'جاري تحميل بيانات اللاعبين...' : 'لا يوجد لاعبين مطابقين للبحث والفلاتر'}
                    </td>
                  </tr>
                ) : (
                  players.map((p) => (
                    <tr key={p.userId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {p.displayName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', direction: 'ltr', textAlign: 'right' }}>
                        {p.email}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                          {p.isActive ? STRINGS.activeStatus : STRINGS.blockedStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          className={`btn ${p.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => setConfirmTarget({ player: p, action: p.isActive ? 'block' : 'unblock' })}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                صفحة {page} من {totalPages} (إجمالي {totalCount} لاعب)
              </span>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page <= 1 || isLoading}
                  onClick={() => handlePageChange(page - 1)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <ChevronRight size={15} />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => handlePageChange(page + 1)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <span>التالي</span>
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Block / Unblock */}
      {confirmTarget && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: confirmTarget.action === 'block' ? '#ef4444' : '#10b981' }}>
                {confirmTarget.action === 'block' ? 'تأكيد حظر اللاعب' : 'تأكيد إلغاء حظر اللاعب'}
              </h4>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {confirmTarget.action === 'block'
                  ? `هل أنت متأكد من حظر اللاعب "${confirmTarget.player.displayName}"؟ سيتم إلغاء صلاحية جلسته وطرده من أي أوضة نشطة فوراً.`
                  : `هل أنت متأكد من إلغاء حظر اللاعب "${confirmTarget.player.displayName}"؟ سيتمكن من تسجيل الدخول والمشاركة من جديد.`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmTarget(null)}>
                إلغاء
              </button>
              <button
                className={`btn ${confirmTarget.action === 'block' ? 'btn-danger' : 'btn-success'}`}
                onClick={executeBlockToggle}
              >
                {confirmTarget.action === 'block' ? 'نعم، قم بالحظر' : 'نعم، فك الحظر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
