import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetBanners, Banner } from '../lib/api/config';
import { colors } from '../theme/colors';

// 세션 동안 닫은 배너 id 를 기억(모듈 레벨 — 화면 재진입에도 유지). 영속 저장은 안 함.
const dismissedIds = new Set<string>();

// SDUI 신뢰경계: 서버가 내려준 URL을 그대로 열지 않는다. 안전한 스킴만 허용해
// 백엔드 탈취 시 악성 딥링크(다른 앱 실행)/피싱 스킴을 못 열게 한다.
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

export default function HomeBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGetBanners()
      .then((list) => {
        if (!alive || list.length === 0) return;
        const top = [...list].sort((a, b) => b.priority - a.priority)[0];
        if (top && !dismissedIds.has(top.id)) setBanner(top);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!banner || dismissed) return null;

  const isEvent = banner.kind === 'event';
  const accentColor = isEvent ? colors.white : colors.primary;
  const titleColor = isEvent ? colors.white : colors.ink;
  const bodyColor = isEvent ? colors.white : colors.inkSub;

  const handleDismiss = () => {
    dismissedIds.add(banner.id);
    setDismissed(true);
  };

  const openActionUrl = async () => {
    // 안전 스킴(https/mailto/tel)만 — 그 외(커스텀 딥링크/file: 등)는 무시
    if (!isSafeActionUrl(banner.actionUrl)) return;
    try {
      await Linking.openURL(banner.actionUrl);
    } catch {
      // 잘못된 url 등은 조용히 무시
    }
  };

  return (
    <>
      {/* 배너 카드 — 탭하면 상세 모달 */}
      <TouchableOpacity
        style={[styles.card, isEvent ? styles.cardEvent : styles.cardInfo]}
        activeOpacity={0.85}
        onPress={() => setDetailOpen(true)}
      >
        <View style={styles.row}>
          <Ionicons
            name={KIND_ICON[banner.kind]}
            size={20}
            color={accentColor}
            style={styles.icon}
          />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {banner.title}
            </Text>
            {banner.body ? (
              <Text style={[styles.body, { color: bodyColor }]} numberOfLines={1}>
                {banner.body}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={accentColor}
            style={styles.chevron}
          />
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={accentColor} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* 상세 모달(페이지) */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDetailOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.kindBadge}>
                <Ionicons
                  name={KIND_ICON[banner.kind]}
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.kindBadgeText}>{KIND_LABEL[banner.kind]}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailOpen(false)}
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
              <TouchableOpacity style={styles.actionBtn} onPress={openActionUrl}>
                <Text style={styles.actionBtnText}>자세히 보기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.closeCta}
                onPress={() => setDetailOpen(false)}
              >
                <Text style={styles.closeCtaText}>확인</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  cardInfo: {
    backgroundColor: colors.primaryFaint,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardEvent: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 10 },
  textCol: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, marginTop: 2 },
  chevron: { marginLeft: 6, opacity: 0.7 },
  closeBtn: { marginLeft: 6 },

  // 상세 모달
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
