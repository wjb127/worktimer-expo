import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getHeatColor } from '../theme/colors';

// 공유용 9:16 카드 (react-native-view-shot 캡처 대상).
// variant 3종: summary(종합) / achievement(업적) / weekly(주간 리캡).
// 순수 프레젠테이션 — 데이터는 ShareCardModal이 로드/주입.

export interface SummaryData {
  totalSeconds: number;
  currentStreakDays: number;
  thisMonthSeconds: number;
  weeks: number[][]; // 5주 x 7일 잔디
}

export interface AchievementShareData {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  categoryLabel: string;
}

// 기간 리캡(일별/주별/월별 공용) — 통계 탭에서 선택한 기간에 따라 카드가 바뀐다.
export interface WeeklyData {
  weekLabel: string; // 범위 라벨 (예: "최근 7일" / "6/22 ~ 6/28")
  modeLabel?: string; // 히어로 접두 (예: "일별"/"주별"/"월별"). 없으면 "이번 주"
  totalSeconds: number;
  avgSeconds: number;
  activeCount: number; // 기록 있는 버킷 수
  activeUnit: string; // '일'/'주'/'달'
  topLabel: string; // 가장 몰입한 버킷 라벨
  topUnit: string; // '날'/'주'/'달'
  days: { label: string; seconds: number }[]; // 버킷 막대
}

export type ShareVariant =
  | { kind: 'summary'; summary: SummaryData }
  | { kind: 'achievement'; achievement: AchievementShareData }
  | { kind: 'weekly'; weekly: WeeklyData };

const CARD_WIDTH = 320;
const CARD_HEIGHT = 568; // 9:16

const fmtHours = (s: number): string => Math.floor(s / 3600).toLocaleString();
const fmtHM = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
};

const ShareCard = forwardRef<View, { variant: ShareVariant }>(({ variant }, ref) => {
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={styles.brandRow}>
        <Ionicons name="timer" size={22} color={colors.white} />
        <Text style={styles.brand}>필타임</Text>
      </View>

      <View style={styles.body}>
        {variant.kind === 'summary' && <SummaryBody data={variant.summary} />}
        {variant.kind === 'achievement' && <AchievementBody data={variant.achievement} />}
        {variant.kind === 'weekly' && <WeeklyBody data={variant.weekly} />}
      </View>

      <Text style={styles.watermark}>filltime.app</Text>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

// ── 종합 ──
function SummaryBody({ data }: { data: SummaryData }) {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.heroLabel}>총 몰입 시간</Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{fmtHours(data.totalSeconds)}</Text>
          <Text style={styles.heroUnit}>시간</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.currentStreakDays}일</Text>
          <Text style={styles.statLabel}>연속 기록</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{fmtHM(data.thisMonthSeconds)}</Text>
          <Text style={styles.statLabel}>이번 달</Text>
        </View>
      </View>
      <View style={styles.grass}>
        {data.weeks.map((week, wi) => (
          <View key={wi} style={styles.grassRow}>
            {week.map((secs, di) => (
              <View
                key={di}
                style={[
                  styles.grassCell,
                  { backgroundColor: secs > 0 ? getHeatColor(secs) : 'rgba(255,255,255,0.12)' },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

// ── 업적 ──
function AchievementBody({ data }: { data: AchievementShareData }) {
  return (
    <View style={styles.achWrap}>
      <View style={styles.achBadge}>
        <Ionicons name={data.icon} size={64} color={colors.white} />
      </View>
      <Text style={styles.achKicker}>업적 달성</Text>
      <Text style={styles.achTitle}>{data.title}</Text>
      <Text style={styles.achDesc}>{data.desc}</Text>
      <View style={styles.achCatPill}>
        <Text style={styles.achCatText}>{data.categoryLabel}</Text>
      </View>
    </View>
  );
}

// ── 주간 리캡 ──
function WeeklyBody({ data }: { data: WeeklyData }) {
  const max = Math.max(1, ...data.days.map((d) => d.seconds));
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={styles.heroLabel}>
          {data.modeLabel ?? '이번 주'} · {data.weekLabel}
        </Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{fmtHours(data.totalSeconds)}</Text>
          <Text style={styles.heroUnit}>시간</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{fmtHM(data.avgSeconds)}</Text>
          <Text style={styles.statLabel}>평균</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {data.activeCount}
            {data.activeUnit}
          </Text>
          <Text style={styles.statLabel}>기록</Text>
        </View>
      </View>
      {/* 요일별 막대 */}
      <View style={styles.barRow}>
        {data.days.map((d, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max(4, (d.seconds / max) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.weeklyTop}>
        가장 몰입한 {data.topUnit} · {data.topLabel}
      </Text>
    </>
  );
}

const CELL = 30;
const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.primaryDark,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brand: { color: colors.white, fontSize: 20, fontWeight: '800' },
  body: { flex: 1, justifyContent: 'space-evenly', paddingVertical: 8 },
  watermark: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // 공통 hero
  heroBlock: { alignItems: 'center' },
  heroLabel: { color: colors.primaryLight, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroValue: { color: colors.white, fontSize: 72, fontWeight: '800', letterSpacing: -1, lineHeight: 78 },
  heroUnit: { color: colors.white, fontSize: 24, fontWeight: '700', marginBottom: 12, marginLeft: 6 },

  statRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { color: colors.white, fontSize: 19, fontWeight: '800' },
  statLabel: { color: colors.primaryLight, fontSize: 12, marginTop: 4 },

  // 잔디
  grass: { alignItems: 'center', gap: 6 },
  grassRow: { flexDirection: 'row', gap: 6 },
  grassCell: { width: CELL, height: CELL, borderRadius: 6 },

  // 업적
  achWrap: { alignItems: 'center', gap: 10 },
  achBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  achKicker: { color: colors.primaryLight, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  achTitle: { color: colors.white, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  achDesc: { color: colors.primaryLight, fontSize: 15, textAlign: 'center', paddingHorizontal: 10, lineHeight: 21 },
  achCatPill: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  achCatText: { color: colors.white, fontSize: 13, fontWeight: '700' },

  // 주간 막대
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: 18, height: 96, justifyContent: 'flex-end' },
  barFill: { width: 18, backgroundColor: colors.primaryMid, borderRadius: 5 },
  barLabel: { color: colors.primaryLight, fontSize: 11, marginTop: 6 },
  weeklyTop: { color: colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
