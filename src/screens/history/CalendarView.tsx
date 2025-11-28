import { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
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

const formatShortDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) {
    return `${hrs}h${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
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
  const [showColors, setShowColors] = useState(true);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

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

  const openEditModal = (session: WorkSession) => {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time!);
    setEditStartTime(
      `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    );
    setEditEndTime(
      `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
    );
    setEditingSession(session);
  };

  const handleSaveSession = async () => {
    if (!editingSession || !selectedDate) return;

    const [startH, startM] = editStartTime.split(':').map(Number);
    const [endH, endM] = editEndTime.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      Alert.alert('오류', '올바른 시간 형식을 입력해주세요 (HH:MM)');
      return;
    }

    const newStart = new Date(selectedDate);
    newStart.setHours(startH, startM, 0, 0);
    const newEnd = new Date(selectedDate);
    newEnd.setHours(endH, endM, 0, 0);

    if (newEnd <= newStart) {
      Alert.alert('오류', '종료 시간은 시작 시간보다 늦어야 합니다');
      return;
    }

    const newDuration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);

    const { error } = await supabase
      .from('work_sessions')
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        duration: newDuration,
      })
      .eq('id', editingSession.id);

    if (error) {
      Alert.alert('오류', '저장에 실패했습니다');
      return;
    }

    setEditingSession(null);
    loadDaySessions(selectedDate);
    loadMonthData();
  };

  const handleDeleteSession = async () => {
    if (!editingSession || !selectedDate) return;

    Alert.alert('삭제 확인', '이 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('work_sessions')
            .delete()
            .eq('id', editingSession.id);

          if (error) {
            Alert.alert('오류', '삭제에 실패했습니다');
            return;
          }

          setEditingSession(null);
          loadDaySessions(selectedDate);
          loadMonthData();
        },
      },
    ]);
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
    if (duration >= 8 * 3600) return '#007AFF';
    if (duration >= 4 * 3600) return '#5AC8FA';
    if (duration > 0) return '#D6EEFF';
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

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>색상 표시</Text>
        <Switch
          value={showColors}
          onValueChange={setShowColors}
          trackColor={{ false: '#D1D1D6', true: '#007AFF' }}
          thumbColor="#fff"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
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
                showColors && { backgroundColor: getDayColor(duration) },
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
                  {formatShortDuration(duration)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDate && (
        <View style={styles.timelineContainer}>
          <Text style={styles.sessionListTitle}>
            {selectedDate} 기록 ({sessions.length}개)
          </Text>
          <View style={styles.timeline}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={styles.timelineRow}>
                <Text style={styles.timelineHour}>{String(hour).padStart(2, '0')}</Text>
                <View style={styles.timelineSlot}>
                  {sessions.map((session) => {
                    const startDate = new Date(session.start_time);
                    const endDate = new Date(session.end_time!);
                    const startHour = startDate.getHours();
                    const startMin = startDate.getMinutes();
                    const endHour = endDate.getHours();
                    const endMin = endDate.getMinutes();

                    // 이 시간대에 세션이 포함되는지 확인
                    const sessionStartInMinutes = startHour * 60 + startMin;
                    const sessionEndInMinutes = endHour * 60 + endMin;
                    const slotStart = hour * 60;
                    const slotEnd = (hour + 1) * 60;

                    if (sessionEndInMinutes <= slotStart || sessionStartInMinutes >= slotEnd) {
                      return null;
                    }

                    // 이 시간대 내에서의 시작/끝 위치 계산 (0-100%)
                    const blockStart = Math.max(0, ((sessionStartInMinutes - slotStart) / 60) * 100);
                    const blockEnd = Math.min(100, ((sessionEndInMinutes - slotStart) / 60) * 100);
                    const blockWidth = blockEnd - blockStart;

                    return (
                      <TouchableOpacity
                        key={session.id + '-' + hour}
                        style={[
                          styles.timelineBlock,
                          {
                            left: `${blockStart}%`,
                            width: `${blockWidth}%`,
                          },
                        ]}
                        onPress={() => openEditModal(session)}
                        activeOpacity={0.7}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          {sessions.length > 0 && (
            <View style={styles.sessionSummary}>
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionSummaryItem}
                  onPress={() => openEditModal(session)}
                >
                  <Text style={styles.sessionSummaryText}>
                    {formatTime(session.start_time)} - {formatTime(session.end_time!)} ({formatDuration(session.duration)})
                  </Text>
                  <Ionicons name="pencil" size={14} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      </ScrollView>

      {/* 세션 수정 모달 */}
      <Modal
        visible={editingSession !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSession(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingSession(null)}
        >
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditingSession(null)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>업무 시간 수정</Text>

            <View style={styles.editTimeRow}>
              <Text style={styles.editTimeLabel}>시작</Text>
              <TextInput
                style={styles.editTimeInput}
                value={editStartTime}
                onChangeText={setEditStartTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={styles.editTimeRow}>
              <Text style={styles.editTimeLabel}>종료</Text>
              <TextInput
                style={styles.editTimeInput}
                value={editEndTime}
                onChangeText={setEditEndTime}
                placeholder="18:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={styles.editButtonRow}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteSession}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSession}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
    fontSize: 13,
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
    color: '#34C759',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  sessionListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeline: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timelineHour: {
    width: 28,
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    backgroundColor: '#FAFAFA',
  },
  timelineSlot: {
    flex: 1,
    height: '100%',
    backgroundColor: '#fff',
    position: 'relative',
  },
  timelineBlock: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  sessionSummary: {
    marginTop: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  sessionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  sessionSummaryText: {
    fontSize: 13,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  editTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTimeLabel: {
    width: 50,
    fontSize: 15,
    color: '#333',
  },
  editTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  optionLabel: {
    fontSize: 15,
    color: '#333',
  },
});
