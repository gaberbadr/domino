import {
  AdminPlayerListResponse,
  BoardEnd,
  CreateRoomRequest,
  GameMatchDto,
  JoinRoomRequest,
  PlayerPrivateStateDto,
  RoomDto,
  UserProfileDto
} from '../types/domino';
import { appConfig } from '../config/appConfig';

const API_BASE = appConfig.apiUrl;

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access: string, refresh: string, accessExpires?: string, refreshExpires?: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    if (accessExpires) localStorage.setItem('accessTokenExpiresAt', accessExpires);
    if (refreshExpires) localStorage.setItem('refreshTokenExpiresAt', refreshExpires);
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessTokenExpiresAt');
    localStorage.removeItem('refreshTokenExpiresAt');
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Attempt refresh token once
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken && !path.includes('/Auth/refresh-token')) {
      try {
        const refreshRes = await fetch(`${API_BASE}/Auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          tokenStorage.setTokens(data.accessToken, data.refreshToken);
          // Retry original request with new token
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          const retryRes = await fetch(url, { ...options, headers });
          if (retryRes.ok) {
            return (await retryRes.json()) as T;
          }
        }
      } catch {
        tokenStorage.clear();
      }
    }
    tokenStorage.clear();
    throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مجدداً');
  }

  if (response.status === 403) {
    throw new Error('تم حظر هذا الحساب أو ليس لديك صلاحية');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.title || `خطأ في الطلب (${response.status})`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    initiateGoogleLogin: (returnPath = '/callback') => {
      const returnUrl = `${window.location.origin}${returnPath}`;
      window.location.href = `${API_BASE}/Auth/google-login?returnUrl=${encodeURIComponent(returnUrl)}`;
    },
    logout: async () => {
      try {
        await request('/Auth/logout', { method: 'POST' });
      } finally {
        tokenStorage.clear();
      }
    }
  },

  user: {
    getProfile: () => request<UserProfileDto>('/User/me'),
    updateDisplayName: (fullName: string) =>
      request<{ message: string; fullName: string }>('/User/me/display-name', {
        method: 'PUT',
        body: JSON.stringify({ fullName })
      })
  },

  game: {
    getPresence: () => request<{ onlinePlayersCount: number }>('/Game/presence'),
    getPublicRooms: () => request<RoomDto[]>('/Game/rooms/public'),
    getRoom: (roomCode: string) => request<RoomDto>(`/Game/rooms/${roomCode}`),
    createRoom: (data: CreateRoomRequest) =>
      request<RoomDto>('/Game/rooms', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    joinRoom: (data: JoinRoomRequest) =>
      request<RoomDto>('/Game/rooms/join', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    leaveRoom: (roomCode: string) =>
      request<{ success: boolean }>(`/Game/rooms/${roomCode}/leave`, {
        method: 'POST'
      }),
    kickPlayer: (roomCode: string, targetUserId: string) =>
      request<{ success: boolean }>(`/Game/rooms/${roomCode}/kick/${targetUserId}`, {
        method: 'POST'
      }),
    deleteRoom: (roomCode: string) =>
      request<{ success: boolean }>(`/Game/rooms/${roomCode}`, {
        method: 'DELETE'
      }),
    startMatch: (roomCode: string) =>
      request<GameMatchDto>(`/Game/rooms/${roomCode}/start`, {
        method: 'POST'
      }),
    getMatchState: (matchId: string) =>
      request<{ match: GameMatchDto; privateState: PlayerPrivateStateDto }>(`/Game/matches/${matchId}`),
    playTile: (matchId: string, tileId: number, chosenEnd?: BoardEnd) =>
      request<{ success: boolean }>('/Game/matches/play', {
        method: 'POST',
        body: JSON.stringify({ matchId, tileId, chosenEnd })
      }),
    drawTile: (matchId: string) =>
      request<{ drawnTile?: any }>(`/Game/matches/${matchId}/draw`, {
        method: 'POST'
      }),
    skipTurn: (matchId: string) =>
      request<{ success: boolean }>(`/Game/matches/${matchId}/skip`, {
        method: 'POST'
      }),
    requestTeammateStart: (matchId: string) =>
      request<{ success: boolean }>(`/Game/matches/${matchId}/teammate-start-request`, {
        method: 'POST'
      }),
    approveTeammateStart: (matchId: string, approved: boolean) =>
      request<{ success: boolean }>(`/Game/matches/${matchId}/teammate-start-approval`, {
        method: 'POST',
        body: JSON.stringify({ matchId, approved })
      })
  },

  admin: {
    getPlayers: (search?: string, status?: string, page = 1, pageSize = 20) => {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (status && status !== 'all') query.set('status', status);
      query.set('page', page.toString());
      query.set('pageSize', pageSize.toString());
      return request<AdminPlayerListResponse>(`/Admin/players?${query.toString()}`);
    },
    blockPlayer: (userId: string) =>
      request<{ message: string }>(`/Admin/players/${userId}/block`, {
        method: 'POST'
      }),
    unblockPlayer: (userId: string) =>
      request<{ message: string }>(`/Admin/players/${userId}/unblock`, {
        method: 'POST'
      })
  }
};
