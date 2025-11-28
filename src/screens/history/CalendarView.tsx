import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { WorkSession } from '../../types/session';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}시간 ${mins}분`;
  }
  return `${mins}분`;
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [monthData, setMonthData] = useState<Record<string, number>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadMonthData = async () => {
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('work_sessions')
      .select('date, duration')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .not('end_time', 'is', null);

    if (error) {
      console.error('loadMonthData error:', error);
      return;
    }

    const grouped: Record<string, number> = {};
    data?.forEach((session) => {
      if (!grouped[session.date]) {
        grouped[session.date] = 0;
      }
      grouped[session.date] += session.duration || 0;
    });

    setMonthData(grouped);
  };

  const loadDaySessions = async (date: string) => {
    const { data, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('date', date)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('loadDaySessions error:', error);
      return;
    }

    setSessions(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [year, month])
  );

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    loadDaySessions(date);
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSessions([]);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSessions([]);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  const getDateString = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDayColor = (duration: number): string => {
    if (duration >= 8 * 3600) return '#34C759';
    if (duration >= 4 * 3600) return '#A8E6CF';
    if (duration > 0) return '#D4EDDA';
    return 'transparent';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {year}년 {month + 1}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <Text
            key={day}
            style={[
              styles.weekday,
              index === 0 && styles.sunday,
              index === 6 && styles.saturday,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateString = getDateString(day);
          const duration = monthData[dateString] || 0;
          const isSelected = selectedDate === dateString;
          const isToday = dateString === new Date().toISOString().split('T')[0];

          return (
            <TouchableOpacity
              key={dateString}
              style={[
                styles.dayCell,
                { backgroundColor: getDayColor(duration) },
                isSelected && styles.selectedDay,
                isToday && styles.today,
              ]}
              onPress={() => handleDateSelect(dateString)}
            >
              <Text
                style={[
                  styles.dayText,
                  index % 7 === 0 && styles.sundayText,
                  index % 7 === 6 && styles.saturdayText,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day}
              </Text>
              {duration > 0 && (
                <Text style={styles.durationText}>
                  {Math.floor(duration / 3600)}h
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDate && (
        <View style={styles.sessionList}>
          <Text style={styles.sessionListTitle}>
            {selectedDate} 기록 ({sessions.length}개)
          </Text>
          {sessions.length === 0 ? (
            <Text style={styles.noSessions}>기록이 없습니다</Text>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.sessionItem}>
                  <View style={styles.sessionTime}>
                    <Text style={styles.sessionTimeText}>
                      {formatTime(item.start_time)} - {formatTime(item.end_time!)}
                    </Text>
                  </View>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(item.duration)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  sunday: {
    color: '#FF3B30',
  },
  saturday: {
    color: '#007AFF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  today: {
    borderWidth: 1,
    borderColor: '#333',
  },
  dayText: {
    fontSize: 16,
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
  selectedDayText: {
    fontWeight: '600',
  },
  durationText: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
  },
  sessionList: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  sessionListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noSessions: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionTime: {
    flex: 1,
  },
  sessionTimeText: {
    fontSize: 15,
    color: '#333',
  },
  sessionDuration: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
});
