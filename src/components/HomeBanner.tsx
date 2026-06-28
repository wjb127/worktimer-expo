import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetBanners, Banner } from '../lib/api/config';
import { colors } from '../theme/colors';

// 세션 동안 닫은 배너 id 를 기억한다 (모듈 레벨이라 화면 재진입에도 유지).
// AsyncStorage 등 영속 저장은 의도적으로 쓰지 않음 (세션 한정 숨김).
const dismissedIds = new Set<string>();

// kind 별 아이콘 매핑
const KIND_ICON: Record<Banner['kind'], keyof typeof Ionicons.glyphMap> = {
  notice: 'megaphone',
  event: 'sparkles',
  info: 'information-circle',
};

export default function HomeBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGetBanners()
      .then((list) => {
        if (!alive || list.length === 0) return;
        // 우선순위 높은 순 정렬(백엔드가 이미 정렬해주지만 방어적으로 한 번 더).
        const top = [...list].sort((a, b) => b.priority - a.priority)[0];
        if (top && !dismissedIds.has(top.id)) {
          setBanner(top);
        }
      })
      .catch(() => {
        // 비핵심 기능 — 어떤 에러도 무시하고 아무것도 렌더하지 않는다.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!banner || dismissed) return null;

  const isEvent = banner.kind === 'event';

  const handleDismiss = () => {
    dismissedIds.add(banner.id);
    setDismissed(true);
  };

  const handlePress = async () => {
    if (!banner.actionUrl) return;
    try {
      await Linking.openURL(banner.actionUrl);
    } catch {
      // 잘못된 url 등은 조용히 무시
    }
  };

  const accentColor = isEvent ? colors.white : colors.primary;
  const titleColor = isEvent ? colors.white : colors.ink;
  const bodyColor = isEvent ? colors.white : colors.inkSub;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isEvent ? styles.cardEvent : styles.cardInfo,
      ]}
      activeOpacity={banner.actionUrl ? 0.85 : 1}
      onPress={handlePress}
      disabled={!banner.actionUrl}
    >
      <View style={styles.row}>
        <Ionicons
          name={KIND_ICON[banner.kind]}
          size={20}
          color={accentColor}
          style={styles.icon}
        />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
            {banner.title}
          </Text>
          {banner.body ? (
            <Text style={[styles.body, { color: bodyColor }]} numberOfLines={3}>
              {banner.body}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={accentColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  // notice/info: 연한 블루 배경 + 좌측 강조 바
  cardInfo: {
    backgroundColor: colors.primaryFaint,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  // event: 진한 블루 배경 + 흰 텍스트
  cardEvent: {
    backgroundColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginTop: 1,
    marginRight: 10,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    marginLeft: 10,
  },
});
