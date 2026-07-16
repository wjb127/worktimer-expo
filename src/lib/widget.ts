import { Platform } from 'react-native';
import { getTodayTotal } from './session';
import { apiGetStats } from './api/profile';
import { getAccessToken } from './auth/tokenStore';

// 홈화면 위젯 데이터 공급 — analytics/purchases와 같은 fail-safe 원칙.
// 어떤 단계가 실패해도(미로그인·네트워크·구빌드에 네이티브 모듈 없음) 절대 throw하지 않는다.

const APP_GROUP = 'group.kr.codeatlas.worktimer'; // iOS App Group (targets/widget과 동일)

export interface WidgetData {
  todayText: string;
  weekText: string;
  streakText: string;
}

// 초 → "N시간 M분" (0이면 "0분")
export function formatWidgetDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

// 위젯에 표시할 데이터 수집 (미로그인이면 안내 문구)
export async function fetchWidgetData(): Promise<WidgetData> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { todayText: '로그인하고 시작', weekText: '오늘의 몰입을 기록해보세요', streakText: '' };
    }
    const [todaySeconds, stats] = await Promise.all([
      getTodayTotal(),
      apiGetStats().catch(() => null),
    ]);
    return {
      todayText: formatWidgetDuration(todaySeconds),
      weekText: stats ? `이번 주 ${formatWidgetDuration(stats.thisWeekSeconds)}` : '',
      streakText:
        stats && stats.currentStreakDays > 0 ? `${stats.currentStreakDays}일 연속` : '',
    };
  } catch {
    return { todayText: '0분', weekText: '', streakText: '' };
  }
}

// 위젯 즉시 갱신 — 세션 시작/종료, 앱 포그라운드 진입 시 호출. fire-and-forget 안전.
// 네이티브 모듈은 새 빌드에만 존재하므로 dynamic import + try/catch (구빌드에선 조용히 no-op).
export async function publishWidgetData(): Promise<void> {
  try {
    const data = await fetchWidgetData();

    if (Platform.OS === 'ios') {
      const { ExtensionStorage } = await import('@bacons/apple-targets');
      const storage = new ExtensionStorage(APP_GROUP);
      storage.set('todayText', data.todayText);
      storage.set('weekText', data.weekText);
      storage.set('streakText', data.streakText);
      ExtensionStorage.reloadWidget(); // 전체 위젯 타임라인 리로드
      return;
    }

    // Android — 홈에 위젯이 없으면 widgetNotFound로 조용히 종료
    const React = await import('react');
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { FilltimeWidget } = await import('../widgets/FilltimeWidget');
    await requestWidgetUpdate({
      widgetName: 'Filltime',
      renderWidget: () => React.createElement(FilltimeWidget, data),
      widgetNotFound: () => {},
    });
  } catch {
    // 위젯 갱신 실패가 앱 흐름을 막지 않는다 (구빌드/모듈없음/네트워크 전부 무해)
  }
}
