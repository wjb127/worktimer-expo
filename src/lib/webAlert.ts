// 웹(PWA)에서 Alert가 조용히 사라지는 문제를 막는다.
//
// react-native-web의 Alert는 구현이 통째로 비어 있다:
//   class Alert { static alert() {} }
// 그래서 웹에서는 로그인 실패·구매 오류·삭제 확인 등 앱 전체의 Alert가
// **아무 반응 없이** 삼켜진다(실측: 구글 로그인 버튼을 눌러도 무반응).
//
// 호출부가 수십 군데라 전부 고치는 대신, 웹에서만 Alert.alert에 실제 구현을
// 꽂는다. 네이티브 번들은 이 파일을 평가해도 아무 일도 하지 않는다.
import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
};

let installed = false;

export function installWebAlert(): void {
  if (installed || Platform.OS !== 'web') return;
  installed = true;

  // 브라우저 다이얼로그가 없는 환경(SSR 등)에서는 손대지 않는다.
  if (typeof window === 'undefined') return;

  (Alert as unknown as { alert: (...a: unknown[]) => void }).alert = (
    title?: unknown,
    message?: unknown,
    buttons?: unknown,
  ) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = Array.isArray(buttons) ? (buttons as AlertButton[]) : [];

    // 확인/취소가 있는 경우에만 confirm — 단순 알림에 confirm을 쓰면
    // "취소"가 생겨 사용자가 취소한 것처럼 보인다.
    const cancel = list.find((b) => b.style === 'cancel');
    const action = list.find((b) => b.style !== 'cancel');

    if (cancel && action) {
      const ok = window.confirm(text);
      (ok ? action : cancel).onPress?.();
      return;
    }

    window.alert(text);
    // 버튼이 하나뿐이면 그 핸들러는 확인 후 실행되는 게 원래 동작이다.
    list[0]?.onPress?.();
  };
}
