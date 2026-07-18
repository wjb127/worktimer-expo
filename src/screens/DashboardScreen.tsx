import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiListSessions } from '../lib/api/sessions';
import { formatDateString } from '../lib/dateUtils';
import { colors } from '../theme/colors';

// 상세 분석 대시보드 — DoD(일간)/WoW(주간)/MoM(월간)/YoY(연간) 변화 + 최근 추세.
// 전부 세션 목록(KST date)에서 클라이언트 집계 → 백엔드 변경 없이 OTA로 배포.
// 기기 로컬(=KST 사용자) 날짜 기준으로 기간 경계를 잡는다.

const UP = '#16A34A';

function fmtDur(sec: number): string {
  if (sec <= 0) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

interface Metric {
  key: string;
  title: string;
  curLabel: string;
  prevLabel: string;
  cur: number;
  prev: number;
}

interface DashData {
  metrics: Metric[];
  trend: { label: string; seconds: number }[]; // 최근 14일
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function computeDash(
  map: Record<string, number>,
  today: Date,
): DashData {
  const ymd = formatDateString;
  const sumRange = (start: Date, end: Date): number => {
    let total = 0;
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    while (d <= e) {
      total += map[ymd(d)] ?? 0;
      d.setDate(d.getDate() + 1);
    }
    return total;
  };

  // DoD — 오늘 vs 어제
  const todaySec = map[ymd(today)] ?? 0;
  const yestSec = map[ymd(addDays(today, -1))] ?? 0;

  // WoW — 이번 주(월~오늘) vs 지난 주 같은 기간
  const dowMon = (today.getDay() + 6) % 7; // 0=월
  const weekStart = addDays(today, -dowMon);
  const thisWeek = sumRange(weekStart, today);
  const lastWeek = sumRange(addDays(weekStart, -7), addDays(today, -7));

  // MoM — 이번 달(1일~오늘) vs 지난 달 같은 기간(1일~같은 일자, 말일 clamp)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonth = sumRange(monthStart, today);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthLastDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    0,
  ).getDate();
  const lastMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    Math.min(today.getDate(), lastMonthLastDay),
  );
  const lastMonth = sumRange(lastMonthStart, lastMonthEnd);

  // YoY — 올해(1/1~오늘) vs 작년 같은 기간
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const thisYear = sumRange(yearStart, today);
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate(),
  );
  const lastYear = sumRange(lastYearStart, lastYearEnd);

  // 최근 14일 추세
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const trend: { label: string; seconds: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    trend.push({ label: WD[d.getDay()], seconds: map[ymd(d)] ?? 0 });
  }

  return {
    metrics: [
      { key: 'dod', title: '일간 변화 (DoD)', curLabel: '오늘', prevLabel: '어제', cur: todaySec, prev: yestSec },
      { key: 'wow', title: '주간 변화 (WoW)', curLabel: '이번 주', prevLabel: '지난 주', cur: thisWeek, prev: lastWeek },
      { key: 'mom', title: '월간 변화 (MoM)', curLabel: '이번 달', prevLabel: '지난 달', cur: thisMonth, prev: lastMonth },
      { key: 'yoy', title: '연간 변화 (YoY)', curLabel: '올해', prevLabel: '작년', cur: thisYear, prev: lastYear },
    ],
    trend,
  };
}

function deltaOf(cur: number, prev: number) {
  if (prev === 0 && cur === 0)
    return { label: '기록 없음', color: colors.inkSub, icon: 'remove' as const };
  if (prev === 0)
    return { label: '신규', color: colors.primary, icon: 'arrow-up' as const };
  const p = Math.round(((cur - prev) / prev) * 100);
  if (p === 0) return { label: '0%', color: colors.inkSub, icon: 'remove' as const };
  return p > 0
    ? { label: `+${p}%`, color: UP, icon: 'arrow-up' as const }
    : { label: `${p}%`, color: colors.danger, icon: 'arrow-down' as const };
}

function MetricCard({ m }: { m: Metric }) {
  const d = deltaOf(m.cur, m.prev);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{m.title}</Text>
        <View style={[styles.deltaPill, { backgroundColor: d.color + '1A' }]}>
          <Ionicons name={d.icon} size={13} color={d.color} />
          <Text style={[styles.deltaText, { color: d.color }]}>{d.label}</Text>
        </View>
      </View>
      <Text style={styles.cardValue}>{fmtDur(m.cur)}</Text>
      <Text style={styles.cardSub}>
        {m.curLabel} · {m.prevLabel} {fmtDur(m.prev)}
      </Text>
    </View>
  );
}

function TrendChart({ trend }: { trend: { label: string; seconds: number }[] }) {
  const max = Math.max(1, ...trend.map((t) => t.seconds));
  return (
    <View style={styles.trendCard}>
      <Text style={styles.trendTitle}>최근 14일 추세</Text>
      <View style={styles.barRow}>
        {trend.map((t, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max(3, (t.seconds / max) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // YoY까지 커버하려면 작년 1/1부터 (신규 앱은 데이터가 적어 payload 작음)
        const from = new Date(today.getFullYear() - 1, 0, 1);
        const sessions = await apiListSessions(
          formatDateString(from),
          formatDateString(today),
        );
        if (!alive) return;
        const map: Record<string, number> = {};
        for (const s of sessions) {
          if (s.end_time) map[s.date] = (map[s.date] ?? 0) + (s.duration || 0);
        }
        setData(computeDash(map, today));
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.inkSub} />
        <Text style={styles.emptyTitle}>분석을 불러오지 못했어요</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.caption}>
        이전 같은 기간과 비교한 변화율이에요 (KST 기준)
      </Text>
      <View style={styles.grid}>
        {data.metrics.map((m) => (
          <MetricCard key={m.key} m={m} />
        ))}
      </View>
      <TrendChart trend={data.trend} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  caption: { fontSize: 13, color: colors.inkSub, marginBottom: 14 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    width: '48.3%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSub, flex: 1 },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  deltaText: { fontSize: 11, fontWeight: '800' },
  cardValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2 },
  cardSub: { fontSize: 11, color: colors.inkSub, marginTop: 6 },
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  trendTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: 8, height: 100, justifyContent: 'flex-end' },
  barFill: { width: 8, borderRadius: 4, backgroundColor: colors.primaryMid },
  barLabel: { fontSize: 9, color: colors.inkSub, marginTop: 6 },
});
