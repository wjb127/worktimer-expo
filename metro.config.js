// Metro 설정 — 존재 이유는 단 하나, **웹 번들에서만** 네이티브 전용 모듈을 스텁으로
// 갈아끼우기 위해서다. 웹 번들은 Tauri 데스크탑 앱(ss-062-filltime-desktop)이 로드한다.
//
// ⚠️ platform === 'web' 일 때만 분기한다. ios/android 번들은 이 파일이 없을 때와
//    완전히 동일한 경로를 탄다(getDefaultConfig 그대로 + resolveRequest 패스스루).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 데스크탑에 존재하지 않는 개념(홈화면 위젯)이라 no-op 스텁으로 대체한다.
// 실제 모듈은 AppRegistry.registerHeadlessTask를 부르는데 react-native-web에
// 그 API가 없어 번들 평가 중 TypeError로 앱이 아예 못 뜬다.
const WEB_STUBS = {
  'react-native-android-widget': path.resolve(
    __dirname,
    'src/web-stubs/react-native-android-widget.tsx',
  ),
  // expo-secure-store는 웹 구현이 자체가 없어 토큰 조회에서 즉사한다(로그인 불가).
  // localStorage 기반 셰임으로 대체 — 근거는 스텁 파일 상단 주석 참조.
  'expo-secure-store': path.resolve(__dirname, 'src/web-stubs/expo-secure-store.ts'),
  // expo-notifications는 웹에서 대부분의 메서드가 throw한다. 세션 종료 흐름이
  // 예약 알림을 재계산하다 걸려 "종료" 버튼이 통째로 먹통이 된다(실측).
  'expo-notifications': path.resolve(__dirname, 'src/web-stubs/expo-notifications.ts'),
};

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
