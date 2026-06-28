# 실기기(아이폰) E2E 자동화 — 방법론

**최종 갱신**: 2026-06-22

Expo RN 앱을 **물리 아이폰**에서 AI(나)가 CLI로 직접 제어해 E2E 돌리는 법.
펴볼 때: 시뮬레이터 말고 실기기 자동 테스트 셋업할 때, Metro/서브넷 때문에 폰에서 "작동 안 됨" 날 때, e2e 빌드 프로필 만들 때.

## 한 줄 결론
**가능. 1회 사람 손(USB·신뢰·개발자모드·인증서) → 이후 전부 AI 반복.**
진짜 병목은 폰 제어가 아니라 **Metro 번들(WiFi/서브넷)**. standalone `e2e` 빌드로 없애는 게 최대 레버.

## ★ 핵심 수정 — Metro 의존 제거 (이거부터)
- 지금 폰 빌드 = dev-client → **WiFi로 Metro 번들 받아야 구동** → 폰이 맥과 다른 서브넷이면 못 받아 "작동 안 됨". 자동화엔 치명.
- 해법: **Metro 안 타는 standalone `e2e` IPA** + dev-login 버튼을 `__DEV__` 대신 **env 플래그**로 게이팅.
  1. `eas.json`에 `e2e` 프로필(release형, `developmentClient` 없음), `EXPO_PUBLIC_E2E=1`
  2. `LoginScreen.tsx` 게이트: `{__DEV__ && ...}` → `{process.env.EXPO_PUBLIC_E2E === '1' && ...}`
     - testID `dev-login-button` 유지. App Store 빌드엔 절대 안 들어감(플래그 OFF). `/auth/dev-login` 우회 그대로.
  3. `eas build --profile e2e --platform ios` → `.ipa` 확보. **Metro·서브넷 문제 소멸.**

## 추천 경로 (1순위: Maestro on-device)
이미 통과한 `.maestro/*.yaml` 플로우를 그대로 실기기에서 실행.
- 도구: **DeviceLab `maestro-ios-device`** (비공식 포팅, PR #2856 기반, iOS 18/26 검증). ⚠️ Maestro **공식** 실기기 지원은 2026 중반에도 미출시 — 이 포팅 사용.
- 준비물: Team ID `9Q26686S8R`(`security find-identity -v -p codesigning`), UDID(`xcrun xctrace list devices`).
- 실행(터미널 2개, **USB 전용, 포트 6001 자동 포워딩**):
  ```bash
  # T1: 서명된 XCTest 브리지 기동
  maestro-ios-device --team-id 9Q26686S8R --device <UDID>
  # T2: 플로우 실행 (--app-file 필수)
  maestro --driver-host-port 6001 --device <UDID> --app-file <path>.ipa test .maestro/full-flow.yaml
  ```
- 한계: `clearState`=재설치, `setLocation` 제한, `addMedia` 미지원(Apple 제약).

## 폴백 (2순위: Appium + WebDriverAgent)
Maestro 실기기가 불안정하면. 더 무겁지만 견고하고 100% AI 스크립트 가능.
- WDA를 내 팀으로 서명 + 기기 신뢰 + **개발자 모드 + 설정→개발자→Enable UI Automation** + `appium-xcuitest-driver`
- **`iproxy 8100 8100`** 로 WDA REST 포트 포워딩 → `http://localhost:8100/status` 확인
- 내가 Bash/Node에서 **WebDriver REST API 직접 호출**(POST sessions, `/element`, `/click`, `/wda/swipe`)로 드라이브
- iOS 17+ usbmuxd→RemoteXPC 전환 주의: 최신 xcuitest-driver + pymobiledevice3면 OK. WDA 미리 빌드·설치해 매 런 15s/120MB 절약.

## 1회 사람 vs AI 반복 (정직하게)
- **1회 사람(자동화 불가)**: ① USB 연결 + "이 컴퓨터 신뢰" + 잠금해제 ② 개발자 모드 켜기(+재부팅) ③ WDA/러너 개발자 인증서 1회 신뢰(설정→일반→VPN·기기관리) ④ 팀 서명/프로비저닝 부트스트랩
- **이후 AI 반복**: IPA 설치(`devicectl`/eas), 드라이버·`iproxy` 기동, 플로우 실행, REST 드라이브, 스크린샷, 검증
- **매 런 사람 가능성**: OS 권한 시트(알림·애플 로그인) — 단 `/auth/dev-login` 우회 + release 빌드로 대부분 제거. 폰 잠금해제+USB 유지 필수.

## 안 되는 것 (쓰지 말 것)
- `xcrun devicectl` = **lifecycle만**(설치/실행/종료). tap/swipe/스크린샷·UI 자동화 **불가**.
- Meta `idb` = **사실상 방치**(Flipper 2025-09 archive, Appium도 `appium-idb` deprecated). 기기 자동화에 쓰지 말 것.
- 첫파티 Apple CLI로 WDA/XCUITest 없이 실기기 탭 하는 방법 **없음**.

## Flutter와 비교 (사용자 경험 검증)
`flutter drive`가 실기기서 된 건 `integration_test`를 앱 바이너리에 컴파일해 USB로 Dart VM에 직접 붙어서(화이트박스). RN은 in-process 드라이버 없음 → 밖에서 Appium/XCUITest·Maestro로. 대신 RN은 **진짜 네이티브 접근성 트리** 노출 → `testID`/`accessibilityLabel` 그대로 보여 Flutter 캔버스보다 유리. (iOS 트리 깊이 60 캡 → `snapshotMaxDepth` 튜닝)

## 같이 보면 좋은 문서
- `06-app-multitenancy-m1.md` — Maestro 플로우/시뮬 E2E/dev-login 우회/Phase6 함정
- `04-platform-backend.md` — `/auth/dev-login` 엔드포인트(env 게이팅)
