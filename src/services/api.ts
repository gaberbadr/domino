import {
  AdminPlayerListResponse,
  BoardEnd,
  CreateRoomRequest,
  GameMatchDto,
  JoinRoomRequest,
  PlayerPrivateStateDto,
  RoomDto,
  UserProfileDto,
  ActiveMatchRecoveryDto,
  VoiceTokenDto
} from '../types/domino';
import { appConfig } from '../config/appConfig';

const API_BASE = appConfig.apiUrl;

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getAccessTokenExpiresAt: () => localStorage.getItem('accessTokenExpiresAt'),
  getRefreshTokenExpiresAt: () => localStorage.getItem('refreshTokenExpiresAt'),
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
    stopProactiveRefresh();
    notifyAuthExpired();
  }
};

/**
 * Extracts expiration timestamp in milliseconds from JWT payload claims.exp
 * with fallback to accessTokenExpiresAt.
 */
export function getAccessTokenExpiration(): number | null {
  const token = tokenStorage.getAccessToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payloadBase64 = parts[1];
      const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const claims = JSON.parse(decodedJson);
      if (typeof claims.exp === 'number') {
        return claims.exp * 1000;
      }
    }
  } catch {
    // Fallback to stored string date
  }

  const storedExpires = tokenStorage.getAccessTokenExpiresAt();
  if (storedExpires) {
    const parsed = new Date(storedExpires).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  return null;
}

export function isAccessTokenExpired(bufferSeconds = 30): boolean {
  const exp = getAccessTokenExpiration();
  if (!exp) return false;
  return Date.now() >= exp - bufferSeconds * 1000;
}

export function getUserFromToken(): { userId: string; fullName: string } | null {
  const token = tokenStorage.getAccessToken();
  if (!token) return null;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decodedJson);
    const userId = claims.uid || claims.nameid || claims.sub || '';
    const fullName = claims.fullname || claims.name || 'لاعب';
    return { userId, fullName };
  } catch {
    return null;
  }
}

// =========================================================================
// SINGLE-FLIGHT TOKEN REFRESH & PERSISTENT AUTHENTICATION
// =========================================================================

let activeRefreshPromise: Promise<string | null> | null = null;
let proactiveTimerId: number | null = null;
let isResumeListenerAttached = false;

type AuthChangeListener = (user: { userId: string; fullName: string } | null) => void;
const authChangeListeners = new Set<AuthChangeListener>();

export function subscribeAuthChange(listener: AuthChangeListener): () => void {
  authChangeListeners.add(listener);
  return () => {
    authChangeListeners.delete(listener);
  };
}

function notifyAuthExpired() {
  authChangeListeners.forEach((listener) => {
    try {
      listener(null);
    } catch {
      // Ignore listener error
    }
  });
}

function notifyAuthUpdated() {
  const user = getUserFromToken();
  authChangeListeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Executes a single-flight Refresh Token exchange.
 * If multiple requests trigger refresh concurrently, they coalesce into
 * this exact promise, preventing token-rotation race conditions.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    tokenStorage.clear();
    return null;
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/Auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        // Refresh token is expired, revoked, or invalid -> clear session cleanly
        if (response.status === 400 || response.status === 401) {
          tokenStorage.clear();
        }
        return null;
      }

      const data = await response.json();
      if (!data.accessToken || !data.refreshToken) {
        tokenStorage.clear();
        return null;
      }

      // Atomically persist rotated tokens and their expiration timestamps
      tokenStorage.setTokens(
        data.accessToken,
        data.refreshToken,
        data.accessTokenExpiresAt,
        data.refreshTokenExpiresAt
      );

      // Reschedule proactive timer based on newly rotated access token
      scheduleProactiveRefresh();
      notifyAuthUpdated();

      return data.accessToken as string;
    } catch (err) {
      // Network offline/glitch: do not clear storage immediately
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export function stopProactiveRefresh() {
  if (proactiveTimerId !== null) {
    clearTimeout(proactiveTimerId);
    proactiveTimerId = null;
  }
}

/**
 * Proactively schedules token refresh shortly before the Access Token expires.
 * Uses exact JWT expiration (exp * 1000) rather than arbitrary intervals.
 */
export function scheduleProactiveRefresh() {
  stopProactiveRefresh();

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return;

  const expMs = getAccessTokenExpiration();
  if (!expMs) return;

  const now = Date.now();
  // Refresh 2 minutes before expiration (or 20% of remaining life if short)
  const leadTimeMs = Math.min(120_000, Math.max(15_000, 0.2 * (expMs - now)));
  const delayMs = Math.max(0, expMs - now - leadTimeMs);

  if (typeof window !== 'undefined') {
    proactiveTimerId = window.setTimeout(async () => {
      proactiveTimerId = null;
      await refreshAccessToken();
    }, delayMs);

    setupResumeListeners();
  }
}

function setupResumeListeners() {
  if (isResumeListenerAttached || typeof window === 'undefined') return;
  isResumeListenerAttached = true;

  const handleResume = async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return;

    const expMs = getAccessTokenExpiration();
    // If token already expired or expiring within 60s, refresh immediately on wake-up
    if (!expMs || Date.now() >= expMs - 60_000) {
      await refreshAccessToken();
    } else {
      scheduleProactiveRefresh();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleResume);
  }
  window.addEventListener('focus', handleResume);
}

// =========================================================================
// CENTRALIZED HTTP CLIENT WITH 401 AUTOMATIC RETRY INTERCEPTOR
// =========================================================================

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
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
    const isAuthEndpoint =
      path.includes('/Auth/refresh-token') ||
      path.includes('/Auth/login') ||
      path.includes('/Auth/google-login');

    // Only attempt refresh for protected application endpoints and only once
    if (!isAuthEndpoint && !isRetry) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry original request exactly once using fresh Access Token
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          if (!(options.body instanceof FormData)) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          return request<T>(path, { ...options, headers: retryHeaders }, true);
        }
      }
    }

    // Refresh was rejected or retry failed -> clear session cleanly
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
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          await fetch(`${API_BASE}/Auth/revoke-refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          }).catch(() => {});
        }
        await request('/Auth/logout', { method: 'POST' }).catch(() => {});
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
      }),
    getActiveMatch: () =>
      request<ActiveMatchRecoveryDto>('/Game/active-match'),
    continueNextRound: (matchId: string) =>
      request<{ success: boolean }>(`/Game/matches/${matchId}/continue-next-round`, {
        method: 'POST'
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
  },

  voice: {
    getToken: (roomCode: string) =>
      request<VoiceTokenDto>('/Voice/token', {
        method: 'POST',
        body: JSON.stringify({ roomCode })
      })
  }
};
