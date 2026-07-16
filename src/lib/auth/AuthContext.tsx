import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from './tokenStore';
import { apiFetch, setAuthExpiredHandler } from '../api/client';
import { apiGetMe } from '../api/profile';
import { track, identifyUser, resetAnalytics } from '../analytics';
import { logInPurchases, logOutPurchases } from '../purchases';
import { clearPushTokenCache } from '../notifications';

interface AuthState {
  loading: boolean;
  signedIn: boolean;
  signInWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // refresh 만료/무효 시 client가 호출 → 앱 전체를 로그인 화면으로 전파
    setAuthExpiredHandler(() => setSignedIn(false));
    (async () => {
      const t = await getAccessToken();
      setSignedIn(!!t);
      setLoading(false);
    })();
    return () => setAuthExpiredHandler(null);
  }, []);

  const signInWithTokens = useCallback(async (a: string, r: string) => {
    await saveTokens(a, r);
    setSignedIn(true);
    // 유저 단위 분석을 위해 /me에서 id·provider 조회 후 identify.
    // 로그인 전환은 이미 끝났으니 백그라운드로 처리(실패해도 익명 기록으로 폴백).
    apiGetMe()
      .then((me) => {
        identifyUser(me.id);
        // RC appUserID를 우리 user id로 통일(크로스디바이스 구독 복원). 키 없으면 no-op.
        logInPurchases(me.id);
        track('login_success', { provider: me.provider });
      })
      .catch(() => track('login_success'));
  }, []);

  const signOut = useCallback(async () => {
    // 감사 #7: 서버측 refresh token 폐기 — 로컬만 지우면 탈취 토큰이 30일간 회전 가능.
    // 오프라인이어도 로컬 로그아웃은 항상 진행(베스트에포트).
    try {
      const rt = await getRefreshToken();
      if (rt) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: rt }),
        });
      }
    } catch {
      // 무시 — 로컬 로그아웃은 계속
    }
    await clearTokens();
    setSignedIn(false);
    resetAnalytics();
    // 감사 #8: 푸시 토큰 캐시 초기화 — 다음 로그인 유저가 재등록해 토큰 소유자를 넘겨받도록
    await clearPushTokenCache();
    // RC 익명 appUserID로 리셋. 키 없으면 no-op.
    logOutPurchases();
  }, []);

  return (
    <Ctx.Provider value={{ loading, signedIn, signInWithTokens, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
};
