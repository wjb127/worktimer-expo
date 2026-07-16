import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPremium } from './purchases';
import { apiGetSubscription } from './api/profile';

// 프리미엄 접근 판정 — 3단 폴백 (전부 fail-safe, 오검출 없음):
// ① 로컬 체험 언락(스토어 결제 오픈 전 임시 — RC 오퍼링 붙으면 진짜 트라이얼로 교체)
// ② RevenueCat entitlement("premium")
// ③ 서버 /me/subscription (RC 웹훅 진실원장)
const LOCAL_TRIAL_KEY = 'premium_local_trial_v1';

export async function getPremiumStatus(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(LOCAL_TRIAL_KEY)) === '1') return true;
  } catch {
    // 무시 — 다음 단계로
  }
  if (await hasPremium()) return true;
  try {
    const sub = await apiGetSubscription();
    return sub.isPremium;
  } catch {
    return false;
  }
}

// [deprecated] 결제 오픈 전 로컬 언락 — 07-16 스토어 상품/오퍼링 오픈으로 신규 지급 중단.
// (감사 #3: 오퍼링 조회 실패가 영구 무료 프리미엄이 되는 문제 — PaywallModal에서 호출 제거됨)
// 기존 플래그 보유자(초기 체험 유저)는 getPremiumStatus가 계속 인정(grandfather).
export async function startLocalTrial(): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_TRIAL_KEY, '1');
  } catch {
    // 무시
  }
}

// 화면용 훅 — 마운트 시 판정 + refresh 제공
export function usePremium(): {
  isPremium: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    let cancelled = false;
    getPremiumStatus()
      .then((v) => {
        if (!cancelled) setIsPremium(v);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    return cancel;
  }, [refresh]);

  return { isPremium, loading, refresh };
}
