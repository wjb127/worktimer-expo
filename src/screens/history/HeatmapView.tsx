import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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

// 연도 옵션 생성 (현재 연도부터 5년 전까지)
const getYearOptions = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i <= 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function HeatmapView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearData, setYearData] = useState<Record<string, number>>({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const loadYearData = async (year: number) => {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

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
      loadYearData(selectedYear);
    }, [selectedYear])
  );

  const heatmapData = useMemo(() => {
    const weeks: { date: string; duration: number }[][] = [];
    let currentWeek: { date: string; duration: number }[] = [];

    // 선택된 연도의 1월 1일부터 시작
    const startDate = new Date(selectedYear, 0, 1);

    // 첫 번째 일요일로 정렬
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    // 선택된 연도의 12월 31일까지
    const endDate = new Date(selectedYear, 11, 31);

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
  }, [yearData, selectedYear]);

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
        if (month !== lastMonth && date.getFullYear() === selectedYear) {
          labels.push({ month: MONTHS[month], weekIndex: index });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [heatmapData, selectedYear]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* 연도 선택 드롭다운 */}
      <View style={styles.yearSelectorContainer}>
        <TouchableOpacity
          style={styles.yearSelector}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={styles.yearText}>{selectedYear}년</Text>
          <Ionicons name="chevron-down" size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>

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

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heatmapContainer}>
          {/* 요일 헤더 (가로) */}
          <View style={styles.weekdayHeader}>
            <View style={styles.monthLabelSpace} />
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
          </View>

          {/* 히트맵 그리드 (세로 스크롤) */}
          <View style={styles.heatmapGrid}>
            {heatmapData.map((week, weekIndex) => {
              const monthLabel = monthLabels.find((l) => l.weekIndex === weekIndex);

              return (
                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                  <View style={styles.monthLabelContainer}>
                    {monthLabel && (
                      <Text style={styles.monthLabel}>{monthLabel.month}</Text>
                    )}
                  </View>
                  {week.map((day) => (
                    <View
                      key={day.date}
                      style={[
                        styles.dayCell,
                        { backgroundColor: getColor(day.duration) },
                      ]}
                    />
                  ))}
                  {week.length < 7 &&
                    Array(7 - week.length)
                      .fill(null)
                      .map((_, i) => (
                        <View key={`empty-${i}`} style={styles.emptyCell} />
                      ))}
                </View>
              );
            })}
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
        <Text style={styles.infoTitle}>{selectedYear}년 업무 기록</Text>
        <Text style={styles.infoText}>
          색상이 진할수록 해당 날짜에 더 많은 시간을 일했습니다.
        </Text>
      </View>

      {/* 연도 선택 모달 */}
      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>연도 선택</Text>
            <FlatList
              data={yearOptions}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.yearOption,
                    item === selectedYear && styles.yearOptionSelected,
                  ]}
                  onPress={() => handleYearSelect(item)}
                >
                  <Text
                    style={[
                      styles.yearOptionText,
                      item === selectedYear && styles.yearOptionTextSelected,
                    ]}
                  >
                    {item}년
                  </Text>
                  {item === selectedYear && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  yearSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
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
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthLabelSpace: {
    width: 40,
  },
  weekdayLabel: {
    width: 14,
    marginHorizontal: 1,
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'column',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  monthLabelContainer: {
    width: 40,
  },
  monthLabel: {
    fontSize: 11,
    color: '#666',
  },
  dayCell: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  emptyCell: {
    width: 14,
    height: 14,
    marginHorizontal: 1,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '70%',
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  yearOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#333',
  },
  yearOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
