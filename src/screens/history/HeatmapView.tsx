import { useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}시간 ${mins}분`;
  }
  return `${mins}분`;
};

export default function HeatmapView() {
  const [yearData, setYearData] = useState<Record<string, number>>({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  const loadYearData = async () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const startDate = oneYearAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('work_sessions')
      .select('date, duration')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('end_time', 'is', null);

    if (error) {
      console.error('loadYearData error:', error);
      return;
    }

    const grouped: Record<string, number> = {};
    let total = 0;

    data?.forEach((session) => {
      if (!grouped[session.date]) {
        grouped[session.date] = 0;
      }
      grouped[session.date] += session.duration || 0;
      total += session.duration || 0;
    });

    setYearData(grouped);
    setTotalDuration(total);
    setTotalDays(Object.keys(grouped).length);
  };

  useFocusEffect(
    useCallback(() => {
      loadYearData();
    }, [])
  );

  const heatmapData = useMemo(() => {
    const today = new Date();
    const weeks: { date: string; duration: number }[][] = [];
    let currentWeek: { date: string; duration: number }[] = [];

    // Start from 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Align to Sunday
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const endDate = new Date(today);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const duration = yearData[dateString] || 0;

      currentWeek.push({ date: dateString, duration });

      if (d.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [yearData]);

  const getColor = (duration: number): string => {
    if (duration === 0) return '#EBEDF0';
    if (duration < 2 * 3600) return '#9BE9A8';
    if (duration < 4 * 3600) return '#40C463';
    if (duration < 6 * 3600) return '#30A14E';
    return '#216E39';
  };

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    heatmapData.forEach((week, index) => {
      if (week.length > 0) {
        const date = new Date(week[0].date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex: index });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [heatmapData]);

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
          <Text style={styles.statLabel}>총 업무 시간</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalDays}일</Text>
          <Text style={styles.statLabel}>업무 일수</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {totalDays > 0 ? formatDuration(Math.floor(totalDuration / totalDays)) : '0분'}
          </Text>
          <Text style={styles.statLabel}>일 평균</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.heatmapContainer}>
          <View style={styles.monthLabels}>
            {monthLabels.map((label, index) => (
              <Text
                key={`month-${index}`}
                style={[
                  styles.monthLabel,
                  { left: label.weekIndex * 14 },
                ]}
              >
                {label.month}
              </Text>
            ))}
          </View>

          <View style={styles.heatmapRow}>
            <View style={styles.weekdayLabels}>
              {WEEKDAYS.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.weekdayLabel,
                    index % 2 === 1 && styles.hiddenLabel,
                  ]}
                >
                  {index % 2 === 0 ? day : ''}
                </Text>
              ))}
            </View>

            <View style={styles.heatmapGrid}>
              {heatmapData.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.weekColumn}>
                  {week.map((day, dayIndex) => (
                    <View
                      key={day.date}
                      style={[
                        styles.dayCell,
                        { backgroundColor: getColor(day.duration) },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.legend}>
            <Text style={styles.legendText}>적음</Text>
            {[0, 2, 4, 6, 8].map((hours) => (
              <View
                key={hours}
                style={[
                  styles.legendCell,
                  { backgroundColor: getColor(hours * 3600) },
                ]}
              />
            ))}
            <Text style={styles.legendText}>많음</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>최근 1년 업무 기록</Text>
        <Text style={styles.infoText}>
          색상이 진할수록 해당 날짜에 더 많은 시간을 일했습니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  heatmapContainer: {
    padding: 16,
  },
  monthLabels: {
    height: 20,
    position: 'relative',
    marginLeft: 30,
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 11,
    color: '#666',
  },
  heatmapRow: {
    flexDirection: 'row',
  },
  weekdayLabels: {
    width: 24,
    marginRight: 4,
  },
  weekdayLabel: {
    height: 12,
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    paddingRight: 4,
  },
  hiddenLabel: {
    opacity: 0,
  },
  heatmapGrid: {
    flexDirection: 'row',
  },
  weekColumn: {
    marginRight: 2,
  },
  dayCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginLeft: 30,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
    marginHorizontal: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  infoSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
