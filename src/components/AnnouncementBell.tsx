import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiGetBanners } from '../lib/api/config';
import { colors } from '../theme/colors';
import { isBannerRead, subscribeReadChange } from '../lib/announcements';
import type { RootStackParamList } from '../navigation/types';

// 헤더 우측 공지 종(bell) 아이콘 — 탭하면 알림 모음 페이지로 이동(상세 모달 → 페이지 전환).
// 미확인 공지가 하나라도 있으면 빨간 점 배지. 읽음 상태는 announcements.ts가 공유.

export default function AnnouncementBell() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [bannerIds, setBannerIds] = useState<string[]>([]);
  // 알림 페이지에서 읽음 처리되면 리렌더해 배지를 다시 계산
  const [, setReadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGetBanners()
      .then((list) => {
        if (alive) setBannerIds(list.map((b) => b.id));
      })
      .catch(() => {});
    const unsubscribe = subscribeReadChange(() => setReadTick((n) => n + 1));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const showDot = bannerIds.some((id) => !isBannerRead(id));

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('알림')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.bellBtn}
      accessibilityLabel="알림 모음 열기"
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {showDot && <View style={styles.dot} />}
    </TouchableOpacity>
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
});
