import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';
import { markOnboardingSeen } from '../lib/onboarding';

// 첫 실행 온보딩 — 가치 소구 3단계 후 로그인으로 유도.
// 수평 스크롤/스와이프 페이저 금지: 한 화면에서 "다음" 버튼으로 슬라이드 내용을 제자리 교체.
// 브랜드 보이스: 몰입·꾸준함·성취 (과로/오래 일하기 미화 금지).

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'timer',
    title: '한 번의 탭으로 기록',
    subtitle: '일을 시작할 때 탭, 끝낼 때 탭.\n오늘의 몰입이 자동으로 쌓여요.',
  },
  {
    icon: 'grid',
    title: '잔디로 꾸준함을 확인',
    subtitle: '매일의 기록이 히트맵과 스트릭으로.\n이어가는 재미가 생겨요.',
  },
  {
    icon: 'trophy',
    title: '성취를 카드로 자랑',
    subtitle: '업적과 주간 기록을\n예쁜 카드로 공유해요.',
  },
];

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  // 마무리(finish/skip) 재진입 가드 — markOnboardingSeen await 사이 더블탭으로
  // 이벤트가 이중 발화(완주율 지표 왜곡)되는 걸 막는다.
  const finishing = useRef(false);

  // 시작하기(마지막 슬라이드) — 완료 계측 후 노출 기록 → 로그인으로.
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    track('onboarding_complete');
    await markOnboardingSeen();
    onDone();
  };

  // 건너뛰기 — 어느 단계에서 건너뛰었는지 함께 계측.
  const skip = async () => {
    if (finishing.current) return;
    finishing.current = true;
    track('onboarding_skip', { step });
    await markOnboardingSeen();
    onDone();
  };

  const next = () => {
    if (isLast) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* 상단 우측 건너뛰기 — 마지막 슬라이드에서는 숨김 */}
      <View style={styles.topBar}>
        {!isLast && (
          <TouchableOpacity
            onPress={skip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="온보딩 건너뛰기"
            testID="onboarding-skip"
          >
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 슬라이드 내용 (제자리 교체) */}
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name={slide.icon} size={52} color={colors.primary} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* 진행 도트 */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step ? styles.dotActive : styles.dotIdle]}
          />
        ))}
      </View>

      {/* 다음 / 시작하기 */}
      <TouchableOpacity
        style={styles.button}
        onPress={next}
        activeOpacity={0.85}
        accessibilityLabel={isLast ? '시작하기' : '다음'}
        testID="onboarding-next"
      >
        <Text style={styles.buttonText}>{isLast ? '시작하기' : '다음'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    // 상/하단 여백은 useSafeAreaInsets로 인라인 주입 (시스템바 겹침 방지)
  },
  topBar: {
    height: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.inkSub },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkSub,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  dotIdle: { backgroundColor: colors.line },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
