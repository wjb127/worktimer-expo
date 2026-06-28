import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareCard, { ShareCardData } from './ShareCard';
import { apiGetStats } from '../lib/api/profile';
import { apiListSessions } from '../lib/api/sessions';
import { formatDateString } from '../lib/dateUtils';
import { colors } from '../theme/colors';

// 최근 5주(일~토 정렬) 잔디 그리드 빌드. byDate = {YYYY-MM-DD: 초}
function buildWeeks(byDate: Record<string, number>): number[][] {
  const today = new Date();
  const dow = today.getDay(); // 0=일
  const lastSat = new Date(today);
  lastSat.setDate(today.getDate() + (6 - dow)); // 이번주 토요일
  const weeks: number[][] = [];
  for (let w = 4; w >= 0; w--) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastSat);
      date.setDate(lastSat.getDate() - w * 7 - (6 - d));
      week.push(byDate[formatDateString(date)] ?? 0);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function ShareCardModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [data, setData] = useState<ShareCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setData(null);
    (async () => {
      try {
        // 잔디용 최근 35일 범위
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 41); // 5주 + 여유
        const [stats, sessions] = await Promise.all([
          apiGetStats(),
          apiListSessions(formatDateString(start), formatDateString(end)),
        ]);
        const byDate: Record<string, number> = {};
        for (const s of sessions) {
          if (s.end_time) byDate[s.date] = (byDate[s.date] ?? 0) + (s.duration || 0);
        }
        if (!alive) return;
        setData({
          totalSeconds: stats.totalSeconds,
          currentStreakDays: stats.currentStreakDays,
          thisMonthSeconds: stats.thisMonthSeconds,
          weeks: buildWeeks(byDate),
        });
      } catch (e) {
        console.error('share card load error:', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible]);

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: '내 기록 공유하기',
        });
      }
    } catch (e) {
      console.error('share error:', e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>기록 공유</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.inkSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.preview}>
            {loading || !data ? (
              <View style={styles.cardPlaceholder}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ShareCard ref={cardRef} data={data} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, (loading || !data) && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={loading || !data || sharing}
          >
            {sharing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color={colors.white} />
                <Text style={styles.shareText}>공유하기</Text>
              </>
            )}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  preview: { marginBottom: 20 },
  cardPlaceholder: {
    width: 320,
    height: 568,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  shareBtnDisabled: { backgroundColor: colors.primaryLight },
  shareText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
