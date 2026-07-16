import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';
import { usePremium } from '../lib/premium';
import PaywallModal from '../components/PaywallModal';
import { apiListSessions } from '../lib/api/sessions';
import { WorkSession } from '../types/session';
import { getLocalToday } from '../lib/dateUtils';

// AI 업무 분석 — 프리미엄 기능.
// v1: 최근 28일 기록 기반 로컬 인사이트(패턴·코칭 룰베이스). LLM 질의는 후속 릴리즈.

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface Insights {
  totalHours: number;
  activeDays: number;
  avgSessionMin: number;
  bestDow: string; // 최강 요일
  goldenHour: string; // 골든타임 (몰입 최다 시간대)
  thisWeekH: number;
  lastWeekH: number;
  coaching: string[];
}

// 'YYYY-MM-DD' 로컬 오늘 기준 n일 전
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtH(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}

// 최근 28일 세션 → 인사이트 계산 (전부 로컬, 룰베이스)
function computeInsights(sessions: WorkSession[], today: string): Insights {
  const done = sessions.filter((s) => s.end_time && s.duration > 0);

  const totalSec = done.reduce((a, s) => a + s.duration, 0);
  const dayset = new Set(done.map((s) => s.date));

  // 요일별 합
  const dowSum = new Array(7).fill(0) as number[];
  // 시작 시각(시)별 합
  const hourSum = new Array(24).fill(0) as number[];
  for (const s of done) {
    const st = new Date(s.start_time);
    dowSum[st.getDay()] += s.duration;
    hourSum[st.getHours()] += s.duration;
  }
  const bestDowIdx = dowSum.indexOf(Math.max(...dowSum));
  const bestHourIdx = hourSum.indexOf(Math.max(...hourSum));

  // 이번 주(월요일 시작) / 지난 주
  const now = new Date();
  const dow = now.getDay();
  const offsetToMonday = dow === 0 ? 6 : dow - 1;
  const weekStart = daysAgo(offsetToMonday);
  const lastWeekStart = daysAgo(offsetToMonday + 7);
  const thisWeekSec = done
    .filter((s) => s.date >= weekStart && s.date <= today)
    .reduce((a, s) => a + s.duration, 0);
  const lastWeekSec = done
    .filter((s) => s.date >= lastWeekStart && s.date < weekStart)
    .reduce((a, s) => a + s.duration, 0);

  // 룰베이스 코칭 문구
  const coaching: string[] = [];
  if (thisWeekSec > lastWeekSec && lastWeekSec > 0) {
    const up = Math.round(((thisWeekSec - lastWeekSec) / lastWeekSec) * 100);
    coaching.push(`이번 주 몰입이 지난주보다 ${up}% 늘었어요. 흐름 유지!`);
  } else if (lastWeekSec > 0 && thisWeekSec < lastWeekSec * 0.7) {
    coaching.push(
      '이번 주는 지난주보다 페이스가 느려요. 짧은 세션 하나로 다시 시동을 걸어보세요.',
    );
  }
  if (totalSec > 0) {
    coaching.push(
      `${bestHourIdx}시 시작 세션에서 가장 오래 몰입했어요. 중요한 일은 이 시간대에 배치해보세요.`,
    );
    coaching.push(
      `${DAY_NAMES[bestDowIdx]}요일이 최근 4주 중 가장 강한 요일이에요.`,
    );
  }
  if (dayset.size >= 20) {
    coaching.push(`최근 28일 중 ${dayset.size}일 기록 — 꾸준함이 무기예요.`);
  }
  if (coaching.length === 0) {
    coaching.push('기록이 쌓이면 패턴 분석이 더 정확해져요. 오늘부터 시작!');
  }

  return {
    totalHours: fmtH(totalSec),
    activeDays: dayset.size,
    avgSessionMin: done.length
      ? Math.round(totalSec / done.length / 60)
      : 0,
    bestDow: totalSec > 0 ? `${DAY_NAMES[bestDowIdx]}요일` : '-',
    goldenHour: totalSec > 0 ? `${bestHourIdx}시` : '-',
    thisWeekH: fmtH(thisWeekSec),
    lastWeekH: fmtH(lastWeekSec),
    coaching,
  };
}

// ── 프리미엄 잠금 화면 (미구독) ─────────────────────────────────────────────
const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    icon: 'bar-chart',
    title: '패턴 분석',
    desc: '시간대·요일별 집중 패턴과 업무 흐름을 자동으로 분석해요.',
  },
  {
    icon: 'bulb',
    title: '맞춤 코칭',
    desc: '잘한 점과 개선점을 짚고, 내일을 위한 실천 제안을 받아요.',
  },
  {
    icon: 'trending-up',
    title: '생산성 리포트',
    desc: '할 일과 연결된 시간을 토대로 무엇에 시간을 썼는지 한눈에.',
  },
  {
    icon: 'chatbubbles',
    title: 'AI 질문하기',
    desc: '"어제보다 오늘 집중이 늘었어?" 처럼 자유롭게 물어보세요. (곧 제공)',
  },
];

