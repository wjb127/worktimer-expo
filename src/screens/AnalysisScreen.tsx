import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';

// 프리미엄(AI 분석) 출시 알림 신청 여부 저장 키
const PREMIUM_INTEREST_KEY = 'premium_interest_requested_v1';

// AI 업무 분석 — 출시 예정(유료화 예정) 잠금 화면.
// 실제 분석 엔진(Anthropic Haiku)은 후속 릴리즈에서 연결.

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    icon: 'bar-chart',
    title: '패턴 분석',
    desc: '시간대·요일별 집중 패턴과 업무 흐름을 자동으로 분석해요.',
  },
  {
    icon: 'bulb',
    title: '맞춤 코칭',
    desc: '잘한 점과 개선점을 짚고, 내일을 위한 실천 제안을 받아요.',
  },
  {
    icon: 'trending-up',
    title: '생산성 리포트',
    desc: '할 일과 연결된 시간을 토대로 무엇에 시간을 썼는지 한눈에.',
  },
  {
    icon: 'chatbubbles',
    title: 'AI 질문하기',
    desc: '“어제보다 오늘 집중이 늘었어?” 처럼 자유롭게 물어보세요.',
  },
];

export default function AnalysisScreen() {
  // 출시 알림 신청 완료 상태 (마운트 시 저장값 복원)
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_INTEREST_KEY)
      .then((v) => {
        if (v === '1') setRequested(true);
      })
      .catch(() => {
        // 무시 (저장 조회 실패해도 화면은 정상 동작)
      });
  }, []);

  const handleInterest = async () => {
    track('premium_interest_click');
    setRequested(true);
    try {
      await AsyncStorage.setItem(PREMIUM_INTEREST_KEY, '1');
    } catch {
      // 무시
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 히어로 */}
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={34} color={colors.primary} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>출시 예정</Text>
        </View>
        <Text style={styles.heroTitle}>AI 업무 분석</Text>
        <Text style={styles.heroDesc}>
          쌓인 기록과 할 일을 바탕으로{'\n'}AI가 나의 업무를 분석해줘요.
        </Text>
      </View>

      {/* 기능 미리보기 */}
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={colors.line} />
          </View>
        ))}
      </View>

      {/* 출시 알림 받기 (프리미엄 관심 표시) */}
      <View style={styles.cta}>
        {requested ? (
          <View style={styles.doneChip}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.doneText}>
              알림 신청 완료! 출시되면 알려드릴게요
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.ctaHelper}>
              AI 분석은 프리미엄 기능으로 준비 중이에요
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleInterest}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>출시 알림 받기</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 안내 */}
      <View style={styles.notice}>
        <Ionicons name="time-outline" size={18} color={colors.inkSub} />
        <Text style={styles.noticeText}>
          준비 중인 기능이에요. 곧 업데이트로 만나요.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  heroDesc: {
    fontSize: 14,
    color: colors.inkSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  featureList: { gap: 10, marginTop: 8 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextCol: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  featureDesc: { fontSize: 13, color: colors.inkSub, marginTop: 3, lineHeight: 18 },
  // 출시 알림 CTA
  cta: { marginTop: 20, alignItems: 'center' },
  ctaHelper: {
    fontSize: 13,
    color: colors.inkSub,
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  // 신청 완료 칩 (비활성 표시)
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.primaryFaint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  doneText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
  },
  noticeText: { fontSize: 13, color: colors.inkSub },
});
