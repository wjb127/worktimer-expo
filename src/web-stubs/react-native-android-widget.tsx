// 웹(PWA) 번들 전용 스텁 — metro.config.js가 web 플랫폼에서만 갈아끼운다.
//
// 실제 모듈의 registerWidgetTaskHandler는 AppRegistry.registerHeadlessTask를 부르는데
// react-native-web에는 그 API가 없어 번들 평가 도중 TypeError로 앱이 통째로 안 뜬다.
// Android 홈화면 위젯은 웹에 존재하지 않는 개념이라 전부 no-op으로 둔다.
//
// index.ts는 건드리지 않는다 — 그 파일에는 "Platform.OS 분기 금지"(headless 컨텍스트에서
// PlatformConstants 조회가 죽는 실사고) 주석이 붙어 있어 네이티브 경로를 그대로 보존한다.
import type { ReactNode } from 'react';

export type WidgetTaskHandlerProps = {
  widgetInfo: { widgetName: string; widgetId: number };
  widgetAction: string;
  renderWidget: (widget: ReactNode) => void;
  clickAction?: string;
  clickActionData?: unknown;
};

export function registerWidgetTaskHandler(_handler: unknown): void {
  // no-op
}

export async function requestWidgetUpdate(_options: unknown): Promise<void> {
  // no-op
}

// FilltimeWidget.tsx가 JSX로 쓰지만 웹에서는 렌더되지 않는다(위젯 자체가 없음).
// 번들 평가만 통과하면 되므로 null 컴포넌트로 둔다.
export const FlexWidget = (_props: Record<string, unknown>): null => null;
export const TextWidget = (_props: Record<string, unknown>): null => null;
