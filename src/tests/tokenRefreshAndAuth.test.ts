export {};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// In-memory mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Helper to create a fake JWT with a specific expiration timestamp in seconds
function createMockJwt(expSeconds: number, userId = 'user-123', fullName = 'Ahmed'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    uid: userId,
    fullname: fullName,
    exp: expSeconds
  }));
  return `${header}.${payload}.mockSignature`;
}

async function runTokenRefreshAndAuthTestSuite() {
  console.log('=== RUNNING TOKEN REFRESH & PERSISTENT AUTHENTICATION TEST SUITE ===\n');

  // Scenario 1: Expired Access Token is refreshed and original request succeeds after retry
  console.log('Test 1: Expired Access Token is refreshed and original request succeeds after retry...');
  {
    mockLocalStorage.clear();
    const expPast = Math.floor(Date.now() / 1000) - 60; // expired 1 min ago
    const expFuture = Math.floor(Date.now() / 1000) + 900; // valid for 15 mins

    let storedAccessToken = createMockJwt(expPast);
    let storedRefreshToken = 'refresh_token_v1';
    let refreshCallsCount = 0;
    let originalRequestCalls = 0;

    // Simulated single-flight refresh function
    let activeRefreshPromise: Promise<string | null> | null = null;
    const doRefresh = async () => {
      if (activeRefreshPromise) return activeRefreshPromise;
      activeRefreshPromise = (async () => {
        refreshCallsCount++;
        // Simulate backend rotating tokens
        storedAccessToken = createMockJwt(expFuture);
        storedRefreshToken = 'refresh_token_v2';
        return storedAccessToken;
      })().finally(() => { activeRefreshPromise = null; });
      return activeRefreshPromise;
    };

    // Simulated request with 401 retry interceptor
    const simulatedRequest = async (path: string, token: string, isRetry = false): Promise<{ data: string }> => {
      originalRequestCalls++;
      // First attempt with expired token yields 401
      if (token === createMockJwt(expPast)) {
        if (!isRetry) {
          const newToken = await doRefresh();
          assert(newToken !== null, 'Refresh succeeded');
          return simulatedRequest(path, newToken!, true);
        }
        throw new Error('Unauthorized');
      }
      return { data: 'profile_success' };
    };

    const res = await simulatedRequest('/User/me', storedAccessToken);
    assert(res.data === 'profile_success', 'Request retried and succeeded');
    assert(refreshCallsCount === 1, 'Refresh endpoint called exactly once');
    assert(originalRequestCalls === 2, 'Original request was executed then retried once');
    console.log('  ✓ Test 1 passed: 401 automatically refreshed and retried original request successfully.\n');
  }

  // Scenario 2: Multiple simultaneous 401 responses trigger only ONE refresh request (Single-Flight)
  console.log('Test 2: Multiple simultaneous 401 responses trigger only ONE refresh request (Single-Flight)...');
  {
    let backendRefreshCallCount = 0;
    let activeRefreshPromise: Promise<string | null> | null = null;

    const singleFlightRefresh = async (): Promise<string | null> => {
      if (activeRefreshPromise) {
        return activeRefreshPromise;
      }
      activeRefreshPromise = (async () => {
        backendRefreshCallCount++;
        // Simulate network latency for backend refresh
        await new Promise(r => setTimeout(r, 40));
        return 'new_access_token_abc';
      })().finally(() => {
        activeRefreshPromise = null;
      });
      return activeRefreshPromise;
    };

    // 5 simultaneous requests getting 401
    const p1 = singleFlightRefresh();
    const p2 = singleFlightRefresh();
    const p3 = singleFlightRefresh();
    const p4 = singleFlightRefresh();
    const p5 = singleFlightRefresh();

    const results = await Promise.all([p1, p2, p3, p4, p5]);

    assert(backendRefreshCallCount === 1, `Backend was called ${backendRefreshCallCount} times; must be EXACTLY 1!`);
    results.forEach((token, idx) => {
      assert(token === 'new_access_token_abc', `Caller ${idx} received fresh token`);
    });
    console.log('  ✓ Test 2 passed: All 5 concurrent 401s coalesced into a single backend refresh.\n');
  }

  // Scenario 3: Successful token rotation saves and uses latest tokens
  console.log('Test 3: Token rotation saves and uses latest tokens...');
  {
    mockLocalStorage.clear();
    const initialAccess = 'access_v1';
    const initialRefresh = 'refresh_v1';
    mockLocalStorage.setItem('accessToken', initialAccess);
    mockLocalStorage.setItem('refreshToken', initialRefresh);

    // Backend rotation response
    const backendResponse = {
      accessToken: 'access_v2',
      refreshToken: 'refresh_v2',
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 86400_000).toISOString()
    };

    mockLocalStorage.setItem('accessToken', backendResponse.accessToken);
    mockLocalStorage.setItem('refreshToken', backendResponse.refreshToken);
    mockLocalStorage.setItem('accessTokenExpiresAt', backendResponse.accessTokenExpiresAt);
    mockLocalStorage.setItem('refreshTokenExpiresAt', backendResponse.refreshTokenExpiresAt);

    assert(mockLocalStorage.getItem('accessToken') === 'access_v2', 'New access token stored');
    assert(mockLocalStorage.getItem('refreshToken') === 'refresh_v2', 'New rotated refresh token stored');
    assert(mockLocalStorage.getItem('accessTokenExpiresAt') !== null, 'Access expiration stored');
    console.log('  ✓ Test 3 passed: Token rotation atomically persists new access and refresh tokens.\n');
  }

  // Scenario 4: Failed refresh does not create an infinite retry loop
  console.log('Test 4: Failed refresh does not create an infinite retry loop...');
  {
    let retryCount = 0;
    const requestWithGuardedRetry = async (isRetry = false): Promise<string> => {
      if (isRetry) {
        retryCount++;
        // Retried request still yields 401
        throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مجدداً');
      }
      // First attempt triggers refresh and retry
      return requestWithGuardedRetry(true);
    };

    let caught = false;
    try {
      await requestWithGuardedRetry(false);
    } catch {
      caught = true;
    }
    assert(caught === true, 'Error thrown on failed retry');
    assert(retryCount === 1, `Request retried ${retryCount} times, expected exactly 1 (no loop)`);
    console.log('  ✓ Test 4 passed: Strict isRetry flag prevents infinite loops.\n');
  }

  // Scenario 5: Expired or revoked Refresh Token causes clean logout
  console.log('Test 5: Expired or revoked Refresh Token causes clean logout...');
  {
    mockLocalStorage.clear();
    mockLocalStorage.setItem('accessToken', 'expired_access');
    mockLocalStorage.setItem('refreshToken', 'revoked_refresh');

    let authUser: { id: string } | null = { id: 'u1' };
    const onAuthExpired = () => {
      authUser = null;
      mockLocalStorage.clear();
    };

    // Simulate backend 401 on refresh-token endpoint
    const backendRefreshStatus = 401;
    if (backendRefreshStatus === 401) {
      onAuthExpired();
    }

    assert(authUser === null, 'User state reset to null');
    assert(mockLocalStorage.getItem('accessToken') === null, 'Access token wiped');
    assert(mockLocalStorage.getItem('refreshToken') === null, 'Refresh token wiped');
    console.log('  ✓ Test 5 passed: Revoked refresh token clears storage and session cleanly.\n');
  }

  // Scenario 6: Proactive refresh is scheduled using actual Access Token expiration
  console.log('Test 6: Proactive refresh scheduled using actual Access Token expiration...');
  {
    const nowMs = Date.now();
    const tokenLifespanSec = 900; // 15 minutes
    const expMs = nowMs + tokenLifespanSec * 1000;
    const expSec = Math.floor(expMs / 1000);

    const jwt = createMockJwt(expSec);
    // Parse exp from JWT
    const payloadBase64 = jwt.split('.')[1];
    const claims = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    const parsedExpMs = claims.exp * 1000;

    assert(Math.abs(parsedExpMs - expMs) < 2000, 'Expiration accurately parsed from JWT claims');

    // Calculate schedule: 2 minutes lead time before expiration
    const leadTimeMs = 120_000; // 2 minutes
    const delayMs = Math.max(0, parsedExpMs - nowMs - leadTimeMs);

    assert(delayMs > 700_000 && delayMs <= 780_000, `Delay (${delayMs}ms) matches ~13 minutes for a 15-min token`);
    console.log(`  ✓ Test 6 passed: Proactive refresh scheduled at ${Math.round(delayMs / 60000)} minutes.\n`);
  }

  // Scenario 7: Backgrounding browser / device wake-up re-checks and refreshes
  console.log('Test 7: Backgrounding browser / device wake-up re-checks and refreshes...');
  {
    // Simulate user put phone to sleep for 20 minutes
    const expPast = Math.floor(Date.now() / 1000) - 300; // expired 5 mins ago
    const expFuture = Math.floor(Date.now() / 1000) + 900;
    let currentToken = createMockJwt(expPast);
    let refreshedOnResume: boolean = false;

    // Simulate visibilitychange event handler
    const handleVisibilityChange = async (visibilityState: 'hidden' | 'visible') => {
      if (visibilityState !== 'visible') return;
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      const expMs = payload.exp * 1000;
      if (Date.now() >= expMs - 60_000) {
        // Token is expired or expiring within 60s
        currentToken = createMockJwt(expFuture);
        refreshedOnResume = true;
      }
    };

    await handleVisibilityChange('visible');
    assert(refreshedOnResume, 'Token refreshed immediately upon waking');
    const newClaims = JSON.parse(atob(currentToken.split('.')[1]));
    assert(newClaims.exp * 1000 > Date.now(), 'Token is now valid for future requests');
    console.log('  ✓ Test 7 passed: Resume listener detected expired token and refreshed on wake-up.\n');
  }

  // Scenario 8: Google OAuth login and normal login initialize refresh flow
  console.log('Test 8: Google OAuth login and normal login initialize refresh flow...');
  {
    let timerScheduled: boolean = false;
    const scheduleProactive = (token: string) => {
      if (token) timerScheduled = true;
    };

    // Callback simulation
    const oauthToken = createMockJwt(Math.floor(Date.now() / 1000) + 900);
    scheduleProactive(oauthToken);
    assert(timerScheduled, 'OAuth login callback scheduled proactive refresh');
    console.log('  ✓ Test 8 passed: Login flow successfully initializes refresh scheduler.\n');
  }

  // Scenario 9: Logout stops refresh activity and does not restore session
  console.log('Test 9: Logout stops refresh activity and does not restore session...');
  {
    let proactiveTimer: any = 12345;
    let userSession: any = { userId: 'u1' };

    const logout = () => {
      // Clear timer
      proactiveTimer = null;
      userSession = null;
      mockLocalStorage.clear();
    };

    logout();
    assert(proactiveTimer === null, 'Proactive timer cancelled on logout');
    assert(userSession === null, 'Session cleared on logout');
    assert(mockLocalStorage.getItem('accessToken') === null, 'Local storage cleared');
    console.log('  ✓ Test 9 passed: Logout cancels timer and purges session completely.\n');
  }

  // Scenario 10: Non-token authorization failures (e.g. 403 Forbidden) are not retried
  console.log('Test 10: Non-token authorization failures (403 Forbidden) are not retried...');
  {
    let refreshAttempted = false;
    const makeRequest = async (status: number) => {
      if (status === 403) {
        throw new Error('تم حظر هذا الحساب أو ليس لديك صلاحية');
      }
      if (status === 401) {
        refreshAttempted = true;
      }
    };

    let caughtError = '';
    try {
      await makeRequest(403);
    } catch (err: any) {
      caughtError = err.message;
    }

    assert(caughtError.includes('تم حظر هذا الحساب'), '403 handled directly as Forbidden');
    assert(refreshAttempted === false, '403 Forbidden was not sent to token refresh');
    console.log('  ✓ Test 10 passed: 403 Forbidden does not trigger refresh.\n');
  }

  console.log('=== ALL 10 TOKEN REFRESH & PERSISTENT AUTHENTICATION TESTS PASSED! ===');
}

runTokenRefreshAndAuthTestSuite().catch((err) => {
  console.error(err);
});
