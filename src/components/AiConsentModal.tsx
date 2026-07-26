import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { apiUpdateSettings } from '../lib/api/profile';

// AI 업무 분석은 대화 내용과 업무 기록 요약을 Anthropic(국외)으로 전송한다.
// 전송 전에 무엇이·어디로·왜 가는지 밝히고 명시적 동의를 받는다(App Review 5.1.2(i)).
// ★ 서버가 SSOT — 이 화면은 동의를 "받는" UI일 뿐 경계가 아니다. 미동의 상태로
//   요청이 가면 서버가 403 ai_consent_required로 차단한다.
const PRIVACY_URL = 'https://filltime.vercel.app/privacy';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAgreed: () => void; // 동의 저장 성공 시 (호출부가 원래 하려던 작업을 재시도)
}

export default function AiConsentModal({ visible, onClose, onAgreed }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const handleAgree = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiUpdateSettings({ aiConsent: true });
      onAgreed();
    } catch {
      // 저장 실패 시 동의로 간주하지 않는다 — 다음 시도에서 다시 묻는다.
      Alert.alert(
        '저장하지 못했어요',
        '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setSaving(false);
    }
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
            <Ionicons name="sparkles" size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>AI 분석에 데이터가 사용돼요</Text>
          <Text style={styles.subtitle}>
            분석을 만들려면 아래 내용이 외부 AI로 전송돼요. 동의하시면 바로
            시작할게요.
          </Text>

          <ScrollView style={styles.scroll} bounces={false}>
            <View style={styles.row}>
              <Ionicons name="document-text" size={18} color={colors.primary} />
              <Text style={styles.rowText}>
                전송 내용 — 입력한 대화와 최근 업무 기록 요약(시간·카테고리·메모)
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="globe" size={18} color={colors.primary} />
              <Text style={styles.rowText}>
                전송 대상 — Anthropic (미국). 응답 생성 목적으로만 사용돼요
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={styles.rowText}>
                보관 — Anthropic 정책상 최대 30일간 보관될 수 있어요
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="close-circle" size={18} color={colors.primary} />
              <Text style={styles.rowText}>
                철회 — 설정에서 언제든 끌 수 있고, 끄면 전송이 즉시 중단돼요
              </Text>
            </View>
            <Text style={styles.note}>
              동의하지 않아도 타이머·기록·통계는 그대로 사용할 수 있어요.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.cta}
            onPress={handleAgree}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>동의하고 분석 시작</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.link}>개인정보 처리방침 자세히 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>나중에 할게요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
    maxHeight: '86%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: colors.inkSub,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  scroll: { alignSelf: 'stretch', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  rowText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  note: { fontSize: 13, color: colors.inkSub, marginTop: 4, lineHeight: 19 },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: {
    fontSize: 13,
    color: colors.inkSub,
    textDecorationLine: 'underline',
    marginTop: 14,
  },
  closeBtn: { paddingVertical: 12, marginTop: 2 },
  closeText: { fontSize: 14, color: colors.inkSub },
});
