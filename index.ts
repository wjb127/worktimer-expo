import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Android 홈화면 위젯 태스크 핸들러 — OS가 headless로 앱을 깨울 때 실행되므로
// 루트 컴포넌트 등록 전에 등록해야 한다 (Android 전용).
if (Platform.OS === 'android') {
  // require: iOS 번들에서 android-widget 네이티브 모듈 참조를 피하기 위한 조건부 로드
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
