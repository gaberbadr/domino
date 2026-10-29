import React, { useState, useEffect, useCallback } from 'react';
import { api, tokenStorage } from './services/api';
import { signalRService } from './services/signalr';
import {
  UserProfileDto,
  RoomDto,
  GameMatchDto,
  PlayerPrivateStateDto,
  CreateRoomRequest,
  ActiveMatchRecoveryDto
} from './types/domino';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LobbyRoomPage } from './pages/LobbyRoomPage';
import { GamePage } from './pages/GamePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinPrivateModal } from './components/JoinPrivateModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { DominoGlobalDefs } from './components/DominoTileView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfileDto | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<'home' | 'lobby' | 'game' | 'callback'>('home');

  // Room & Match state
  const [activeRoom, setActiveRoom] = useState<RoomDto | null>(null);
  const [activeMatch, setActiveMatch] = useState<GameMatchDto | null>(null);
  const [privateState, setPrivateState] = useState<PlayerPrivateStateDto | null>(null);
  const [recoverableMatch, setRecoverableMatch] = useState<ActiveMatchRecoveryDto | null>(null);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState<boolean>(false);

  // Modals
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinPrivateOpen, setIsJoinPrivateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Load user profile
  const loadProfile = useCallback(async () => {
    try {
      if (tokenStorage.getAccessToken()) {
        const profile = await api.user.getProfile();
        setCurrentUser(profile);
        return profile;
      }
    } catch {
      tokenStorage.clear();
      setCurrentUser(null);
    }
    return null;
  }, []);

  // Check URL on initial load for OAuth callback
  useEffect(() => {
    const search = window.location.search;
    const isCallback = window.location.pathname === '/callback' || search.includes('accessToken=') || search.includes('error=');
    if (isCallback) {
      setCurrentPage('callback');
      return;
    }

    loadProfile();

    // Fetch initial presence
    api.game.getPresence().then((res) => {
      if (res?.onlinePlayersCount !== undefined) {
        setOnlineCount(res.onlinePlayersCount);
      }
    }).catch(() => {});
  }, [loadProfile]);

  // Manage SignalR Connection when user profile is ready
  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;

    const setupSignalR = async () => {
      try {
        const conn = await signalRService.start();
        if (!mounted || !conn) return;

        // Presence update
        conn.on('PresenceUpdated', (count: number) => {
          setOnlineCount(count);
        });

        // Room updated
        conn.on('RoomUpdated', (room: RoomDto) => {
          setActiveRoom((prev) => (prev && prev.id === room.id ? room : prev));
        });

        // Room deleted
        conn.on('RoomDeleted', (_code: string, reason: string) => {
          alert(`تنبيه: ${reason}`);
          setActiveRoom(null);
          setActiveMatch(null);
          setCurrentPage('home');
        });

        // Player kicked
        conn.on('PlayerKicked', (_code: string, message: string) => {
          alert(message);
          setActiveRoom(null);
          setActiveMatch(null);
          setCurrentPage('home');
        });

        // Match Started
        conn.on('MatchStarted', (match: GameMatchDto, privateStateDto: PlayerPrivateStateDto) => {
          setActiveMatch(match);
          setPrivateState(privateStateDto);
          setCurrentPage('game');
        });
      } catch (err) {
        console.warn('SignalR start error:', err);
      }
    };

    setupSignalR();

    // Check for active recoverable match
    api.game.getActiveMatch().then((res) => {
      if (res && res.match && res.match.id) {
        setRecoverableMatch(res);
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Clean SignalR disconnect on browser tab closure
  useEffect(() => {
    const handleTabClosure = () => {
      signalRService.stop().catch(() => {});
    };
    window.addEventListener('beforeunload', handleTabClosure);
    window.addEventListener('pagehide', handleTabClosure);
    return () => {
      window.removeEventListener('beforeunload', handleTabClosure);
      window.removeEventListener('pagehide', handleTabClosure);
    };
  }, []);

  // Resume active recoverable match
  const handleResumeActiveMatch = async () => {
    if (!recoverableMatch || isProcessingRecovery) return;
    setIsProcessingRecovery(true);
    try {
      try {
        const room = await api.game.getRoom(recoverableMatch.roomCode);
        setActiveRoom(room);
      } catch {
        setActiveRoom({
          id: recoverableMatch.match.id,
          roomCode: recoverableMatch.roomCode,
          name: 'مباراة جارية',
          mode: recoverableMatch.match.mode,
          isPrivate: false,
          maxPlayers: 2,
          currentPlayersCount: 2,
          hostId: '',
          hostName: '',
          status: 1 as any,
          players: []
        });
      }

      // Fetch freshest authoritative snapshot from server
      let finalMatch = recoverableMatch.match;
      let finalPrivateState = recoverableMatch.privateState;
      try {
        const fresh = await api.game.getMatchState(recoverableMatch.match.id);
        if (fresh?.match) {
          finalMatch = fresh.match;
          if (fresh.privateState) finalPrivateState = fresh.privateState;
        }
      } catch (err) {
        console.warn('Using recovery snapshot:', err);
      }

      setActiveMatch(finalMatch);
      setPrivateState(finalPrivateState);
      setCurrentPage('game');
      await signalRService.joinRoomGroup(recoverableMatch.roomCode);
      setRecoverableMatch(null);
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Abandon active match and leave room
  const handleAbandonActiveMatch = async () => {
    if (!recoverableMatch || isProcessingRecovery) return;
    setIsProcessingRecovery(true);
    try {
      await api.game.leaveRoom(recoverableMatch.roomCode);
      await signalRService.leaveRoomGroup(recoverableMatch.roomCode);
      setRecoverableMatch(null);
    } catch (err) {
      console.error('Failed to leave match:', err);
      alert('تعذر مغادرة المباراة حالياً، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Explicit exit from in-game
  const handleExitGame = async () => {
    if (activeRoom) {
      try {
        await api.game.leaveRoom(activeRoom.roomCode);
        await signalRService.leaveRoomGroup(activeRoom.roomCode);
      } catch (err) {
        console.warn('Error leaving room on exit:', err);
      }
    }
    setActiveMatch(null);
    setActiveRoom(null);
    setPrivateState(null);
    setRecoverableMatch(null);
    setCurrentPage('home');
  };

  // Handle Create Room
  const handleCreateRoom = async (data: CreateRoomRequest) => {
    const room = await api.game.createRoom(data);
    setActiveRoom(room);
    setCurrentPage('lobby');
    await signalRService.joinRoomGroup(room.roomCode);
  };

  // Handle Join Room
  const handleJoinRoom = async (roomCode: string, password?: string) => {
    const room = await api.game.joinRoom({ roomCode, password });
    setActiveRoom(room);
    setCurrentPage('lobby');
    await signalRService.joinRoomGroup(room.roomCode);
  };

  // Handle Leave Room
  const handleLeaveRoom = async () => {
    if (activeRoom) {
      await api.game.leaveRoom(activeRoom.roomCode);
      await signalRService.leaveRoomGroup(activeRoom.roomCode);
    }
    setActiveRoom(null);
    setCurrentPage('home');
  };

  // Handle Start Match
  const handleStartMatch = async () => {
    if (!activeRoom) return;
    const match = await api.game.startMatch(activeRoom.roomCode);
    setActiveMatch(match);
    // Private state will arrive through SignalR MatchStarted event, or can be fetched
    try {
      const state = await api.game.getMatchState(match.id);
      setActiveMatch(state.match);
      setPrivateState(state.privateState);
      setCurrentPage('game');
    } catch {
      // Handled by SignalR event
    }
  };

  // Handle Kick Player
  const handleKickPlayer = async (targetUserId: string) => {
    if (activeRoom) {
      await api.game.kickPlayer(activeRoom.roomCode, targetUserId);
    }
  };

  // Handle Delete Room
  const handleDeleteRoom = async () => {
    if (activeRoom) {
      if (confirm('هل أنت متأكد من حذف هذه الأوضة؟')) {
        await api.game.deleteRoom(activeRoom.roomCode);
        setActiveRoom(null);
        setCurrentPage('home');
      }
    }
  };

  // Handle Update Display Name
  const handleUpdateDisplayName = async (newName: string) => {
    await api.user.updateDisplayName(newName);
    if (currentUser) {
      setCurrentUser({ ...currentUser, fullName: newName });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DominoGlobalDefs />
      {/* Navigation Header (Shown on Home, Lobby, Admin, Profile) */}
      {currentPage !== 'game' && (
        <Navbar
          user={currentUser}
          onlineCount={onlineCount}
          onLoginClick={() => api.auth.initiateGoogleLogin()}
          onLogoutClick={async () => {
            await api.auth.logout();
            await signalRService.stop();
            setCurrentUser(null);
            setCurrentPage('home');
          }}
          onEditProfileClick={() => setIsProfileOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
          onLogoClick={() => {
            setCurrentPage('home');
          }}
        />
      )}

      {/* Pages View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'callback' && (
          <AuthCallbackPage
            onSuccess={async () => {
              await loadProfile();
              setCurrentPage('home');
            }}
            onError={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'home' && (
          <HomePage
            user={currentUser}
            onlineCount={onlineCount}
            onCreateRoomClick={() => setIsCreateRoomOpen(true)}
            onJoinPrivateClick={() => setIsJoinPrivateOpen(true)}
            onJoinRoom={(code, pwd) => handleJoinRoom(code, pwd)}
            onLoginClick={() => api.auth.initiateGoogleLogin()}
            onAdminClick={() => setIsAdminOpen(true)}
          />
        )}

        {currentPage === 'lobby' && activeRoom && currentUser && (
          <LobbyRoomPage
            room={activeRoom}
            currentUser={currentUser}
            onStartMatch={handleStartMatch}
            onLeaveRoom={handleLeaveRoom}
            onKickPlayer={handleKickPlayer}
            onDeleteRoom={handleDeleteRoom}
          />
        )}

        {currentPage === 'game' && activeMatch && privateState && currentUser && activeRoom && (
          <GamePage
            initialMatch={activeMatch}
            initialPrivateState={privateState}
            currentUser={currentUser}
            roomCode={activeRoom.roomCode}
            onExitGame={handleExitGame}
          />
        )}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreate={handleCreateRoom}
      />

      <JoinPrivateModal
        isOpen={isJoinPrivateOpen}
        onClose={() => setIsJoinPrivateOpen(false)}
        onJoin={handleJoinRoom}
      />

      {currentUser && (
        <ProfileModal
          currentName={currentUser.fullName}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onSave={handleUpdateDisplayName}
        />
      )}

      {currentUser?.isAdmin && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* Recoverable Active Match Prompt Modal */}
      {recoverableMatch && currentPage !== 'game' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
                مباراة جارية 🎲
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                أنت ما زلت في مباراة جارية. ماذا تريد أن تفعل؟
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleResumeActiveMatch}
                  disabled={isProcessingRecovery}
                  style={{
                    padding: '0.85rem 1rem',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    opacity: isProcessingRecovery ? 0.7 : 1,
                    cursor: isProcessingRecovery ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isProcessingRecovery ? 'جاري التحميل...' : 'العودة إلى المباراة'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleAbandonActiveMatch}
                  disabled={isProcessingRecovery}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.95rem',
                    color: '#f87171',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    opacity: isProcessingRecovery ? 0.7 : 1,
                    cursor: isProcessingRecovery ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isProcessingRecovery ? 'جاري الانسحاب...' : 'مغادرة المباراة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
