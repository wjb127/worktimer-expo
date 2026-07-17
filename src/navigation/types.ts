// 루트 네이티브 스택 라우트 타입 — App.tsx의 Stack.Navigator와 1:1.
// (App.tsx에 두면 컴포넌트 → App 순환 import가 생겨 분리)
export type RootStackParamList = {
  Main: undefined;
  알림: undefined;
};
