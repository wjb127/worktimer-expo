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
import ShareCard, {
  ShareVariant,
  AchievementShareData,
  WeeklyData,
} from './ShareCard';
import { apiGetStats } from '../lib/api/profile';
import { apiListSessions } from '../lib/api/sessions';
import { formatDateString } from '../lib/dateUtils';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';

// 공유 요청 — summary는 모달이 직접 로드, 나머지는 데이터 주입받음.
export type ShareRequest =
  | { kind: 'summary' }
  | { kind: 'achievement'; achievement: AchievementShareData }
  | { kind: 'weekly'; weekly: WeeklyData };

// 최근 5주(일~토 정렬) 잔디 그리드
function buildWeeks(byDate: Record<string, number>): number[][] {
  const today = new Date();
  const dow = today.getDay();
  const lastSat = new Date(today);
  lastSat.setDate(today.getDate() + (6 - dow));
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

const TITLE: Record<ShareRequest['kind'], string> = {
  summary: '기록 공유',
  achievement: '업적 공유',
  weekly: '주간 리캡 공유',
};

export default function ShareCardModal({
  request,
  onClose,
}: {
  request: ShareRequest | null;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [variant, setVariant] = useState<ShareVariant | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!request) {
      setVariant(null);
      return;
    }
    // 공유 카드 모달 오픈 계측
    track('share_card_open', { kind: request.kind });
    // 데이터가 이미 있는 종류는 바로 세팅
    if (request.kind === 'achievement') {
      setVariant({ kind: 'achievement', achievement: request.achievement });
      return;
    }
    if (request.kind === 'weekly') {
      setVariant({ kind: 'weekly', weekly: request.weekly });
      return;
    }
    // summary → stats + 잔디 로드
    let alive = true;
    setLoading(true);
    setVariant(null);
    (async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 41);
        const [stats, sessions] = await Promise.all([
          apiGetStats(),
          apiListSessions(formatDateString(start), formatDateString(end)),
        ]);
        const byDate: Record<string, number> = {};
        for (const s of sessions) {
          if (s.end_time) byDate[s.date] = (byDate[s.date] ?? 0) + (s.duration || 0);
        }
        if (!alive) return;
        setVariant({
          kind: 'summary',
          summary: {
            totalSeconds: stats.totalSeconds,
            currentStreakDays: stats.currentStreakDays,
            thisMonthSeconds: stats.thisMonthSeconds,
            weeks: buildWeeks(byDate),
          },
        });
      } catch (e) {
        console.error('share summary load error:', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [request]);

  const handleShare = async () => {
    if (!cardRef.current || sharing || !variant) return;
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
        // 네이티브 공유 성공 후 계측
        track('share_card_shared', { kind: variant.kind });
      }
    } catch (e) {
      console.error('share error:', e);
    } finally {
      setSharing(false);
    }
  };

  const ready = !!variant && !loading;

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{request ? TITLE[request.kind] : ''}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.inkSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.preview}>
            {!ready ? (
              <View style={styles.cardPlaceholder}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ShareCard ref={cardRef} variant={variant} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, !ready && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={!ready || sharing}
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
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
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
