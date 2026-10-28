import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { GameMode, RoomDto, UserProfileDto } from '../types/domino';
import { STRINGS } from '../constants/strings';
import { RoomPasswordModal } from '../components/RoomPasswordModal';
import { PlusCircle, KeyRound, Users, Play, RefreshCw, Lock, Sparkles, AlertCircle } from 'lucide-react';

interface HomePageProps {
  user: UserProfileDto | null;
  onlineCount: number;
  onCreateRoomClick: () => void;
  onJoinPrivateClick: () => void;
  onJoinRoom: (roomCode: string, password?: string) => Promise<void>;
  onLoginClick: () => void;
  onAdminClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  onlineCount,
  onCreateRoomClick,
  onJoinPrivateClick,
  onJoinRoom,
  onLoginClick,
  onAdminClick
}) => {
  const [publicRooms, setPublicRooms] = useState<RoomDto[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedModeFilter, setSelectedModeFilter] = useState<GameMode | 'all'>('all');
  const [selectedLockedRoom, setSelectedLockedRoom] = useState<RoomDto | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await api.game.getPublicRooms();
      setPublicRooms(rooms);
    } catch {
      // Ignore network errors on public browse
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 6000);
    return () => clearInterval(interval);
  }, []);

  const filteredRooms = publicRooms.filter((r) =>
    selectedModeFilter === 'all' ? true : r.mode === selectedModeFilter
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(180deg, rgba(39, 23, 12, 0.85) 0%, rgba(20, 17, 15, 1) 100%)',
          padding: '3rem 0 2rem',
          borderBottom: '1px solid rgba(229, 231, 235, 0.1)',
          textAlign: 'center'
        }}
      >
        <div className="container" style={{ maxWidth: '900px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(111, 71, 42, 0.25)',
              border: '1px solid rgba(128, 83, 49, 0.5)',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              color: '#e2ba9b',
              fontSize: '0.9rem',
              fontWeight: 700,
              marginBottom: '1.25rem'
            }}
          >
            <Sparkles size={16} />
            <span>🇪🇬 قعدة الدومينو المصرية الأصيلة في أي وقت ومن أي مكان</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.2, marginBottom: '1rem' }}>
            العب دومينو على أصولها مع صحابك لايف
          </h2>


          {/* Main Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (!user) onLoginClick();
                else onCreateRoomClick();
              }}
            >
              <PlusCircle size={22} />
              <span>{STRINGS.createRoom}</span>
            </button>

            <button
              className="btn btn-secondary"
              style={{ padding: '0.9rem 1.75rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (!user) onLoginClick();
                else onJoinPrivateClick();
              }}
            >
              <KeyRound size={20} color="var(--platinum-silver)" />
              <span>{STRINGS.joinPrivateRoom}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modes Overview Cards */}
      <section style={{ padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* 1v1 Individual Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-mocha">1 ضد 1</span>
                <span style={{ fontSize: '1.5rem' }}>⚔️</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                {STRINGS.modeIndividual}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {STRINGS.modeIndividualDesc}، والفائز بالجولة هو اللي يبدأ الجولة اللي بعدها.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--platinum-silver)', fontWeight: 600 }}>
                ✓ السحبة 14 ورقة عند عدم وجود لعب
              </div>
            </div>

            {/* 3P Triple Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-blue">3 لعيبة</span>
                <span style={{ fontSize: '1.5rem' }}>🎯</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                {STRINGS.modeTriple}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {STRINGS.modeTripleDesc}، والفائز هو صاحب أقل عدد بنط فريد في القفلة.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--platinum-silver)', fontWeight: 600 }}>
                ✓ استبعاد ورقة البلاطة (0-0) ومفيش سحبة
              </div>
            </div>

            {/* 4P Quadruple Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-green">4 لعيبة (2 ضد 2)</span>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                {STRINGS.modeQuadruple}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {STRINGS.modeQuadrupleDesc}، الفائز في القفلة هو الفريق صاحب أقل مجموع فردي.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--platinum-silver)', fontWeight: 600 }}>
                ✓ ميزة طلب اللعب بدلاً من الزميل البادئ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Rooms Section */}
      <section style={{ padding: '1rem 0 3.5rem', flex: 1 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={22} color="var(--platinum-silver)" />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {STRINGS.publicRooms}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className={`btn ${selectedModeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                onClick={() => setSelectedModeFilter('all')}
              >
                الكل
              </button>
              <button
                className={`btn ${selectedModeFilter === GameMode.Individual ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                onClick={() => setSelectedModeFilter(GameMode.Individual)}
              >
                فردي
              </button>
              <button
                className={`btn ${selectedModeFilter === GameMode.Triple ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                onClick={() => setSelectedModeFilter(GameMode.Triple)}
              >
                ثلاثي
              </button>
              <button
                className={`btn ${selectedModeFilter === GameMode.Quadruple ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                onClick={() => setSelectedModeFilter(GameMode.Quadruple)}
              >
                رباعي
              </button>

              <button className="btn btn-secondary" onClick={fetchRooms} style={{ padding: '0.4rem 0.6rem' }} title="تحديث">
                <RefreshCw size={16} className={isLoadingRooms ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {joinError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                marginBottom: '1.25rem',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{joinError}</span>
              </div>
              <button
                onClick={() => setJoinError(null)}
                style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.5rem' }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>
          )}

          {filteredRooms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🀄</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {STRINGS.noPublicRooms}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!user) onLoginClick();
                  else onCreateRoomClick();
                }}
              >
                <PlusCircle size={18} />
                <span>إنشاء أوضة الآن</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredRooms.map((room) => {
                const isFull = room.currentPlayersCount >= room.maxPlayers;
                return (
                  <div key={room.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`badge ${room.mode === GameMode.Individual ? 'badge-mocha' : room.mode === GameMode.Triple ? 'badge-blue' : 'badge-green'}`}>
                            {room.mode === GameMode.Individual ? 'فردي (1v1)' : room.mode === GameMode.Triple ? 'ثلاثي (3P)' : 'رباعي (4P)'}
                          </span>
                          {room.isPrivate && (
                            <span className="badge badge-silver" style={{ gap: '0.25rem' }} title="أوضة محمية برقم سري">
                              <Lock size={11} />
                              <span>مقفولة</span>
                            </span>
                          )}
                        </div>
                        <span className="badge badge-silver" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                          {room.roomCode}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                        {room.name}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        المضيف: <strong style={{ color: '#fff' }}>{room.hostName}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isFull ? '#ef4444' : '#10b981' }}>
                        {room.currentPlayersCount} / {room.maxPlayers} لعيبة
                      </span>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 1.15rem', fontSize: '0.85rem' }}
                        disabled={isFull}
                        onClick={async () => {
                          if (!user) {
                            onLoginClick();
                          } else if (room.isPrivate) {
                            setJoinError(null);
                            setSelectedLockedRoom(room);
                          } else {
                            setJoinError(null);
                            try {
                              await onJoinRoom(room.roomCode);
                            } catch (err: any) {
                              setJoinError(err.message || 'تعذر دخول الأوضة، قد تكون مكتملة أو بدأت بالفعل');
                              fetchRooms();
                            }
                          }
                        }}
                      >
                        {room.isPrivate ? <Lock size={14} /> : <Play size={14} />}
                        <span>{isFull ? 'مكتملة' : room.isPrivate ? 'دخول برقم سري' : 'دخول'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Password-Only Entry Dialog for Locked Rooms selected from the list */}
      <RoomPasswordModal
        isOpen={!!selectedLockedRoom}
        room={selectedLockedRoom}
        onClose={() => setSelectedLockedRoom(null)}
        onJoin={async (roomCode, password) => {
          await onJoinRoom(roomCode, password);
          setSelectedLockedRoom(null);
        }}
      />

      {/* Footer */}
      <footer
        style={{
          background: '#0d0b09',
          borderTop: '1px solid rgba(229, 231, 235, 0.08)',
          padding: '2rem 0',
          textAlign: 'center',
          color: '#8c8278',
          fontSize: '0.9rem'
        }}
      >
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--platinum-silver)', fontWeight: 800 }}>
            <span>🀄</span>
            <span>{STRINGS.appTitle} - لعبة الدومينو المصرية الحقيقية أونلاين</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <span>قوانين اللعب الرسمية</span>
            <span>•</span>
            <span onClick={onAdminClick} style={{ cursor: 'pointer', color: 'var(--platinum-silver)' }}>
              لوحة الأدمن
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#5e564e', marginTop: '0.5rem' }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
};
