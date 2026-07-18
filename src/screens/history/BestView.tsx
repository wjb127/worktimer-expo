import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiListSessions } from '../../lib/api/sessions';
import { colors, getHeatColor } from '../../theme/colors';

// 명예의 전당 — 친구 랭킹(소셜) 대신 '나 자신'의 최고 몰입 기록을 랭킹.
// 일/주/월 토글로 TOP 10. 실제 세션 데이터만(자작 수치 없음). 기록 없으면 빈 상태.
// AI Token Monitor 리더보드 레이아웃 차용: 순위 + 트로피 + 큰 지표 + 보조 + 강도 타일.

type Period = 'day' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: '일' },
  { key: 'week', label: '주' },
  { key: 'month', label: '월' },
];

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}시간 ${mins}분`;
  if (hrs > 0) return `${hrs}시간`;
  return `${mins}분`;
};

// 그 날짜가 속한 주의 (일요일 시작) 시작일 문자열
const weekStartOf = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const labelFor = (period: Period, key: string): string => {
  if (period === 'day') {
    const d = new Date(key);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
  }
  if (period === 'week') {
    const start = new Date(key);
    const end = new Date(key);
    end.setDate(end.getDate() + 6);
    return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  }
  const [y, m] = key.split('-');
  return `${y}년 ${Number(m)}월`;
};

interface Rank {
  key: string;
  label: string;
  total: number; // 초
  days: number; // 그 기간에 기록한 날 수 (주/월용)
}

const TROPHY = ['#F5B301', '#9FB0C3', '#CD7F32']; // 금·은·동

export default function BestView() {
  const [period, setPeriod] = useState<Period>('day');
  const [dayTotals, setDayTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // 전체 기간(명예의 전당 = 역대 최고). 본인 데이터라 1콜로 충분.
      const today = new Date();
      const to = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const data = (await apiListSessions('2020-01-01', to)).filter(
        (s) => s.end_time !== null,
      );
      const grouped: Record<string, number> = {};
      data.forEach((s) => {
        grouped[s.date] = (grouped[s.date] || 0) + (s.duration || 0);
      });
      setDayTotals(grouped);
    } catch (e) {
      console.error('best load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const ranks = useMemo<Rank[]>(() => {
    const bucket: Record<string, { total: number; days: Set<string> }> = {};
    Object.entries(dayTotals).forEach(([date, secs]) => {
      if (secs <= 0) return;
      let key = date;
      if (period === 'week') key = weekStartOf(date);
      else if (period === 'month') key = date.slice(0, 7); // YYYY-MM
      if (!bucket[key]) bucket[key] = { total: 0, days: new Set() };
      bucket[key].total += secs;
      bucket[key].days.add(date);
    });
    return Object.entries(bucket)
      .map(([key, v]) => ({
        key,
        label: labelFor(period, key),
        total: v.total,
        days: v.days.size,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [dayTotals, period]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 기간 토글 (item 3) */}
      <View style={styles.segment}>
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.segBtn, on && styles.segBtnOn]}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {ranks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={48} color={colors.line} />
          <Text style={styles.emptyText}>
            아직 기록이 없어요.{'\n'}몰입을 쌓으면 최고 기록이 여기 올라와요.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.caption}>
            역대 가장 많이 몰입한 {PERIODS.find((p) => p.key === period)?.label}{' '}
            TOP {ranks.length}
          </Text>
          {ranks.map((r, i) => {
            const top3 = i < 3;
            const avgPerDay = r.days > 0 ? Math.floor(r.total / r.days) : 0;
            return (
              <View
                key={r.key}
                style={[styles.row, i === 0 && styles.rowBest]}
              >
                <View style={styles.rankBox}>
                  {top3 ? (
                    <Ionicons name="trophy" size={22} color={TROPHY[i]} />
                  ) : (
                    <Text style={styles.rankNum}>{i + 1}</Text>
                  )}
                </View>
                {/* 강도 타일 (입체감 — item 1과 동일 룩) */}
                <View
                  style={[
                    styles.tile,
                    { backgroundColor: getHeatColor(period === 'day' ? r.total : r.total / Math.max(r.days, 1)) },
                    styles.tileRaised,
                  ]}
                />
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {r.label}
                  </Text>
                  <Text style={styles.rowSub}>
                    {period === 'day'
                      ? '하루'
                      : `${r.days}일 기록 · 하루 평균 ${formatDuration(avgPerDay)}`}
                  </Text>
                </View>
                <Text style={[styles.rowMetric, i === 0 && styles.rowMetricBest]}>
                  {formatDuration(r.total)}
                </Text>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
  },
  segBtnOn: { backgroundColor: colors.primary },
  segText: { fontSize: 14, fontWeight: '700', color: colors.inkSub },
  segTextOn: { color: colors.white },
  listContent: { padding: 16 },
  caption: {
    fontSize: 13,
    color: colors.inkSub,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowBest: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  rankBox: {
    width: 30,
    alignItems: 'center',
  },
  rankNum: { fontSize: 15, fontWeight: '800', color: colors.inkSub },
  tile: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginHorizontal: 12,
  },
  tileRaised: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 1.5,
    elevation: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.5)',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.inkSub, marginTop: 2 },
  rowMetric: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginLeft: 8,
  },
  rowMetricBest: { color: colors.primary },
});
