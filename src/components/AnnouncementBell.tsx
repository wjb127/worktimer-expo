import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetBanners, Banner } from '../lib/api/config';
import { colors } from '../theme/colors';

// 헤더 우측 공지 종(bell) 아이콘 — 배너를 타이머 화면에서 빼내 히어로 공간을 비운다.
// 미확인 공지가 있으면 빨간 점 배지, 탭하면 상세 모달(제목/본문/액션).

// SDUI 신뢰경계: 서버 URL은 안전 스킴만 오픈 (백엔드 탈취 시 악성 딥링크 차단)
const ALLOWED_URL_SCHEMES = ['https:', 'mailto:', 'tel:'];
const isSafeActionUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  const colon = url.indexOf(':');
  if (colon < 0) return false;
  return ALLOWED_URL_SCHEMES.includes(url.slice(0, colon + 1).toLowerCase());
};

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

// 세션 동안 "읽음" 처리한 배너 id (모듈 레벨 — 화면 재진입에도 유지)
const readIds = new Set<string>();

export default function AnnouncementBell() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGetBanners()
      .then((list) => {
        if (!alive || list.length === 0) return;
        const top = [...list].sort((a, b) => b.priority - a.priority)[0];
        if (top) {
          setBanner(top);
          setRead(readIds.has(top.id));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const openDetail = () => {
    if (banner) {
      readIds.add(banner.id);
      setRead(true);
    }
    setOpen(true);
  };

  const openActionUrl = async () => {
    if (!banner || !isSafeActionUrl(banner.actionUrl)) return;
    try {
      await Linking.openURL(banner.actionUrl);
    } catch {
      // 잘못된 url 등은 조용히 무시
    }
  };

  const showDot = !!banner && !read;

  return (
    <>
      <TouchableOpacity
        onPress={openDetail}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.bellBtn}
        accessibilityLabel="공지 알림"
      >
        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        {showDot && <View style={styles.dot} />}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {banner && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.kindBadge}>
                    <Ionicons
                      name={KIND_ICON[banner.kind]}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.kindBadgeText}>
                      {KIND_LABEL[banner.kind]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color={colors.inkSub} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.sheetTitle}>{banner.title}</Text>
                {banner.body ? (
                  <Text style={styles.sheetBody}>{banner.body}</Text>
                ) : null}
                {banner.actionUrl ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={openActionUrl}
                  >
                    <Text style={styles.actionBtnText}>자세히 보기</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.closeCta}
                    onPress={() => setOpen(false)}
                  >
                    <Text style={styles.closeCtaText}>확인</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    paddingHorizontal: 6,
    marginRight: 8,
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  // 상세 모달 — HomeBanner 상세와 동일 룩
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 22,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 10,
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSub,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  closeCta: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeCtaText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
