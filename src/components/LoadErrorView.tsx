import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// 기록을 불러오지 못했을 때 보여주는 화면.
//
// 예전엔 로딩이 실패하면 각 화면이 콘솔 로그만 남기고 빈 상태를 그대로 그렸다.
// 그러면 사용자는 "기록이 없다"고 읽는다 — 실제로 2026-09 Cloudflare 아태
// 네트워크 장애 때 요청이 15초 타임아웃에 걸리자 달력이 텅 비어서
// "기록이 사라졌다/해킹당했나"로 받아들여졌다. 데이터는 멀쩡했다.
// 실패는 실패로 보여주고, 그 자리에서 다시 시도할 수 있게 한다.
export default function LoadErrorView({
  message = '기록을 불러오지 못했어요',
  onRetry,
  retrying = false,
  compact = false,
}: {
  message?: string;
  onRetry: () => void;
  // 다시 시도 중엔 버튼을 잠가 연타로 요청이 쌓이지 않게 한다
  retrying?: boolean;
  // 화면 일부(차트·그리드 자리)에 넣을 때는 여백을 줄인다
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.inkSub} />
      <Text style={styles.title}>{message}</Text>
      <Text style={styles.sub}>
        네트워크가 느리거나 끊겼을 수 있어요.{'\n'}기록은 그대로 있어요.
      </Text>
      <TouchableOpacity
        style={[styles.btn, retrying && styles.btnDisabled]}
        onPress={onRetry}
        disabled={retrying}
        accessibilityRole="button"
        accessibilityLabel="다시 시도"
        testID="load-error-retry"
      >
        {retrying ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.btnText}>다시 시도</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  wrapCompact: { flex: 0, paddingVertical: 28 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  sub: { fontSize: 13, color: colors.inkSub, textAlign: 'center', lineHeight: 19 },
  btn: {
    marginTop: 10,
    minWidth: 120,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
