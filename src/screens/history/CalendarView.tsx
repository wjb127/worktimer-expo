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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  apiListSessions,
  apiEditTimes,
  apiCreateManual,
  apiDelete,
} from '../../lib/api/sessions';
import { apiUpdateSessionMeta } from '../../lib/api/todos';
import { WorkSession } from '../../types/session';
import { getLocalToday, getMonthStart, getMonthEnd } from '../../lib/dateUtils';
import { colors, getHeatColor, getHeatTextColor } from '../../theme/colors';
import { usePremium } from '../../lib/premium';
import PaywallModal from '../../components/PaywallModal';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 셀 안에 표시할 "H:MM" 포맷 (예: 10:23). 0초면 빈 문자열
const formatHourMin = (seconds: number): string => {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};

// 셀 배경 밝기에 따라 가독성 좋은 텍스트 색을 반환 (대비 확보)
// 진한 셀(6시간 이상 → #60A5FA/#3B82F6/#2563EB)엔 흰색, 그 외엔 ink
const getDayTextColor = (duration: number): string => getHeatTextColor(duration);

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
  const [showColors, setShowColors] = useState(true);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  // 기록 수정은 프리미엄 기능 — 미구독이면 페이월, 언락 직후 이어서 열기
  const { isPremium, refresh: refreshPremium } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<WorkSession | null>(null);
  // 빈 구간 추가 모드 — 클릭한 시(hour). null이면 편집 모드(editingSession 사용)
  const [addingHour, setAddingHour] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [monthTotal, setMonthTotal] = useState(0);
  // 모달이 add 모드인지 edit 모드인지
  const isAddMode = addingHour !== null;
  const modalVisible = editingSession !== null || addingHour !== null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadMonthData = async () => {
    const startOfMonth = getMonthStart(year, month);
    const endOfMonth = getMonthEnd(year, month);

    let data;
    try {
      data = (await apiListSessions(startOfMonth, endOfMonth)).filter(
        (s) => s.end_time !== null,
      );
    } catch (error) {
      console.error('loadMonthData error:', error);
      return;
    }

    const grouped: Record<string, number> = {};
    let total = 0;
    data.forEach((session) => {
      if (!grouped[session.date]) {
        grouped[session.date] = 0;
      }
      grouped[session.date] += session.duration || 0;
      total += session.duration || 0;
    });

    setMonthData(grouped);
    setMonthTotal(total);
  };

  const loadDaySessions = async (date: string) => {
    try {
      const data = (await apiListSessions(date, date)).filter(
        (s) => s.end_time !== null,
      );
      setSessions(data);
    } catch (error) {
      console.error('loadDaySessions error:', error);
    }
  };

  const closeModal = () => {
    setEditingSession(null);
    setAddingHour(null);
    setEditDescription('');
  };

  const openEditModal = (session: WorkSession) => {
    if (!isPremium) {
      setPendingEdit(session);
      setPaywallOpen(true);
      return;
    }
    doOpenEditModal(session);
  };

  const doOpenEditModal = (session: WorkSession) => {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time!);
    setEditStartTime(
      `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    );
    setEditEndTime(
      `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
    );
    setEditDescription(session.description ?? '');
    setAddingHour(null);
    setEditingSession(session);
  };

  // 빈 구간(시간 행) 클릭 → 그 시각 기본값으로 추가 모달
  const openAddModal = (hour: number) => {
    setEditingSession(null);
    setEditStartTime(`${String(hour).padStart(2, '0')}:00`);
    setEditEndTime(`${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`);
    setEditDescription('');
    setAddingHour(hour);
  };

  const handleSaveSession = async () => {
    if (!selectedDate) return;

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

    try {
      if (isAddMode) {
        const created = await apiCreateManual(
          newStart.toISOString(),
          newEnd.toISOString(),
          selectedDate,
        );
        const description = editDescription.trim();
        if (description) {
          await apiUpdateSessionMeta(created.id, { description });
        }
      } else if (editingSession) {
        await Promise.all([
          apiEditTimes(
            editingSession.id,
            newStart.toISOString(),
            newEnd.toISOString(),
          ),
          apiUpdateSessionMeta(editingSession.id, {
            description: editDescription.trim() || null,
          }),
        ]);
      }
    } catch {
      Alert.alert('오류', '저장에 실패했습니다');
      return;
    }

    closeModal();
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
          try {
            await apiDelete(editingSession.id);
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다');
            return;
          }

          closeModal();
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

  const getDayColor = (duration: number): string =>
    duration > 0 ? getHeatColor(duration) : 'transparent';

  return (
    <View style={styles.container}>
      {/* 이번달 총 업무시간 */}
      <View style={styles.monthTotalContainer}>
        <Text style={styles.monthTotalLabel}>{month + 1}월 총 업무시간</Text>
        <Text style={styles.monthTotalValue}>{formatDuration(monthTotal)}</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {year}년 {month + 1}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>색상 표시</Text>
        <Switch
          value={showColors}
          onValueChange={setShowColors}
          trackColor={{ false: colors.line, true: colors.primary }}
          thumbColor={colors.white}
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
          const isToday = dateString === getLocalToday();
          // 색상 표시 ON일 때만 셀 배경에 맞춰 대비 색을 적용. OFF면 항상 ink
          const dayTextColor = showColors ? getDayTextColor(duration) : colors.ink;

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
                  { color: dayTextColor },
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day}
              </Text>
              <Text
                style={[
                  styles.durationText,
                  { color: dayTextColor },
                  duration === 0 && styles.durationTextHidden,
                ]}
              >
                {duration > 0 ? formatHourMin(duration) : ' '}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDate && (
        <View style={styles.timelineContainer}>
          <Text style={styles.sessionListTitle}>
            {selectedDate} 기록 ({sessions.length}개)
          </Text>
          <Text style={styles.timelineHint}>
            빈 시간대를 탭해 기록 추가 · 파란 막대를 탭해 수정
          </Text>
          <View style={styles.timeline}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={styles.timelineRow}>
                <Text style={styles.timelineHour}>{String(hour).padStart(2, '0')}</Text>
                {/* 빈 구간 탭 → 추가 모달 (세션 막대는 내부 TouchableOpacity가 먼저 잡아 편집) */}
                <TouchableOpacity
                  style={styles.timelineSlot}
                  activeOpacity={0.6}
                  onPress={() => openAddModal(hour)}
                >
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
                </TouchableOpacity>
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
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      </ScrollView>

      {/* 세션 추가/수정 모달 (add/edit 겸용) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color={colors.inkSub} />
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>
              {isAddMode ? '업무 기록 추가' : '업무 시간 수정'}
            </Text>

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

            <Text style={styles.editDescriptionLabel}>무슨 업무를 했나요?</Text>
            <TextInput
              style={styles.editDescriptionInput}
              placeholder="예: 백엔드 API 설계, 디자인 리뷰..."
              placeholderTextColor={colors.inkSub}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
            />

            <View
              style={[
                styles.editButtonRow,
                isAddMode && styles.editButtonRowAdd,
              ]}
            >
              {/* 삭제는 편집 모드에서만 */}
              {!isAddMode && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteSession}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSession}
              >
                <Text style={styles.saveButtonText}>
                  {isAddMode ? '추가' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PaywallModal
        visible={paywallOpen}
        featureName="기록 수정"
        onClose={() => {
          setPaywallOpen(false);
          setPendingEdit(null);
        }}
        onUnlocked={() => {
          setPaywallOpen(false);
          refreshPremium();
          if (pendingEdit) {
            doOpenEditModal(pendingEdit);
            setPendingEdit(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  monthTotalContainer: {
    backgroundColor: colors.primaryFaint,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  monthTotalLabel: {
    fontSize: 14,
    color: colors.inkSub,
    marginBottom: 4,
  },
  monthTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
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
    color: colors.ink,
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
    color: colors.inkSub,
  },
  sunday: {
    color: colors.danger,
  },
  saturday: {
    color: colors.primary,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDay: {
    borderColor: colors.primary,
  },
  today: {
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '500',
  },
  selectedDayText: {
    fontWeight: '700',
  },
  durationText: {
    fontSize: 10,
    color: colors.ink,
    fontWeight: '600',
    marginTop: 2,
    minHeight: 14,
  },
  durationTextHidden: {
    opacity: 0,
  },
  timelineContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sessionListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 12,
  },
  timelineHint: {
    fontSize: 12,
    color: colors.inkSub,
    marginBottom: 10,
  },
  timeline: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // 시간표 두껍게: 행 높이 24 → 40
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  timelineHour: {
    width: 36,
    fontSize: 12,
    color: colors.inkSub,
    textAlign: 'center',
    backgroundColor: colors.bg,
    height: '100%',
    lineHeight: 40,
  },
  timelineSlot: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.white,
    position: 'relative',
  },
  timelineBlock: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sessionSummary: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 8,
  },
  sessionSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sessionSummaryText: {
    fontSize: 13,
    color: colors.ink,
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
    color: colors.ink,
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
    color: colors.ink,
  },
  editTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  editDescriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  editDescriptionInput: {
    minHeight: 80,
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  // add 모드: 삭제 버튼 없으니 저장(추가) 버튼 우측 정렬
  editButtonRowAdd: {
    justifyContent: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: colors.white,
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
    color: colors.ink,
  },
});
