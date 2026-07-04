import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import {
  getTodayTotal,
  getOngoingSession,
  startSession,
  endSession,
  cleanupOrphanedSessions,
} from '../lib/session';
import { WorkSession } from '../types/session';
import {
  scheduleHourlyWorkNotifications,
  cancelHourlyWorkNotifications,
  requestNotificationPermissions,
} from '../lib/notifications';
import {
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  isLiveActivityRunning,
} from '../lib/liveActivity';
import { colors } from '../theme/colors';
import HomeBanner from '../components/HomeBanner';
import SessionEndModal from '../components/SessionEndModal';
import MilestoneModal from '../components/MilestoneModal';
import ShareCardModal, { ShareRequest } from '../components/ShareCardModal';
import { apiGetStats } from '../lib/api/profile';
import {
  checkNewMilestones,
  Achievement,
  CATEGORY_LABEL,
} from '../lib/achievements';
import { track } from '../lib/analytics';
import { captureException } from '../lib/errorTracking';

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const day = dayNames[today.getDay()];
  return `${year}년 ${month}월 ${date}일 (${day})`;
};

export default function TimerScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  // 세션 종료 후 업무 기록 모달 — 종료된 세션 id + 그 세션의 경과시간 라벨
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);
  const [endedLabel, setEndedLabel] = useState('');
  // 마일스톤(새 업적 달성) 축하 + 공유
  const [milestone, setMilestone] = useState<Achievement | null>(null);
  const [shareReq, setShareReq] = useState<ShareRequest | null>(null);

  // 세션 종료 모달을 닫은 직후 새 업적 달성 여부 확인 (방금 일해서 달성한 그 순간)
  const checkMilestones = async () => {
    try {
      const stats = await apiGetStats();
      const fresh = await checkNewMilestones(stats);
      if (fresh.length > 0) {
        track('milestone_achieved', { id: fresh[0].id });
        setMilestone(fresh[0]);
      }
    } catch (e) {
      console.error('milestone check error:', e);
      captureException(e, { where: 'checkMilestones' });
    }
  };

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // 백그라운드 작업 (알림, Live Activity) - fire and forget
  const runBackgroundTasks = (ongoing: WorkSession | null, total: number, elapsed: number) => {
    if (ongoing) {
      // 알림 스케줄 (await 없이 실행)
      requestNotificationPermissions().then(() => {
        scheduleHourlyWorkNotifications(elapsed);
      });
      // Live Activity 업데이트
      isLiveActivityRunning().then((running) => {
        if (!running) {
          startLiveActivity(new Date(ongoing.start_time), total);
        }
        updateLiveActivity(elapsed, total);
      });
    } else {
      // 알림 취소 및 Live Activity 종료
      cancelHourlyWorkNotifications();
      endLiveActivity();
    }
  };

  const loadData = async (isRefresh = false) => {
    // 첫 로드일 때만 로딩 표시
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const [total, ongoing] = await Promise.all([
        getTodayTotal(),
        getOngoingSession(),
      ]);

      // 이전 날짜의 고아 세션 정리 (현재 진행 중인 세션은 제외)
      cleanupOrphanedSessions(ongoing?.id);

      setTodayTotal(total);

      let elapsed = 0;
      if (ongoing) {
        setCurrentSession(ongoing);
        setIsRunning(true);

        // 경과 시간 계산 (타임스탬프 기반으로 정확하게)
        const startTime = new Date(ongoing.start_time).getTime();
        const now = Date.now();
        elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      } else {
        setCurrentSession(null);
        setIsRunning(false);
        setElapsedSeconds(0);
      }

      // UI 로딩 즉시 해제 (첫 로드인 경우)
      if (!isRefresh) {
        setLoading(false);
      }

      // 백그라운드 작업 실행 (await 없이)
      runBackgroundTasks(ongoing, total, elapsed);
    } catch (error) {
      console.error('loadData error:', error);
      captureException(error, { where: 'loadData' });
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isInitialLoad.current) {
        // 첫 로드: 로딩 스피너 표시
        isInitialLoad.current = false;
        loadData(false);
      } else {
        // 탭 재방문: 기존 UI 유지하며 백그라운드 갱신
        loadData(true);
      }
    }, [])
  );

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Live Activity 업데이트 (10초마다)
  useEffect(() => {
    if (isRunning && elapsedSeconds % 10 === 0) {
      updateLiveActivity(elapsedSeconds, todayTotal);
    }
  }, [isRunning, elapsedSeconds, todayTotal]);

  const handleStartStop = async () => {
    if (isRunning && currentSession) {
      // 종료 (타임스탬프 기반 duration 계산)
      const endedId = currentSession.id;
      const sessionLabel = formatTime(elapsedSeconds);
      const result = await endSession(currentSession.id, currentSession.start_time);
      if (result) {
        // 세션 종료 계측 — 서버가 타임스탬프로 계산한 duration 우선(백그라운드
        // throttle로 과소집계되는 클라 elapsedSeconds 대신). 없으면 클라값 폴백.
        track('session_end', { duration_seconds: result.duration || elapsedSeconds });
        setIsRunning(false);
        setElapsedSeconds(0);
        setCurrentSession(null);
        // 오늘 총계 다시 로드 (자정 넘김 세션의 정확한 처리)
        const total = await getTodayTotal();
        setTodayTotal(total);
        // 시간별 알림 취소
        await cancelHourlyWorkNotifications();
        // Live Activity 종료
        await endLiveActivity();
        // 업무 기록 모달 표시 (무슨 업무 했는지 + 할일 연결)
        setEndedLabel(sessionLabel);
        setEndedSessionId(endedId);
      }
    } else {
      // 시작
      const session = await startSession();
      if (session) {
        track('session_start');
        setCurrentSession(session);
        setIsRunning(true);
        setElapsedSeconds(0);
        // 알림 권한 요청 및 시간별 알림 스케줄
        await requestNotificationPermissions();
        await scheduleHourlyWorkNotifications();
        // Live Activity 시작
        await startLiveActivity(new Date(session.start_time), todayTotal);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 서버 구동 배너/공지 — 전용 공간(흐름 배치, 콘텐츠를 아래로 밀어냄) */}
      <View style={styles.bannerSlot}>
        <HomeBanner />
      </View>
      <View style={styles.content}>
      <Text style={styles.dateText}>{formatDate()}</Text>
      <View style={styles.timerSection}>
        <View
          style={[styles.statusPill, isRunning ? styles.statusPillRunning : styles.statusPillIdle]}
        >
          <Text
            style={[
              styles.statusPillText,
              isRunning ? styles.statusPillTextRunning : styles.statusPillTextIdle,
            ]}
          >
            {isRunning ? '업무 중' : '대기 중'}
          </Text>
        </View>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* 프로그레스 링 */}
        <Svg width={180} height={180} style={styles.progressRing}>
          {/* 배경 원 */}
          <Circle
            cx={90}
            cy={90}
            r={85}
            stroke={colors.primaryLight}
            strokeWidth={6}
            fill="transparent"
          />
          {/* 프로그레스 원 */}
          {isRunning && (
            <Circle
              cx={90}
              cy={90}
              r={85}
              stroke={colors.primary}
              strokeWidth={6}
              fill="transparent"
              strokeDasharray={2 * Math.PI * 85}
              strokeDashoffset={2 * Math.PI * 85 * (1 - (elapsedSeconds % 60) / 60)}
              strokeLinecap="round"
              rotation={-90}
              origin="90, 90"
            />
          )}
        </Svg>
        <TouchableOpacity
          style={[styles.button, isRunning ? styles.stopButton : styles.startButton]}
          onPress={handleStartStop}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{isRunning ? '종료' : '시작'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>오늘 총 업무 시간</Text>
        <Text style={styles.totalTime}>
          {formatTime(todayTotal + (isRunning ? elapsedSeconds : 0))}
        </Text>
      </View>
      </View>

      {/* 세션 종료 후 업무 기록 모달 — 닫으면 마일스톤 체크 */}
      <SessionEndModal
        sessionId={endedSessionId}
        elapsedLabel={endedLabel}
        onClose={() => {
          setEndedSessionId(null);
          checkMilestones();
        }}
      />

      {/* 새 업적 달성 축하 → 자랑하기 */}
      <MilestoneModal
        achievement={milestone}
        onClose={() => setMilestone(null)}
        onShare={(a) => {
          setMilestone(null);
          setShareReq({
            kind: 'achievement',
            achievement: {
              icon: a.icon,
              title: a.title,
              desc: a.desc,
              categoryLabel: CATEGORY_LABEL[a.category],
            },
          });
        }}
      />
      <ShareCardModal request={shareReq} onClose={() => setShareReq(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // 배너 전용 공간 (흐름 배치 — 콘텐츠를 아래로 밀어내 겹침 없음)
  bannerSlot: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  // 타이머 본문 — 남은 공간에서 중앙 정렬
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    color: colors.inkSub,
    fontWeight: '500',
    marginBottom: 40,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressRing: {
    position: 'absolute',
  },
  // 상태 알약(pill) — 대기 중/업무 중
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  statusPillIdle: {
    backgroundColor: colors.line,
  },
  statusPillRunning: {
    backgroundColor: colors.primaryFaint,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPillTextIdle: {
    color: colors.inkSub,
  },
  statusPillTextRunning: {
    color: colors.primary,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  button: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  totalSection: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: colors.inkSub,
    marginBottom: 8,
  },
  totalTime: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
});
