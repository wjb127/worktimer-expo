# M1 — 앱 멀티테넌시 전환 (로그인 + API)

**최종 갱신**: 2026-06-21

worktimer-expo 앱을 Supabase 직접접근 → NestJS API 호출로 전환한 구조와 함정.
펴볼 때: 앱 인증/API 흐름 손볼 때, M1 이어서(Phase 6 빌드), 비슷한 전환 작업 함정 참고.

## 상태: 코드 + 빌드 + E2E 검증 완료 (Phase 0~6)

- ✅ iOS 시뮬레이터 빌드·실행, **Maestro E2E 전부 PASS** (로그인→탭네비→로그아웃, API 화면 렌더)
- ✅ 백엔드 curl E2E: dev-login → 세션 CRUD → 멀티테넌트 격리 라이브 확인
- ✅ 실기기(WiPhone) 빌드·설치 성공(서명 9Q26686S8R 자동). 1차 빌드는 ExpoFontLoader 크래시 → expo-font+fmt 수정 후 **수정본 재빌드·설치 완료**. 사용자 폰에서 직접 로그인 확인 대기(내가 화면 못 봄)
- 실기기 Metro 연결: 자동탐색 실패 → **수동 URL `http://<맥LAN IP>:8082`** 입력(같은 WiFi 필수). 시뮬은 localhost 자동

## E2E 테스트 방식 (Maestro + dev-login)

- **Maestro** (접근성 트리 기반, 무계측) — `~/.maestro/bin`, `maestro test .maestro/<flow>.yaml`
  - 탭 라벨은 "기록, tab, 2 of 4" 형태 → 와일드카드 `"기록.*"`. testID는 `id:`. 알림 버튼은 동일텍스트 충돌 → `point: "66%,56%"` 좌표탭.
  - 플로우: `.maestro/login.yaml`, `full-flow.yaml`(로그인→네비→로그아웃), `confirm-logout.yaml`
- **dev-login 우회**: OAuth(Apple/Google)는 AI가 인터랙티브 못 함 → 백엔드 `POST /auth/dev-login`(env 게이팅) + 앱 `__DEV__` 버튼(testID `dev-login-button`)으로 OAuth 없이 로그인.
- 시뮬은 localhost Metro 연결 + 서명 불필요 → AI E2E에 최적. (Flutter 캔버스면 불가, RN 접근성트리라 가능)

## ⚠️ Phase 6 함정 (다음에 또)

- **Xcode 26 + fmt consteval 비호환** → `plugins/withFmtFix.js`(Podfile post_install로 FMT_USE_CONSTEVAL=0). prebuild/EAS에 자동 적용.
- **@expo/vector-icons → expo-font 필요** (ExpoFontLoader 네이티브 모듈). 안 깔면 런타임 크래시.
- **Metro `--clear` 금지** — NativeJSLogger 에러로 번들 깨짐. 그냥 재시작(env는 --clear 없어도 재인라인).
- **EXPO_PUBLIC_* 는 Metro 시작 시 인라인** — .env 바꾸면 Metro 재시작 필요(핫리로드 X).
- Metro 8081은 Docker 점유 → 8082 사용.

## ★ Launch 체크리스트 (출시 전 필수)

- [ ] **운영 백엔드 `DEV_LOGIN_ENABLED` OFF** (현재 테스트용 ON! /auth/dev-login 노출 중)
- [ ] 앱 dev 버튼은 `__DEV__`라 release 빌드엔 자동 제외(확인)
- [ ] Apple revoke(.p8), Google Android client(SHA-1)

---
## (이하 원본 — Phase 0~5 코드)
## 구 상태: 코드 완료(Phase 0~5)

- Phase 0: 백엔드 `PATCH /worktimer/sessions/:id/edit`(수동편집) 배포 ✅
- Phase 1: 번들ID `kr.codeatlas.worktimer`, 라이브러리, plugins, env ✅
- Phase 2: API클라이언트/토큰/매핑 (jest 5) ✅
- Phase 3: 로그인화면/AuthContext/게이팅 ✅
- Phase 4: session.ts → API ✅
- Phase 5: Stats/Heatmap/Calendar supabase제거 + 설정 로그아웃/계정삭제 + supabase 의존성 제거 ✅
- **Phase 6 ⬜**: EAS dev빌드 + 실기기 로그인 E2E (사용자 기기 필요)

