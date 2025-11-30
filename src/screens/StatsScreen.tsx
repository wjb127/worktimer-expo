import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { formatDateString, getMonthStart, getMonthEnd } from '../lib/dateUtils';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ChartData {
  label: string;
  value: number; // seconds
  date: string;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}시간 ${mins}분`;
  }
  return `${mins}분`;
};

const formatShortDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StatsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadDailyData = async (baseDate: Date) => {
    // 최근 7일
    const data: ChartData[] = [];
    const endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateString = formatDateString(date);

      const { data: sessions } = await supabase
        .from('work_sessions')
        .select('duration')
        .eq('date', dateString)
        .not('end_time', 'is', null);

      const totalSeconds = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      data.push({
        label: `${date.getDate()}(${dayNames[date.getDay()]})`,
        value: totalSeconds,
        date: dateString,
      });
    }

    setChartData(data);
  };

  const loadWeeklyData = async (baseDate: Date) => {
    // 최근 8주
    const data: ChartData[] = [];

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(baseDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startString = formatDateString(weekStart);
      const endString = formatDateString(weekEnd);

      const { data: sessions } = await supabase
        .from('work_sessions')
        .select('duration')
        .gte('date', startString)
        .lte('date', endString)
        .not('end_time', 'is', null);

      const totalSeconds = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      data.push({
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        value: totalSeconds,
        date: startString,
      });
    }

    setChartData(data);
  };

  const loadMonthlyData = async (baseDate: Date) => {
    // 최근 6개월
    const data: ChartData[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const startString = getMonthStart(monthDate.getFullYear(), monthDate.getMonth());
      const endString = getMonthEnd(monthDate.getFullYear(), monthDate.getMonth());

      const { data: sessions } = await supabase
        .from('work_sessions')
        .select('duration')
        .gte('date', startString)
        .lte('date', endString)
        .not('end_time', 'is', null);

      const totalSeconds = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

      data.push({
        label: `${monthDate.getMonth() + 1}월`,
        value: totalSeconds,
        date: startString,
      });
    }

    setChartData(data);
  };

  const loadData = async () => {
    switch (viewMode) {
      case 'daily':
        await loadDailyData(currentDate);
        break;
      case 'weekly':
        await loadWeeklyData(currentDate);
        break;
      case 'monthly':
        await loadMonthlyData(currentDate);
        break;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [viewMode, currentDate])
  );

  const maxValue = useMemo(() => {
    // 모드별 최대값 설정 (초 단위)
    switch (viewMode) {
      case 'daily':
        return 20 * 3600; // 20시간
      case 'weekly':
        return 120 * 3600; // 120시간
      case 'monthly':
        return 400 * 3600; // 400시간
      default:
        return 20 * 3600;
    }
  }, [viewMode]);

  const totalDuration = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);

  const avgDuration = useMemo(() => {
    const nonZeroDays = chartData.filter((d) => d.value > 0).length;
    if (nonZeroDays === 0) return 0;
    return Math.floor(totalDuration / nonZeroDays);
  }, [chartData, totalDuration]);

  const goToPrev = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'daily':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() - 56);
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() - 6);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    const today = new Date();
    switch (viewMode) {
      case 'daily':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + 56);
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + 6);
        break;
    }
    if (newDate <= today) {
      setCurrentDate(newDate);
    }
  };

  const getDateRangeText = () => {
    if (chartData.length === 0) return '';
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return `${first.date} ~ ${last.date}`;
  };

  const barWidth = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - 80;
    return Math.floor(availableWidth / chartData.length) - 8;
  }, [chartData.length]);

  return (
    <View style={styles.container}>
      {/* 뷰 모드 선택 */}
      <View style={styles.modeSelector}>
        {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeButton, viewMode === mode && styles.modeButtonActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.modeButtonText, viewMode === mode && styles.modeButtonTextActive]}>
              {mode === 'daily' ? '일별' : mode === 'weekly' ? '주별' : '월별'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 날짜 네비게이션 */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrev} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.dateRangeText}>{getDateRangeText()}</Text>
        <TouchableOpacity onPress={goToNext} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 요약 통계 */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatDuration(totalDuration)}</Text>
          <Text style={styles.summaryLabel}>총 업무시간</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatDuration(avgDuration)}</Text>
          <Text style={styles.summaryLabel}>평균</Text>
        </View>
      </View>

      {/* 차트 */}
      <ScrollView style={styles.chartScrollView} contentContainerStyle={styles.chartScrollContent}>
        <View style={styles.chartContainer}>
          {/* Y축 라벨 */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.yAxisLabel}>{Math.floor(maxValue / 3600)}h</Text>
            <Text style={styles.yAxisLabel}>{Math.floor(maxValue / 3600 / 2)}h</Text>
            <Text style={styles.yAxisLabel}>0</Text>
          </View>

          {/* 막대 그래프 영역 */}
          <View style={styles.chartArea}>
            {/* 막대들 */}
            <View style={styles.barsContainer}>
              {chartData.map((item, index) => {
                const barHeight = maxValue > 0 ? (item.value / maxValue) * 180 : 0;
                return (
                  <View key={index} style={styles.barWrapper}>
                    {item.value > 0 && (
                      <Text style={styles.barValue}>{formatShortDuration(item.value)}</Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, item.value > 0 ? 4 : 0),
                          width: barWidth,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            {/* X축 라벨 */}
            <View style={styles.xAxisLabels}>
              {chartData.map((item, index) => (
                <Text key={index} style={[styles.barLabel, { width: barWidth + 8 }]}>
                  {item.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  chartScrollView: {
    flex: 1,
  },
  chartScrollContent: {
    paddingBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    minHeight: 280,
  },
  yAxisLabels: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
  },
  chartArea: {
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    height: 200,
    paddingBottom: 4,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 1,
    paddingTop: 6,
  },
  bar: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    minWidth: 20,
  },
  barValue: {
    fontSize: 9,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '500',
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});
