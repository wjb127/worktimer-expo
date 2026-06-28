import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  WorkReminderSettings,
  WorkIntervalSettings,
  DEFAULT_WORK_REMINDER,
  DEFAULT_WORK_INTERVAL,
  INTERVAL_OPTIONS,
  getWorkReminderSettings,
  saveWorkReminderSettings,
  getWorkIntervalSettings,
  saveWorkIntervalSettings,
  scheduleWorkReminder,
  scheduleIntervalWorkNotifications,
  cancelIntervalWorkNotifications,
  requestNotificationPermissions,
  sendTestNotification,
  WeekDay,
} from '../lib/notifications';
import { useAuth } from '../lib/auth/AuthContext';
import { apiFetch } from '../lib/api/client';
import { getOngoingSession } from '../lib/session';
import { colors } from '../theme/colors';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function SettingsScreen() {
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('계정 삭제', '모든 기록이 영구 삭제됩니다. 계속할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch('/auth/account', { method: 'DELETE' });
          } finally {
            await signOut();
          }
        },
      },
    ]);
  };

  const [reminderSettings, setReminderSettings] = useState<WorkReminderSettings>(DEFAULT_WORK_REMINDER);
  const [intervalSettings, setIntervalSettings] = useState<WorkIntervalSettings>(DEFAULT_WORK_INTERVAL);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const [settings, interval] = await Promise.all([
      getWorkReminderSettings(),
      getWorkIntervalSettings(),
    ]);
    setReminderSettings(settings);
    setIntervalSettings(interval);
    setTempHour(settings.hour);
    setTempMinute(settings.minute);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('권한 필요', '알림을 받으려면 알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
        return;
      }
    }

    const newSettings = { ...reminderSettings, enabled };
    setReminderSettings(newSettings);
    await saveWorkReminderSettings(newSettings);
    await scheduleWorkReminder(newSettings);
  };

  const handleSaveTime = async () => {
    const newSettings = { ...reminderSettings, hour: tempHour, minute: tempMinute };
    setReminderSettings(newSettings);
    await saveWorkReminderSettings(newSettings);
    if (newSettings.enabled) {
      await scheduleWorkReminder(newSettings);
    }
    setShowTimePicker(false);
  };

  const handleToggleDay = async (day: WeekDay) => {
    let newDays: WeekDay[];
    if (reminderSettings.days.includes(day)) {
      newDays = reminderSettings.days.filter((d) => d !== day);
    } else {
      newDays = [...reminderSettings.days, day].sort((a, b) => a - b);
    }

    const newSettings = { ...reminderSettings, days: newDays };
    setReminderSettings(newSettings);
    await saveWorkReminderSettings(newSettings);
    if (newSettings.enabled) {
      await scheduleWorkReminder(newSettings);
    }
  };

  const handleTestNotification = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('권한 필요', '알림 권한이 필요합니다.');
      return;
    }
    await sendTestNotification();
    Alert.alert('알림 전송', '2초 후 테스트 알림이 도착합니다.');
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
  };

  const getSelectedDaysText = () => {
    if (reminderSettings.days.length === 0) return '없음';
    if (reminderSettings.days.length === 7) return '매일';
    if (
      reminderSettings.days.length === 5 &&
      [1, 2, 3, 4, 5].every((d) => reminderSettings.days.includes(d as WeekDay))
    ) {
      return '평일';
    }
    if (
      reminderSettings.days.length === 2 &&
      [0, 6].every((d) => reminderSettings.days.includes(d as WeekDay))
    ) {
      return '주말';
    }
    return reminderSettings.days.map((d) => WEEKDAY_NAMES[d]).join(', ');
  };

  const handleToggleIntervalNotification = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('권한 필요', '알림을 받으려면 알림 권한이 필요합니다.');
        return;
      }
    }
    const newSettings = { ...intervalSettings, enabled };
    setIntervalSettings(newSettings);
    await saveWorkIntervalSettings(newSettings);

    // 진행 중인 세션이 있으면 알림 스케줄 업데이트
    const ongoingSession = await getOngoingSession();
    if (ongoingSession) {
      if (enabled) {
        const startTime = new Date(ongoingSession.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        await scheduleIntervalWorkNotifications(elapsed, newSettings);
      } else {
        await cancelIntervalWorkNotifications();
      }
    }
  };

  const handleSelectInterval = async (minutes: number) => {
    const newSettings = { ...intervalSettings, intervalMinutes: minutes };
    setIntervalSettings(newSettings);
    await saveWorkIntervalSettings(newSettings);
    setShowIntervalPicker(false);

    // 진행 중인 세션이 있으면 알림 스케줄 업데이트
    const ongoingSession = await getOngoingSession();
    if (ongoingSession && newSettings.enabled) {
      const startTime = new Date(ongoingSession.start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      await scheduleIntervalWorkNotifications(elapsed, newSettings);
    }
  };

  const getIntervalText = (minutes: number): string => {
    const option = INTERVAL_OPTIONS.find((o) => o.value === minutes);
    return option ? option.label : `${minutes}분`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* 알림 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>업무 시작 리마인더</Text>
            <Text style={styles.settingDescription}>설정한 시간에 알림을 받습니다</Text>
          </View>
          <Switch
            value={reminderSettings.enabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: colors.line, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {reminderSettings.enabled && (
          <>
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowTimePicker(true)}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>알림 시간</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {formatTime(reminderSettings.hour, reminderSettings.minute)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.inkSub} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowDayPicker(true)}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>반복 요일</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{getSelectedDaysText()}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.inkSub} />
              </View>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.settingItem} onPress={handleTestNotification}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>테스트 알림 보내기</Text>
          </View>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 업무 중 반복 알림 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>업무 중 알림</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>반복 알림</Text>
            <Text style={styles.settingDescription}>업무 중 정기적으로 알림을 받습니다</Text>
          </View>
          <Switch
            value={intervalSettings.enabled}
            onValueChange={handleToggleIntervalNotification}
            trackColor={{ false: colors.line, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {intervalSettings.enabled && (
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowIntervalPicker(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>알림 주기</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {getIntervalText(intervalSettings.intervalMinutes)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 정보 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>버전</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>
      </View>

      {/* 시간 선택 모달 */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>알림 시간 설정</Text>
            <View style={styles.timePickerContainer}>
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={() => setTempHour((h) => (h + 1) % 24)}>
                  <Ionicons name="chevron-up" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{String(tempHour).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}>
                  <Ionicons name="chevron-down" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.pickerSeparator}>:</Text>
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={() => setTempMinute((m) => (m + 5) % 60)}>
                  <Ionicons name="chevron-up" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{String(tempMinute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}>
                  <Ionicons name="chevron-down" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveTime}>
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 요일 선택 모달 */}
      <Modal visible={showDayPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>반복 요일 선택</Text>
            <View style={styles.dayPickerContainer}>
              {WEEKDAY_NAMES.map((name, index) => {
                const isSelected = reminderSettings.days.includes(index as WeekDay);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                    onPress={() => handleToggleDay(index as WeekDay)}
                  >
                    <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={async () => {
                  const newSettings = { ...reminderSettings, days: [1, 2, 3, 4, 5] as WeekDay[] };
                  setReminderSettings(newSettings);
                  await saveWorkReminderSettings(newSettings);
                  if (newSettings.enabled) await scheduleWorkReminder(newSettings);
                }}
              >
                <Text style={styles.presetButtonText}>평일</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={async () => {
                  const newSettings = { ...reminderSettings, days: [0, 1, 2, 3, 4, 5, 6] as WeekDay[] };
                  setReminderSettings(newSettings);
                  await saveWorkReminderSettings(newSettings);
                  if (newSettings.enabled) await scheduleWorkReminder(newSettings);
                }}
              >
                <Text style={styles.presetButtonText}>매일</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={() => setShowDayPicker(false)}>
              <Text style={styles.saveButtonText}>완료</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 알림 주기 선택 모달 */}
      <Modal visible={showIntervalPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIntervalPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>알림 주기 선택</Text>
            <ScrollView style={styles.intervalList}>
              {INTERVAL_OPTIONS.map((option) => {
                const isSelected = intervalSettings.intervalMinutes === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.intervalOption, isSelected && styles.intervalOptionSelected]}
                    onPress={() => handleSelectInterval(option.value)}
                  >
                    <Text
                      style={[
                        styles.intervalOptionText,
                        isSelected && styles.intervalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowIntervalPicker(false)}
            >
              <Text style={styles.saveButtonText}>완료</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.accountSection}>
        <TouchableOpacity onPress={handleLogout} style={styles.accountButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={styles.accountButton}
        >
          <Text style={styles.deleteAccountText}>계정 삭제</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accountSection: {
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  accountButton: {
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: colors.primary,
  },
  deleteAccountText: {
    fontSize: 16,
    color: colors.danger,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSub,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.ink,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.inkSub,
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    color: colors.inkSub,
    marginRight: 4,
  },
  versionText: {
    fontSize: 16,
    color: colors.inkSub,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerColumn: {
    alignItems: 'center',
  },
  pickerValue: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.ink,
    marginVertical: 8,
  },
  pickerSeparator: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.ink,
    marginHorizontal: 16,
  },
  dayPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSub,
  },
  dayButtonTextSelected: {
    color: colors.white,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
  },
  presetButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  intervalList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  intervalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  intervalOptionSelected: {
    backgroundColor: colors.primaryFaint,
  },
  intervalOptionText: {
    fontSize: 16,
    color: colors.ink,
  },
  intervalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
