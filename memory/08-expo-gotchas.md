# Expo/RN 시행착오 — 빌드·실기기·런타임 함정 모음

**최종 갱신**: 2026-06-28

worktimer-expo에서 실제로 밟은 Expo(SDK54)/RN 함정과 해결. 펴볼 때: 안드로이드/iOS 로컬빌드 막힐 때,
실기기 Metro 연결 안 될 때, 앱이 "작동 안됨" 토스트 뜰 때, 새 Expo 프로젝트 셋업 전 예방용.
→ 이걸 자동 진단/수정하는 스킬: `/expo-fix` (글로벌).

## A. 빌드 환경 (로컬 Gradle/Xcode)

1. **디스크 풀이 모든 빌드 에러의 위장범**. Gradle "Failed to release lock on daemon addresses registry" / 락 에러 → 실제 원인은 `No space left on device`(락파일조차 못 씀). **빌드 실패하면 `df -h /System/Volumes/Data` 부터.**
   - 회수: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`(보통 10~20G, 100% 안전·재생성) → `npm cache clean --force` → `pnpm store prune`.
   - macOS APFS purgeable 때문에 `df`가 여유를 보여줘도 ENOSPC 날 수 있음 → DerivedData 지우면 실제 회수됨.
2. **Gradle 데몬 락 충돌** → `cd android && ./gradlew --stop` 후 `--no-daemon`으로 빌드(원샷엔 데몬 라이프사이클 락 회피). `--console=plain`으로 로그 깔끔.
3. **증분 빌드는 빠르다**. 첫 빌드 15~30분(전 네이티브 컴파일)이지만, 죽었다 재개해도 캐시 살아있어 44초만에 끝남. 첫 빌드 실패해도 캐시는 남으니 원인만 고치고 재개.
4. **eas-cli는 `npx eas-cli`** (npx eas는 패키지명 틀려서 "could not determine executable"). 로컬빌드면 eas 불필요.
5. **`| tail` 백그라운드 함정**: `./gradlew ... | tail -45`는 EOF까지 버퍼링 → 진행 안 보임. 백그라운드는 tail 없이 출력파일을 직접 `tail -f`/Read.

## B. 실기기 연결 (Android — iOS보다 쉬움)

6. **adb 디바이스 안 보이면** `adb kill-server && adb start-server` → 재인식. USB 디버깅 + "이 컴퓨터 신뢰"는 1회 사람.
7. **Expo Go ≠ dev/standalone 빌드**. 커스텀 네이티브 모듈(google-signin, live-activity, fmt 등) 쓰는 앱은 **Expo Go(host.exp.exponent)에서 못 돎** — 모듈 로드 시 크래시(예: LoginScreen 상단 `GoogleSignin.configure()`). 반드시 dev-client/standalone APK 빌드.
8. **★ `adb reverse`로 Metro USB 터널** → WiFi/서브넷 문제 원천 소멸(iOS엔 없는 안드로이드 이점). 폰 localhost:PORT → 맥 Metro.
9. **★ 터널 포트 = Metro 포트로 일치시킬 것**. Metro가 manifest에 **자기 포트로 번들 URL을 광고**함. Metro가 8085면 `adb reverse tcp:8085 tcp:8085`(8081→8085 매핑하면 "Unable to load script" 뜸 — 폰이 광고받은 8085로 번들 요청하는데 터널엔 8081만 있어서).

## C. Metro / 포트

10. **8081·8082는 Docker가 점유**하는 경우 많음 → Metro 빈 포트로(8085 등). `lsof -iTCP:PORT -sTCP:LISTEN`로 확인. expo는 비대화 모드(`CI=1`)에서 포트 충돌 시 그냥 skip하니 빈 포트 명시.
11. **`EXPO_PUBLIC_*`는 Metro 시작 시 인라인** → .env 바꾸면 Metro 재시작 필요(핫리로드 X).
12. **CI=1 모드는 fast-refresh/watch off**. 코드 고치고 reload 반영하려면 CI 없이 재기동. (포트 프롬프트 피하려 CI 썼으면, 빈 포트라 프롬프트 안 뜨니 그냥 CI 빼도 됨)

## D. Dev Launcher (디버그 빌드)

13. **디버그 빌드는 Dev Launcher가 먼저 뜸**(서버 URL 선택). 자동 연결하려면 **딥링크**:
    - scheme = `exp+<slug>` (확인: `adb shell dumpsys package <pkg> | grep -i scheme`). slug는 app.json.
    - `adb shell am start -a android.intent.action.VIEW -d "exp+<slug>://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<MetroPort>"`
    - url의 포트는 **Metro 실제 포트**(C-9와 동일 원칙).
14. Dev Menu 오버레이는 back 키 또는 Continue로 닫음. `adb shell input keyevent KEYCODE_BACK`은 앱을 홈으로 뺄 수 있으니 화면 보고 판단.

## E. 런타임 버그 패턴

15. **★ 빈 본문에 `res.json()` → SyntaxError**. 백엔드가 "없음"을 200+빈본문(NestJS null 직렬화)으로 주면 `res.json()`이 터짐(`res.ok`라 가드 못 탐). 화면은 degrade되며 토스트로만 노출 → "폰에서 작동 안됨"의 흔한 정체.
    - 픽스: `const t = await res.text(); if (!t) return null; const d = JSON.parse(t);`
    - 시뮬 Maestro는 네비게이션만 보고 못 잡음 → **실기기 화면 육안(스샷)이 진실**.

## F. 검증 방법론 (실기기 자동제어)

16. Maestro로 실기기 직접 구동: `maestro test .maestro/flow.yaml` (adb로 디바이스 자동선택). dev-login 우회로 OAuth 없이 로그인.
17. adb로 사람 행동 재현: `adb shell input tap X Y`(비율좌표), `adb exec-out screencap -p > /tmp/x.png` 후 육안 확인. 탭 좌표는 `wm size`로 해상도 확인 후 비율 환산.
18. `timeout`은 macOS에 없음(coreutils `gtimeout`). Maestro 자체 타임아웃 사용.

## 같이 보면 좋은 문서
- `07-physical-device-e2e.md` — 실기기 E2E 자동화 방법론(Maestro/Appium, e2e 빌드 프로필)
- `06-app-multitenancy-m1.md` — M1 전환 함정(npm shim/jest/jose/Xcode26 fmt)
- `raw/2026-06-28.md` — 이 함정들 밟은 원문 로그
