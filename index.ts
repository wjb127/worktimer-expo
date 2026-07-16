import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Android 홈화면 위젯 태스크 핸들러 — OS가 headless로 앱을 깨울 때 실행되므로
// 루트 컴포넌트 등록 전에 등록해야 한다. registerWidgetTaskHandler는 순수
// AppRegistry.registerHeadlessTask라 iOS 번들에서도 무해(라이브러리가 noop 폴백 처리).
// ⚠️ 여기서 Platform.OS 분기 금지 — headless(위젯) 컨텍스트에서 번들 평가 초기에
// PlatformConstants TurboModule을 조회하다 "runtime not ready"로 죽는 실사고(2026-07-16).
registerWidgetTaskHandler(widgetTaskHandler);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
