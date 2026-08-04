import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

// 웹(PWA)에서 앱을 폰 폭으로 가운데 고정하는 껍데기.
//
// 왜 필요한가: 이 앱의 화면은 전부 모바일 폭 전제로 짜여 있다. 데스크탑 브라우저에서
// 그대로 100% 폭으로 늘리면 달력 셀이 화면만큼 커지고(실측: 1512px에서 하루 칸이
// 거대한 정사각형), 통계·리스트도 가운데가 텅 빈다. 각 화면을 반응형으로 다시 짜는 건
// 이 앱의 스코프가 아니고, 폰 폭 고정이 표준적인 해법이다(대부분의 RN-web 앱이 그렇게 한다).
//
// 네이티브에서는 아무것도 하지 않는다 — children을 그대로 통과시킨다.
const MAX_WIDTH = 480;

export default function WebShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 폰 폭 바깥 여백. 흰 배경이면 앱과 경계가 사라져 "덜 만든 화면"처럼 보인다.
  backdrop: {
    flex: 1,
    alignItems: 'center',
    // colors에 중립 배경 토큰이 없어 여기서만 정의한다(웹 전용 여백).
    backgroundColor: '#EEF2F7',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.white,
    // 넓은 화면에서만 경계선이 보인다(폭이 좁으면 화면과 같은 폭이라 무의미).
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
