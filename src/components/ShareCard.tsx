import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getHeatColor } from '../theme/colors';

// 공유용 9:16 성취 카드 (react-native-view-shot 캡처 대상).
// 순수 프레젠테이션 — 데이터는 ShareCardModal이 로드해 props로 주입.

export interface ShareCardData {
  totalSeconds: number;
  currentStreakDays: number;
  thisMonthSeconds: number;
  weeks: number[][]; // 5주 x 7일, 각 칸 = 그날 작업 초(잔디)
}

const CARD_WIDTH = 320;
const CARD_HEIGHT = 568; // 9:16

const formatHours = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  return h.toLocaleString();
};

const formatHM = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
};

const ShareCard = forwardRef<View, { data: ShareCardData }>(({ data }, ref) => {
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* 상단 브랜드 */}
      <View style={styles.brandRow}>
        <Ionicons name="timer" size={22} color={colors.white} />
        <Text style={styles.brand}>필타임</Text>
      </View>

      {/* 중앙 — 누적 몰입 시간 */}
      <View style={styles.heroBlock}>
        <Text style={styles.heroLabel}>총 몰입 시간</Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{formatHours(data.totalSeconds)}</Text>
          <Text style={styles.heroUnit}>시간</Text>
        </View>
      </View>

      {/* 보조 스탯 2개 */}
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.currentStreakDays}일</Text>
          <Text style={styles.statLabel}>연속 기록</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatHM(data.thisMonthSeconds)}</Text>
          <Text style={styles.statLabel}>이번 달</Text>
        </View>
      </View>

      {/* 잔디 미니 히트맵 (최근 5주) */}
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

      {/* 워터마크 (획득 루프) */}
      <Text style={styles.watermark}>filltime.app</Text>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

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

  heroBlock: { alignItems: 'center', marginTop: 8 },
  heroLabel: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroValue: {
    color: colors.white,
    fontSize: 76,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 82,
  },
  heroUnit: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 14,
    marginLeft: 6,
  },

  statRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.primaryLight, fontSize: 12, marginTop: 4 },

  grass: { alignItems: 'center', gap: 6 },
  grassRow: { flexDirection: 'row', gap: 6 },
  grassCell: { width: CELL, height: CELL, borderRadius: 6 },

  watermark: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
