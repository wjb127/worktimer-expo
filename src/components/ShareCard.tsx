import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShareTheme, shareHeatColor } from '../theme/shareThemes';

// 공유용 9:16 카드 (react-native-view-shot 캡처 대상).
// variant 3종: summary(종합) / achievement(업적) / weekly(기간 리캡).
// 색은 전부 theme에서 온다(앰버/네이비/라이트). 순수 프레젠테이션 — 데이터는 ShareCardModal이 주입.

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

// 기간 리캡(일별/주별/월별 공용)
export interface WeeklyData {
  weekLabel: string;
  modeLabel?: string;
  totalSeconds: number;
  avgSeconds: number;
  activeCount: number;
  activeUnit: string;
  topLabel: string;
  topUnit: string;
  days: { label: string; seconds: number }[];
}

export type ShareVariant =
  | { kind: 'summary'; summary: SummaryData }
  | { kind: 'achievement'; achievement: AchievementShareData }
  | { kind: 'weekly'; weekly: WeeklyData };

const CARD_WIDTH = 300;
const CARD_HEIGHT = 533; // 9:16

const fmtHours = (s: number): string => Math.floor(s / 3600).toLocaleString();
const fmtHM = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
};
// 바 위 값 라벨 (1시간 미만은 분, 그 외는 시간)
const fmtBarVal = (s: number): string => {
  if (s < 3600) return `${Math.round(s / 60)}m`;
  const h = s / 3600;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
};

const ShareCard = forwardRef<
  View,
  { variant: ShareVariant; theme: ShareTheme }
>(({ variant, theme }, ref) => {
  return (
    <View
      ref={ref}
      style={[styles.card, { backgroundColor: theme.bg }]}
      collapsable={false}
    >
      <View style={styles.brandRow}>
        <Ionicons name="timer" size={22} color={theme.brandIcon} />
        <Text style={[styles.brand, { color: theme.brand }]}>필타임</Text>
      </View>

      <View style={styles.body}>
        {variant.kind === 'summary' && (
          <SummaryBody data={variant.summary} theme={theme} />
        )}
        {variant.kind === 'achievement' && (
          <AchievementBody data={variant.achievement} theme={theme} />
        )}
        {variant.kind === 'weekly' && (
          <WeeklyBody data={variant.weekly} theme={theme} />
        )}
      </View>

      <Text style={[styles.watermark, { color: theme.watermark }]}>
        filltime.app
      </Text>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

// 공통 stat 행
function StatRow({
  theme,
  v1,
  l1,
  v2,
  l2,
}: {
  theme: ShareTheme;
  v1: string;
  l1: string;
  v2: string;
  l2: string;
}) {
  return (
    <View
      style={[
        styles.statRow,
        {
          backgroundColor: theme.statBg,
          borderWidth: theme.statBorderColor ? 1 : 0,
          borderColor: theme.statBorderColor,
        },
      ]}
    >
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.statVal }]}>{v1}</Text>
        <Text style={[styles.statLabel, { color: theme.statLabel }]}>{l1}</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: theme.statDiv }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.statVal }]}>{v2}</Text>
        <Text style={[styles.statLabel, { color: theme.statLabel }]}>{l2}</Text>
      </View>
    </View>
  );
}

