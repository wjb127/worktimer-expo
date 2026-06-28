import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Achievement } from '../lib/achievements';
import { colors } from '../theme/colors';

// 새 업적 달성 시 축하 + 공유 유도 (마일스톤 트리거).
// 사람이 가장 자랑하고 싶은 그 순간(달성 직후)에 공유 깔때기.
export default function MilestoneModal({
  achievement,
  onClose,
  onShare,
}: {
  achievement: Achievement | null;
  onClose: () => void;
  onShare: (a: Achievement) => void;
}) {
  return (
    <Modal
      visible={!!achievement}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons
              name={achievement?.icon ?? 'trophy'}
              size={56}
              color={colors.white}
            />
          </View>
          <Text style={styles.kicker}>업적 달성</Text>
          <Text style={styles.title}>{achievement?.title}</Text>
          <Text style={styles.desc}>{achievement?.desc}</Text>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => achievement && onShare(achievement)}
          >
            <Ionicons name="share-social" size={18} color={colors.white} />
            <Text style={styles.shareText}>자랑하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 6,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: colors.inkSub,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 22,
  },
  shareText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  closeBtn: { marginTop: 10, paddingVertical: 8 },
  closeText: { color: colors.inkSub, fontSize: 15, fontWeight: '600' },
});