function LockedView({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={34} color={colors.primary} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>프리미엄</Text>
        </View>
        <Text style={styles.heroTitle}>AI 업무 분석</Text>
        <Text style={styles.heroDesc}>
          쌓인 기록과 할 일을 바탕으로{'\n'}나의 업무 패턴을 분석해줘요.
        </Text>
      </View>
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={colors.line} />
          </View>
        ))}
      </View>
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onUpgrade}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>무료로 시작하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── 분석 대시보드 (프리미엄) ────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Dashboard() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const today = getLocalToday();
      const sessions = await apiListSessions(daysAgo(27), today);
      setInsights(computeInsights(sessions, today));
    } catch {
      // 네트워크 실패 — 기존 데이터 유지 (없으면 빈 안내)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!insights) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.featureDesc}>
          분석 데이터를 불러오지 못했어요. 아래로 당겨 새로고침하세요.
        </Text>
      </View>
    );
  }

  const diff = insights.thisWeekH - insights.lastWeekH;
  const diffText =
    insights.lastWeekH === 0
      ? ''
      : diff >= 0
        ? `지난주보다 +${Math.round(diff * 10) / 10}시간`
        : `지난주보다 ${Math.round(diff * 10) / 10}시간`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      {/* 주간 요약 히어로 */}
      <View style={styles.summaryHero}>
        <Text style={styles.summaryLabel}>이번 주 몰입</Text>
        <Text style={styles.summaryValue}>{insights.thisWeekH}시간</Text>
        {diffText !== '' && (
          <View style={[styles.diffChip, diff < 0 && styles.diffChipDown]}>
            <Ionicons
              name={diff >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={diff >= 0 ? colors.primary : colors.inkSub}
            />
            <Text style={[styles.diffText, diff < 0 && styles.diffTextDown]}>
              {diffText}
            </Text>
          </View>
        )}
      </View>

      {/* 최근 28일 스탯 */}
      <Text style={styles.sectionTitle}>최근 28일</Text>
      <View style={styles.statRow}>
        <StatCard label="총 몰입" value={`${insights.totalHours}h`} />
        <StatCard label="기록한 날" value={`${insights.activeDays}일`} />
        <StatCard label="평균 세션" value={`${insights.avgSessionMin}분`} />
      </View>
      <View style={styles.statRow}>
        <StatCard label="골든타임" value={insights.goldenHour} />
        <StatCard label="최강 요일" value={insights.bestDow} />
      </View>

      {/* AI 코칭 */}
      <Text style={styles.sectionTitle}>AI 코칭</Text>
      <View style={styles.coachCard}>
        {insights.coaching.map((c) => (
          <View key={c} style={styles.coachRow}>
            <Ionicons name="bulb" size={16} color={colors.primary} />
            <Text style={styles.coachText}>{c}</Text>
          </View>
        ))}
      </View>

      {/* 후속 기능 예고 */}
      <View style={styles.upcoming}>
        <Ionicons name="chatbubbles-outline" size={18} color={colors.inkSub} />
        <Text style={styles.noticeText}>
          AI에게 자유롭게 질문하기 — 다음 업데이트에서 만나요.
        </Text>
      </View>
    </ScrollView>
  );
}

// ── 루트: 프리미엄 게이트 ──────────────────────────────────────────────────
export default function AnalysisScreen() {
  const { isPremium, loading, refresh } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <>
        <LockedView
          onUpgrade={() => {
            track('premium_interest_click', { feature: 'AI 분석' });
            setPaywallOpen(true);
          }}
        />
        <PaywallModal
          visible={paywallOpen}
          featureName="AI 분석"
          onClose={() => setPaywallOpen(false)}
          onUnlocked={() => {
            setPaywallOpen(false);
            refresh();
          }}
        />
      </>
    );
  }

  return <Dashboard />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  // 잠금 화면
  hero: { alignItems: 'center', paddingVertical: 24 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  heroDesc: {
    fontSize: 14,
    color: colors.inkSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  featureList: { gap: 10, marginTop: 8 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextCol: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  featureDesc: { fontSize: 13, color: colors.inkSub, marginTop: 3, lineHeight: 18 },
  cta: { marginTop: 20, alignItems: 'center' },
  ctaButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  // 대시보드
  summaryHero: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    paddingVertical: 26,
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13, color: colors.inkSub, marginBottom: 6 },
  summaryValue: { fontSize: 34, fontWeight: '800', color: colors.ink },
  diffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: colors.primaryFaint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  diffChipDown: { backgroundColor: colors.bg },
  diffText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  diffTextDown: { color: colors.inkSub },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 18,
    marginBottom: 10,
  },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkSub, marginTop: 4 },
  coachCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  coachRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  coachText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  upcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
  },
  noticeText: { fontSize: 13, color: colors.inkSub },
});
