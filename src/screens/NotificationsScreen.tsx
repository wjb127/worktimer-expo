import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetBanners, Banner } from '../lib/api/config';
import { colors } from '../theme/colors';
import { isBannerRead, markBannersRead, openActionUrl } from '../lib/announcements';
import {
  getInbox,
  markInboxRead,
  InboxItem,
} from '../lib/notificationInbox';

// 알림 모음 페이지 — 헤더 종 아이콘에서 진입.
// 수신한 로컬 알림(인박스)을 최신순으로 쌓아 보여주고, 그 아래에 서버 공지(배너)를 표시.
// 진입 시 전부 읽음 처리(종 배지 해제). 진입 시점에 안 읽었던 항목은 NEW 배지로 구분.

// 수신 시각 → 상대시간 표기
function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(ms);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

// 수신 알림 카드
function NotifCard({ item, isNew }: { item: InboxItem; isNew: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.kindBadge}>
          <Ionicons name="notifications" size={14} color={colors.primary} />
          <Text style={styles.kindBadgeText}>알림</Text>
        </View>
        <View style={styles.rightMeta}>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          <Text style={styles.timeText}>{relTime(item.receivedAt)}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
    </View>
  );
}

const KIND_ICON: Record<Banner['kind'], keyof typeof Ionicons.glyphMap> = {
  notice: 'megaphone',
  event: 'sparkles',
  info: 'information-circle',
};
const KIND_LABEL: Record<Banner['kind'], string> = {
  notice: '공지',
  event: '이벤트',
  info: '안내',
};

function BannerCard({ banner, isNew }: { banner: Banner; isNew: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.kindBadge}>
          <Ionicons
            name={KIND_ICON[banner.kind]}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.kindBadgeText}>{KIND_LABEL[banner.kind]}</Text>
        </View>
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle}>{banner.title}</Text>
      {banner.body ? <Text style={styles.cardBody}>{banner.body}</Text> : null}
      {banner.actionUrl ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openActionUrl(banner.actionUrl)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>자세히 보기</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// 병합 리스트 행 — 수신 알림(위) + 서버 공지(아래)
type Row =
  | { type: 'notif'; item: InboxItem; isNew: boolean }
  | { type: 'banner'; banner: Banner; isNew: boolean };

export default function NotificationsScreen() {
  const [rows, setRows] = useState<Row[] | null>(null); // null = 로딩 중

  useEffect(() => {
    let alive = true;
    (async () => {
      // 인박스(수신 알림) + 서버 배너를 함께 로드
      const [inbox, banners] = await Promise.all([
        getInbox(),
        apiGetBanners().catch(() => [] as Banner[]),
      ]);
      if (!alive) return;
      const sortedBanners = [...banners].sort((a, b) => b.priority - a.priority);
      // 진입 시점 NEW 판정 (읽음 처리 전에 캡처)
      const notifRows: Row[] = inbox.map((item) => ({
        type: 'notif',
        item,
        isNew: !item.read,
      }));
      const bannerRows: Row[] = sortedBanners.map((banner) => ({
        type: 'banner',
        banner,
        isNew: !isBannerRead(banner.id),
      }));
      setRows([...notifRows, ...bannerRows]); // 수신 알림 최신순 위, 공지 아래
      // 본 순간 전부 읽음 처리 → 헤더 종 배지 해제
      markBannersRead(sortedBanners.map((b) => b.id));
      void markInboxRead();
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="notifications-off-outline"
          size={44}
          color={colors.inkSub}
        />
        <Text style={styles.emptyTitle}>새로운 알림이 없어요</Text>
        <Text style={styles.emptySub}>
          알림·공지가 오면 여기에 모아드릴게요
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={rows}
      keyExtractor={(r, i) =>
        r.type === 'notif' ? `n-${r.item.id}-${i}` : `b-${r.banner.id}`
      }
      contentContainerStyle={styles.listContent}
      renderItem={({ item: row }) =>
        row.type === 'notif' ? (
          <NotifCard item={row.item} isNew={row.isNew} />
        ) : (
          <BannerCard banner={row.banner} isNew={row.isNew} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 14,
    color: colors.inkSub,
    marginTop: 6,
    textAlign: 'center',
  },
  list: { backgroundColor: colors.white },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  kindBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  newBadge: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  newBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { color: colors.inkSub, fontSize: 12 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  cardBody: { fontSize: 14, lineHeight: 21, color: colors.inkSub },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  actionBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
