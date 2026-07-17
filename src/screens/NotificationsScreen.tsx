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

// 알림 모음 페이지 — 헤더 종 아이콘에서 진입(모달 → 페이지 전환).
// 활성 공지 전체를 리스트로 보여주고, 진입 시 전부 읽음 처리(종 배지 해제).
// 진입 시점에 안 읽었던 항목은 NEW 배지로 구분.

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

export default function NotificationsScreen() {
  const [banners, setBanners] = useState<Banner[] | null>(null); // null = 로딩 중
  // 진입 시점 기준 미확인 id — 읽음 처리 전에 캡처해 NEW 배지로 표시
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    apiGetBanners()
      .then((list) => {
        if (!alive) return;
        const sorted = [...list].sort((a, b) => b.priority - a.priority);
        setNewIds(new Set(sorted.filter((b) => !isBannerRead(b.id)).map((b) => b.id)));
        setBanners(sorted);
        // 목록을 본 순간 전부 읽음 처리 → 헤더 종 배지 해제
        markBannersRead(sorted.map((b) => b.id));
      })
      .catch(() => {
        if (alive) setBanners([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (banners === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (banners.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="notifications-off-outline"
          size={44}
          color={colors.inkSub}
        />
        <Text style={styles.emptyTitle}>새로운 알림이 없어요</Text>
        <Text style={styles.emptySub}>
          공지·이벤트가 올라오면 여기에 모아드릴게요
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={banners}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <BannerCard banner={item} isNew={newIds.has(item.id)} />
      )}
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
