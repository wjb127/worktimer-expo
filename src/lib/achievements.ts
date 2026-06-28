import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { MeStats } from './api/profile';

// 업적 시스템 — 서버 변경 없이 MeStats(/me/stats)로 클라에서 달성 판정.
// 마일스톤 트리거 공유의 기반.

export type AchievementCategory = 'total' | 'streak' | 'sessions';

export interface Achievement {
  id: string;
  category: AchievementCategory;
  threshold: number; // total=초, streak=일, sessions=회
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface AchievementState extends Achievement {
  unlocked: boolean;
  currentValue: number;
  progress: number; // 0~1
}

const H = 3600;

export const ACHIEVEMENTS: Achievement[] = [
  // 누적 몰입 시간
  { id: 'total-10h', category: 'total', threshold: 10 * H, title: '첫 10시간', desc: '누적 10시간 몰입', icon: 'flame-outline' },
  { id: 'total-50h', category: 'total', threshold: 50 * H, title: '50시간', desc: '누적 50시간 몰입', icon: 'flame' },
  { id: 'total-100h', category: 'total', threshold: 100 * H, title: '100시간', desc: '누적 100시간 돌파', icon: 'flame' },
  { id: 'total-500h', category: 'total', threshold: 500 * H, title: '500시간', desc: '누적 500시간 몰입', icon: 'bonfire-outline' },
  { id: 'total-1000h', category: 'total', threshold: 1000 * H, title: '1,000시간', desc: '누적 1,000시간 — 전문가의 영역', icon: 'bonfire' },
  { id: 'total-2000h', category: 'total', threshold: 2000 * H, title: '2,000시간', desc: '누적 2,000시간 — 경지', icon: 'planet' },

  // 연속 기록 (최장 스트릭 기준 — 한 번 달성하면 유지)
  { id: 'streak-7', category: 'streak', threshold: 7, title: '일주일 연속', desc: '7일 연속 기록', icon: 'calendar-outline' },
  { id: 'streak-30', category: 'streak', threshold: 30, title: '한 달 연속', desc: '30일 연속 기록', icon: 'calendar' },
  { id: 'streak-100', category: 'streak', threshold: 100, title: '100일 연속', desc: '100일 연속 — 습관의 완성', icon: 'ribbon-outline' },
  { id: 'streak-365', category: 'streak', threshold: 365, title: '1년 연속', desc: '365일 연속 — 전설', icon: 'trophy' },

  // 세션 수
  { id: 'sessions-50', category: 'sessions', threshold: 50, title: '50세션', desc: '누적 50회 기록', icon: 'checkmark-circle-outline' },
  { id: 'sessions-100', category: 'sessions', threshold: 100, title: '100세션', desc: '누적 100회 기록', icon: 'checkmark-circle' },
  { id: 'sessions-500', category: 'sessions', threshold: 500, title: '500세션', desc: '누적 500회 기록', icon: 'medal-outline' },
  { id: 'sessions-1000', category: 'sessions', threshold: 1000, title: '1,000세션', desc: '누적 1,000회 — 꾸준함의 증거', icon: 'medal' },
];

function valueFor(category: AchievementCategory, stats: MeStats): number {
  switch (category) {
    case 'total':
      return stats.totalSeconds;
    case 'streak':
      return stats.longestStreakDays; // 최장 기준 (달성 후 유지)
    case 'sessions':
      return stats.totalSessions;
  }
}

export function computeAchievements(stats: MeStats): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const cur = valueFor(a.category, stats);
    return {
      ...a,
      currentValue: cur,
      unlocked: cur >= a.threshold,
      progress: Math.max(0, Math.min(1, cur / a.threshold)),
    };
  });
}

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  total: '몰입 시간',
  streak: '연속 기록',
  sessions: '세션 수',
};

// ── 마일스톤 감지 (이미 본 업적을 AsyncStorage에 저장, 새 달성만 반환) ──

const SEEN_KEY = '@achievements/seen';

async function getSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function saveSeen(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    // 무시
  }
}

// 첫 실행 시 기존 달성분은 "이미 본 것"으로 흡수(과거 업적이 한꺼번에 터지는 것 방지).
// 이후부터 새로 달성되는 업적만 마일스톤으로 반환.
export async function checkNewMilestones(stats: MeStats): Promise<Achievement[]> {
  const unlocked = computeAchievements(stats).filter((a) => a.unlocked);
  const unlockedIds = unlocked.map((a) => a.id);
  const seen = await getSeen();

  // 최초 실행(seen 비어있음) → 전부 흡수, 알림 X
  if (seen.size === 0) {
    await saveSeen(new Set(unlockedIds));
    return [];
  }

  const fresh = unlocked.filter((a) => !seen.has(a.id));
  if (fresh.length > 0) {
    fresh.forEach((a) => seen.add(a.id));
    await saveSeen(seen);
  }
  return fresh;
}
