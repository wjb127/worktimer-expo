# 출시 블로커 로컬 처리 / Android 실기기 검증

**최종 갱신**: 2026-07-05

2026-07-05 출시 직전 점검에서 코드/로컬/EAS env로 해결 가능한 블로커를 처리하고 Android 실기기에서 새 네이티브 모듈 포함 빌드를 검증한 기록.

**언제 펴볼지**: 출시 전 최종 게이트, EAS env 확인, PostHog/Sentry 키 탑재, expo-doctor, Android 실기기 smoke, store-review/Sentry/PostHog 새 모듈 검증

## Notes

### 처리한 항목

- `app.json`
  - Expo config schema가 거부하던 `experiments.bridgeless` 제거.
  - `newArchEnabled: false`는 유지.
- `package.json` / `package-lock.json`
  - Expo SDK 54 patch mismatch 정리:
    - `expo` `~54.0.35`
    - `expo-dev-client` `~6.0.21`
    - `expo-notifications` `~0.32.17`
    - `expo-status-bar` `~3.0.9`
  - `expo-live-activity`는 의도적으로 쓰는 비공식/미관리 패키지라 `expo.doctor.reactNativeDirectoryCheck.exclude`에 추가.
  - `npm audit fix` 적용. high/critical audit gate는 통과했고, 남은 moderate 15개는 Expo 57 강제 업그레이드 없이는 해소 불가.

### EAS env

`.env`는 gitignore라 EAS 빌드에 자동 포함되지 않는다. 그래서 아래 public runtime env를 EAS project `@gawall/worktimer-expo`의 `production`, `preview`, `development` 3환경에 등록했다.

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

확인 명령:

```sh
npx eas-cli env:list --environment production --format short | rg "EXPO_PUBLIC_(API_URL|GOOGLE_WEB_CLIENT_ID|GOOGLE_IOS_CLIENT_ID|POSTHOG_KEY|SENTRY_DSN)"
npx eas-cli env:list --environment preview --format short | rg "EXPO_PUBLIC_(API_URL|GOOGLE_WEB_CLIENT_ID|GOOGLE_IOS_CLIENT_ID|POSTHOG_KEY|SENTRY_DSN)"
npx eas-cli env:list --environment development --format short | rg "EXPO_PUBLIC_(API_URL|GOOGLE_WEB_CLIENT_ID|GOOGLE_IOS_CLIENT_ID|POSTHOG_KEY|SENTRY_DSN)"
```

주의: 위 값들은 `EXPO_PUBLIC_*`라 앱 번들에 들어가는 공개값이다. 그래도 메모에는 실제 값을 적지 않는다.

### 검증 결과

로컬 정적/빌드 검증:

```sh
npx expo-doctor
# 18/18 checks passed

npm test -- --runInBand
# 7 suites / 26 tests passed

npx tsc --noEmit
# passed

npm audit --omit=dev --audit-level=high
# exit 0, high/critical 없음

cd android && ./gradlew assembleDebug
# BUILD SUCCESSFUL
```

Android 실기기:

- 기기: `SM-A165N`, Android 16 / SDK 36, serial `RF9XB01KRLH`
- 앱: `kr.codeatlas.worktimer`, `versionName=1.0.0`, `targetSdk=36`
- 실행:
  - `ANDROID_SERIAL=RF9XB01KRLH npx expo run:android`
  - 새 네이티브 모듈 autolink 목록에 `expo-device`, `expo-notifications`, `expo-store-review`, `@sentry/react-native`, `react-native-view-shot` 등 포함 확인.
- 실기기 smoke:
  - 앱 실행 → 메인 타이머 화면 진입
  - 시작 버튼 → `업무 중`, 경과 타이머 증가, 종료 버튼 전환
  - 종료 버튼 → 업무 기록 모달 표시
  - 건너뛰기 → 메인 타이머 화면 복귀
  - 최근 logcat에서 `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` 크래시 없음
- 스크린샷 evidence:
  - `/tmp/worktimer-android-launch.png`
  - `/tmp/worktimer-android-started.png`
  - `/tmp/worktimer-android-ended.png`
  - `/tmp/worktimer-android-after-modal.png`

### 확인된 상태

- 이미 코드에 있던 출시 P0 일부:
  - `src/lib/api/client.ts`: `EXPO_PUBLIC_API_URL` fail-fast, refresh 실패 시 auth expired handler 호출.
  - `src/lib/auth/AuthContext.tsx`: refresh 만료 전파, `identifyUser`, `resetAnalytics`.
  - `src/lib/analytics.ts`: PostHog no-op wrapper.
  - `src/lib/errorTracking.ts`: Sentry no-op wrapper.
  - `src/lib/reviewPrompt.ts`: `expo-store-review` 기반 빈도 제한 리뷰 프롬프트.
- Sentry build warning:
  - `[@sentry/react-native/expo] Missing config for organization, project` 경고가 로컬 빌드에서 보였지만, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`는 EAS env에 이미 있었다.
  - production EAS build에서 source map upload까지 확인하려면 EAS build 로그에서 Sentry upload 단계 확인 필요.

### 남은 블로커

코드/로컬만으로 끝낼 수 없는 항목:

- Google OAuth consent screen production 전환.
- production SHA-1 등록.
- Apple revoke용 `.p8` 발급 후 백엔드 계정삭제 revoke 구현.
- iOS preview/production 실기기 빌드 검증.
- App Store Connect / Play Console 앱 등록, 스크린샷/메타데이터.
- PostHog/Sentry 대시보드 실제 수신 확인.

## 같이 보면 좋은 문서

- `09-launch-roadmap.md` — 출시 로드맵/기술부채/제품 게이트.
- `11-mobile-dev-env.md` — Android/iOS 실기기 개발환경과 EAS 빌드 상태.
- `12-launch-action-plan.md` — 사용자 콘솔 작업과 출시 액션 순서.
- `08-expo-gotchas.md` — Expo/RN 빌드와 실기기 gotcha.
