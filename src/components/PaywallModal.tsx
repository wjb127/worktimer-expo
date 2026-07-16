import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';
import { getCurrentOffering, purchasePremiumPackage } from '../lib/purchases';

// 프리미엄 페이월 (재사용) — AI 분석 / 기록 수정 등 프리미엄 기능 진입 게이트.
// 2플랜(연간 기본선택 + 절약 배지 + 7일 체험 / 월간) 실결제 플로우.
// ⚠️ 오퍼링 조회 실패 시 무료 언락 금지 — 재시도 UI만 노출(감사 #3: 결제 장애가
// 영구 무료 프리미엄으로 바뀌는 문제 제거). 기존 로컬 체험 플래그 보유자는
// premium.ts가 계속 인정(grandfather).

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'sparkles', text: 'AI 업무 분석 — 패턴·코칭·리포트' },
  { icon: 'create', text: '기록 수정 — 지난 세션 시간 편집' },
  { icon: 'color-palette', text: '공유 카드 테마 (준비 중)' },
];

type Plan = 'annual' | 'monthly';

interface Props {
  visible: boolean;
  featureName: string; // 예: "AI 분석", "기록 수정"
  onClose: () => void;
  onUnlocked: () => void; // 구매 완료(언락) 시
}

export default function PaywallModal({
  visible,
  featureName,
  onClose,
  onUnlocked,
}: Props) {
  const insets = useSafeAreaInsets();
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<Plan>('annual');

  const loadOffering = useCallback(() => {
    setLoading(true);
    getCurrentOffering()
      .then((o) => {
        const pkgs = o?.availablePackages ?? [];
        setMonthlyPkg(
          pkgs.find((p) => p.identifier === '$rc_monthly') ?? null,
        );
        setAnnualPkg(pkgs.find((p) => p.identifier === '$rc_annual') ?? null);
      })
      .catch(() => {
        setMonthlyPkg(null);
        setAnnualPkg(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadOffering();
  }, [visible, loadOffering]);

  const selectedPkg = selected === 'annual' ? annualPkg : monthlyPkg;
  const hasPlans = Boolean(annualPkg ?? monthlyPkg);

  // 연간 절약률 — 양쪽 가격이 있을 때만 (월간×12 대비)
  const savingsPct =
    monthlyPkg && annualPkg && monthlyPkg.product.price > 0
      ? Math.round(
          (1 - annualPkg.product.price / (monthlyPkg.product.price * 12)) *
            100,
        )
      : null;

  const handlePurchase = async () => {
    if (starting || !selectedPkg) return;
    setStarting(true);
    track('premium_interest_click', { feature: featureName, plan: selected });
    // 실결제 — 구매/복원 성공 시에만 언락 (실패·취소 시 아무것도 지급하지 않음)
    const ok = await purchasePremiumPackage(selectedPkg);
    setStarting(false);
    if (ok) {
      track('premium_purchase_success', { plan: selected });
      onUnlocked();
    }
  };

  const renderPlans = () => (
    <View style={styles.plans}>
      {annualPkg && (
        <TouchableOpacity
          style={[styles.plan, selected === 'annual' && styles.planSelected]}
          onPress={() => setSelected('annual')}
          activeOpacity={0.85}
        >
          <View style={styles.planHead}>
            <Text style={styles.planName}>연간</Text>
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>7일 무료 체험</Text>
            </View>
          </View>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPrice}>
              {annualPkg.product.priceString}
              <Text style={styles.planPer}> /년</Text>
            </Text>
            {savingsPct !== null && savingsPct > 0 && (
              <Text style={styles.savings}>월간 대비 {savingsPct}% 절약</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      {monthlyPkg && (
        <TouchableOpacity
          style={[styles.plan, selected === 'monthly' && styles.planSelected]}
          onPress={() => setSelected('monthly')}
          activeOpacity={0.85}
        >
          <View style={styles.planHead}>
            <Text style={styles.planName}>월간</Text>
          </View>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPrice}>
              {monthlyPkg.product.priceString}
              <Text style={styles.planPer}> /월</Text>
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

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

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={styles.loading}
            />
          ) : hasPlans ? (
            <>
              {renderPlans()}
              <TouchableOpacity
                style={styles.cta}
                onPress={handlePurchase}
                activeOpacity={0.85}
                disabled={starting || !selectedPkg}
              >
                <Text style={styles.ctaText}>
                  {starting
                    ? '진행 중…'
                    : selected === 'annual'
                      ? '7일 무료 체험 시작'
                      : `${monthlyPkg?.product.priceString ?? ''}/월로 시작하기`}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footnote}>
                {selected === 'annual'
                  ? '체험 종료 후 자동 갱신 · 언제든 해지할 수 있어요'
                  : '언제든 해지할 수 있어요'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.errorText}>
                가격 정보를 불러오지 못했어요.{'\n'}네트워크 확인 후 다시
                시도해주세요.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={loadOffering}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>다시 시도</Text>
              </TouchableOpacity>
            </>
          )}

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
  benefits: { alignSelf: 'stretch', gap: 12, marginBottom: 18 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, color: colors.ink, flex: 1 },
  plans: { alignSelf: 'stretch', gap: 10, marginBottom: 14 },
  plan: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  planSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  trialBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trialBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  planPrice: { fontSize: 18, fontWeight: '800', color: colors.ink },
  planPer: { fontSize: 13, fontWeight: '500', color: colors.inkSub },
  savings: { fontSize: 12, fontWeight: '700', color: colors.primary },
  loading: { marginVertical: 24 },
  errorText: {
    fontSize: 13,
    color: colors.inkSub,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
  },
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
