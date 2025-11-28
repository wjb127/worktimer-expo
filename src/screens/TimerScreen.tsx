import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTodayTotal,
  getOngoingSession,
  startSession,
  endSession,
} from '../lib/session';
import { WorkSession } from '../types/session';

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function TimerScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [total, ongoing] = await Promise.all([
        getTodayTotal(),
        getOngoingSession(),
      ]);

      setTodayTotal(total);

      if (ongoing) {
        setCurrentSession(ongoing);
        setIsRunning(true);

        // 경과 시간 계산
        const startTime = new Date(ongoing.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      } else {
        setCurrentSession(null);
        setIsRunning(false);
        setElapsedSeconds(0);
      }
    } catch (error) {
      console.error('loadData error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
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

  const handleStartStop = async () => {
    if (isRunning && currentSession) {
      // 종료
      const result = await endSession(currentSession.id, elapsedSeconds);
      if (result) {
        setIsRunning(false);
        setTodayTotal((prev) => prev + elapsedSeconds);
        setElapsedSeconds(0);
        setCurrentSession(null);
      }
    } else {
      // 시작
      const session = await startSession();
      if (session) {
        setCurrentSession(session);
        setIsRunning(true);
        setElapsedSeconds(0);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>
          {isRunning ? '업무 중' : '대기 중'}
        </Text>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning ? styles.stopButton : styles.startButton]}
        onPress={handleStartStop}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{isRunning ? '종료' : '시작'}</Text>
      </TouchableOpacity>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>오늘 총 업무 시간</Text>
        <Text style={styles.totalTime}>
          {formatTime(todayTotal + (isRunning ? elapsedSeconds : 0))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timerLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  totalSection: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalTime: {
    fontSize: 32,
    fontWeight: '300',
    color: '#333',
  },
});
