import { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';
import { startLocalTrial } from '../lib/premium';
import { getCurrentOffering, purchasePremium } from '../lib/purchases';

// 프리미엄 페이월 (재사용) — AI 분석 / 기록 수정 등 프리미엄 기능 진입 게이트.
// 현재는 스토어 결제 오픈 전이라 "무료 체험 시작" = 로컬 언락.
// RC 오퍼링(상품) 구성 후 이 버튼을 실제 구매/트라이얼 플로우로 교체한다 (Phase 3).

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'sparkles', text: 'AI 업무 분석 — 패턴·코칭·리포트' },
  { icon: 'create', text: '기록 수정 — 지난 세션 시간 편집' },
  { icon: 'color-palette', text: '공유 카드 테마 (준비 중)' },
];

interface Props {
  visible: boolean;
  featureName: string; // 예: "AI 분석", "기록 수정"
  onClose: () => void;
  onUnlocked: () => void; // 체험 시작(언락) 완료 시
}

export default function PaywallModal({
  visible,
  featureName,
  onClose,
  onUnlocked,
}: Props) {
  const insets = useSafeAreaInsets();
  const [starting, setStarting] = useState(false);
  // RC 오퍼링(스토어 상품)이 구성돼 있으면 실결제, 아니면 로컬 체험 폴백
  const [priceLabel, setPriceLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    getCurrentOffering()
      .then((o) => {
        const pkg = o?.availablePackages?.[0];
        setPriceLabel(pkg ? pkg.product.priceString : null);
      })
      .catch(() => setPriceLabel(null));
  }, [visible]);

  const handleStartTrial = async () => {
    if (starting) return;
    setStarting(true);
    track('premium_interest_click', { feature: featureName });
    if (priceLabel) {
      // 실결제 플로우 (구매/복원 성공 시에만 언락)
      const ok = await purchasePremium();
      setStarting(false);
      if (ok) onUnlocked();
      return;
    }
    // 결제 오픈 전 — 로컬 체험 언락
    await startLocalTrial();
    setStarting(false);
    onUnlocked();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>
            <Ionicons name="diamond" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>필타임 프리미엄</Text>
          <Text style={styles.subtitle}>
            {featureName} 기능은 프리미엄에서 이용할 수 있어요
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <Ionicons name={b.icon} size={18} color={colors.primary} />
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.cta}
            onPress={handleStartTrial}
            activeOpacity={0.85}
            disabled={starting}
          >
            <Text style={styles.ctaText}>
              {priceLabel ? `${priceLabel}로 시작하기` : '무료 체험 시작'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>
            {priceLabel
              ? '언제든 해지할 수 있어요.'
              : '지금은 무료 체험 기간이에요. 정식 구독은 곧 오픈됩니다.'}
          </Text>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>다음에 할게요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 2, 20, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: {
    fontSize: 14,
    color: colors.inkSub,
    marginTop: 6,
    marginBottom: 18,
    textAlign: 'center',
  },
  benefits: { alignSelf: 'stretch', gap: 12, marginBottom: 22 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, color: colors.ink, flex: 1 },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 12, color: colors.inkSub, marginTop: 10 },
  closeBtn: { paddingVertical: 14, marginTop: 2 },
  closeText: { fontSize: 14, color: colors.inkSub },
});
