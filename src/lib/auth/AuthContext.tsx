import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { saveTokens, clearTokens, getAccessToken } from './tokenStore';
import { setAuthExpiredHandler } from '../api/client';
import { apiGetMe } from '../api/profile';
import { track, identifyUser, resetAnalytics } from '../analytics';

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
        track('login_success', { provider: me.provider });
      })
      .catch(() => track('login_success'));
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSignedIn(false);
    resetAnalytics();
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