## 앱 새 구조 (인증/데이터 흐름)

```
LoginScreen (Apple/Google 버튼)
  → expo-apple-authentication / @react-native-google-signin → id_token
  → POST /auth/apple|google → 우리 JWT
  → tokenStore(SecureStore) 저장 → AuthContext.signedIn=true
App.tsx: AuthProvider > Root (loading/signedIn 분기) > MainTabs(기존 탭)
데이터: 모든 화면/세션 → src/lib/api/* (apiFetch Bearer + 401 refresh) → api.codeatlas.kr → codeatlas 스키마
```

## 새 파일 / 핵심

- `src/lib/auth/tokenStore.ts` — SecureStore 토큰 저장/조회/삭제
- `src/lib/auth/AuthContext.tsx` — signedIn 상태, signInWithTokens/signOut
- `src/lib/api/client.ts` — apiFetch(Bearer 자동, 401→refresh 1회 재시도), apiJson
- `src/lib/api/sessions.ts` — 엔드포인트 래퍼 + **mapSession(camelCase→snake_case)**
- `src/screens/LoginScreen.tsx` — GoogleSignin.configure(webClientId+iosClientId), 버튼
- `src/lib/session.ts` — **시그니처 유지**하고 내부만 API로(화면 호출부 무변경)

## 데이터 매핑 주의

- API는 Prisma camelCase(`startTime`/`endTime`/`createdAt`), 앱 `WorkSession` 타입은 snake_case(`start_time`…). `mapSession`에서 변환 → 기존 화면/타입 안 건드림.
- 목록 API(`/worktimer/sessions?from&to`)는 진행중 세션 포함 → 화면에서 `.filter(s => s.end_time !== null)` 필요(통계/히트맵/달력은 종료세션만).

## ★ 함정 (다음에 또 만남)

1. **npm shim → pnpm**: 사용자 `.zshrc`에 `npm install/i/run/add`를 pnpm으로 바꾸는 함수 있음. Expo는 npm이라 `command npm install`로 우회. pnpm-lock.yaml 생기면 삭제(lock 혼재 금지).
2. **jest 버전 스큐**: jest-expo@56(SDK56용)은 react peer 충돌. 순수로직 테스트라 **ts-jest + jest 29**로 통일(jest@30은 clearMocksOnScope 에러).
3. **jose v6 ESM 전용** → NestJS/ts-jest CommonJS서 깨짐. **v5(dual)** 사용. (백엔드 D/E와 동일)
4. **@expo/vector-icons** 미설치라 tsc 실패 → `npx expo install @expo/vector-icons`로 직접 의존성화(tsc 게이트 복구).
5. **pnpm11 lockfile 정책** + `onlyBuiltDependencies` 무시 → 서버/배포 pnpm은 10.33 핀.

## Phase 6 (사용자가 할 것)

```bash
cd ~/Project/worktimer-expo
eas build --profile development --platform ios   # Apple Team 9Q26686S8R
npx expo start --dev-client
```
E2E: 로그인(Apple/Google) → 세션 → 다른계정 격리확인 → 편집/삭제 → 재시작 로그인유지 → 로그아웃/계정삭제.
빌드 깨지면 에러 그대로 (google-signin plugin/Apple entitlement 쪽 의심).

## 미완/후속

- Android: Google Android client(EAS SHA-1) + 빌드. Apple Service ID/.p8(웹·revoke).
- Apple 계정삭제 revoke(.p8) — 현재 DB삭제만(애플 최소요건 충족, revoke는 권장).
- Google "Testing" 모드 → 테스트 사용자 등록 필요.
- 푸시 토큰 등록 엔드포인트(M2).

## 같이 보면 좋은 문서
- `04-platform-backend.md` — 백엔드 API/엔드포인트
- `05-architecture-roadmap.md` — 전체 로드맵
- 구현계획: `docs/superpowers/plans/2026-06-21-m1-app-multitenancy.md`