// ── 종합 ──
function SummaryBody({
  data,
  theme,
}: {
  data: SummaryData;
  theme: ShareTheme;
}) {
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={[styles.heroLabel, { color: theme.heroLabel }]}>
          총 몰입 시간
        </Text>
        <View style={styles.heroValueRow}>
          <Text style={[styles.heroValue, { color: theme.hero }]}>
            {fmtHours(data.totalSeconds)}
          </Text>
          <Text style={[styles.heroUnit, { color: theme.unit }]}>시간</Text>
        </View>
      </View>
      <StatRow
        theme={theme}
        v1={`${data.currentStreakDays}일`}
        l1="연속 기록"
        v2={fmtHM(data.thisMonthSeconds)}
        l2="이번 달"
      />
      <View style={styles.grass}>
        {data.weeks.map((week, wi) => (
          <View key={wi} style={styles.grassRow}>
            {week.map((secs, di) => (
              <View
                key={di}
                style={[
                  styles.grassCell,
                  { backgroundColor: shareHeatColor(theme, secs) },
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
function AchievementBody({
  data,
  theme,
}: {
  data: AchievementShareData;
  theme: ShareTheme;
}) {
  return (
    <View style={styles.achWrap}>
      <View style={[styles.achBadge, { backgroundColor: theme.achBadgeBg }]}>
        <Ionicons name={data.icon} size={64} color={theme.achIcon} />
      </View>
      <Text style={[styles.achKicker, { color: theme.achKicker }]}>
        업적 달성
      </Text>
      <Text style={[styles.achTitle, { color: theme.achTitle }]}>
        {data.title}
      </Text>
      <Text style={[styles.achDesc, { color: theme.achDesc }]}>
        {data.desc}
      </Text>
      <View style={[styles.achCatPill, { backgroundColor: theme.achPillBg }]}>
        <Text style={[styles.achCatText, { color: theme.achPillTx }]}>
          {data.categoryLabel}
        </Text>
      </View>
    </View>
  );
}

// ── 기간 리캡 ──
function WeeklyBody({ data, theme }: { data: WeeklyData; theme: ShareTheme }) {
  const max = Math.max(1, ...data.days.map((d) => d.seconds));
  // 최고 몰입 버킷 인덱스 (하이라이트)
  const topIdx = data.days.reduce(
    (mi, d, i, arr) => (d.seconds > arr[mi].seconds ? i : mi),
    0,
  );
  return (
    <>
      <View style={styles.heroBlock}>
        <Text style={[styles.heroLabel, { color: theme.heroLabel }]}>
          {data.modeLabel ?? '이번 주'} · {data.weekLabel}
        </Text>
        <View style={styles.heroValueRow}>
          <Text style={[styles.heroValue, { color: theme.hero }]}>
            {fmtHours(data.totalSeconds)}
          </Text>
          <Text style={[styles.heroUnit, { color: theme.unit }]}>시간</Text>
        </View>
      </View>
      <StatRow
        theme={theme}
        v1={fmtHM(data.avgSeconds)}
        l1="평균"
        v2={`${data.activeCount}${data.activeUnit}`}
        l2="기록"
      />
      {/* 버킷별 막대 (값 라벨 + 최고일 하이라이트) */}
      <View style={styles.barRow}>
        {data.days.map((d, i) => {
          const isTop = i === topIdx && d.seconds > 0;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barVal, { color: theme.barVal }]}>
                {d.seconds > 0 ? fmtBarVal(d.seconds) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(4, (d.seconds / max) * 100)}%`,
                      backgroundColor: isTop ? theme.barTop : theme.barFill,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.barLabel,
                  {
                    color: isTop ? theme.hero : theme.barLabel,
                    fontWeight: isTop ? '800' : '400',
                  },
                ]}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.weeklyTop, { color: theme.hero }]}>
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
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brand: { fontSize: 20, fontWeight: '800' },
  body: { flex: 1, justifyContent: 'space-evenly', paddingVertical: 8 },
  watermark: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // 공통 hero
  heroBlock: { alignItems: 'center' },
  heroLabel: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroValue: { fontSize: 72, fontWeight: '800', letterSpacing: -1, lineHeight: 78 },
  heroUnit: { fontSize: 24, fontWeight: '700', marginBottom: 12, marginLeft: 6 },

  statRow: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  statValue: { fontSize: 19, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },

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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  achKicker: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  achTitle: { fontSize: 34, fontWeight: '800', textAlign: 'center' },
  achDesc: { fontSize: 15, textAlign: 'center', paddingHorizontal: 10, lineHeight: 21 },
  achCatPill: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  achCatText: { fontSize: 13, fontWeight: '700' },

  // 기간 막대 (값 라벨 + 최고일 하이라이트)
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barVal: { fontSize: 10, fontWeight: '800', marginBottom: 5, height: 13 },
  barTrack: { width: 16, height: 104, justifyContent: 'flex-end' },
  barFill: { width: 16, borderRadius: 6 },
  barLabel: { fontSize: 11, marginTop: 7 },
  weeklyTop: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
