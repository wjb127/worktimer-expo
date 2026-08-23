import { Platform } from "react-native";

// 웹에서 모달이 브라우저 전체 폭으로 퍼지는 것을 막는다.
//
// WebShell 이 앱 화면을 480px로 가운데 고정하는데, react-native 의 Modal 은
// 그 트리 밖(document.body 에 붙는 포털)으로 렌더돼서 클램프가 걸리지 않는다.
// 그래서 데스크탑에서 '할 일 수정'·세션 종료 시트 같은 게 1280px로 늘어졌다.
//
// 모달마다 스타일을 고치는 대신 여기서 한 번에 잡는다 — 새 모달이 추가돼도
// 자동으로 적용되고, 빠뜨릴 여지가 없다.
//
// react-native-web 의 Modal 구조 (exports/Modal/ModalContent.js):
//   <div aria-modal="true" role="dialog" style="position:fixed; inset:0">
//     <div style="top:0; flex:1">   ← 여기를 클램프한다
//       ...앱이 그린 오버레이/시트...
//
// 바깥 div(position:fixed)는 그대로 두고 안쪽 컨테이너만 좁히기 때문에,
// 딤 처리도 폰 화면 폭에 맞춰져 WebShell 의 '기기 프레임' 느낌과 일관된다.

const MAX_WIDTH = 480;
const STYLE_ID = "filltime-modal-clamp";

export function installWebModalClamp(): void {
  if (Platform.OS !== "web") return;
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
[aria-modal="true"] > * {
  max-width: ${MAX_WIDTH}px;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 100%;
}
`;
  document.head.appendChild(style);
}
