# WorkTimer 출시 로드맵 — 6개 워크스트림 (리빙 노트)

**최종 갱신**: 2026-06-28

출시까지 추적하는 살아있는 체크리스트. 펴볼 때: "어디까지 했고 뭐 남았지", 다음 작업 우선순위 정할 때.
진행되면 이 파일의 `- [ ]` 를 `- [x]`로 갱신.

## ✅ 현재 인프라 스냅샷 (전부 라이브)
- **모바일 앱**(worktimer-expo): iOS/Android 디버그 빌드 동작. 멀티테넌트(NestJS JWT). 안드로이드 실기기 E2E 통과.
- **백엔드**(codeatlas-platform-api): `https://api.codeatlas.kr` 라이브(VPS 45.77.135.225). 자체 OAuth(Apple/Google)+JWT. login_event(IP/기기) 로깅 배포됨.
- **DB**: 공유 Supabase `bzzjkcrbwwrqlumxigag`의 `codeatlas` 스키마. users/work_sessions/user_settings/refresh_tokens + 신규 login_event/admin_* .
- **어드민 콘솔**: `https://ss-037-codeatlas-admin.vercel.app` (repo wjb127/ss-037-codeatlas-admin). 듀얼비번(admin/admin123!), postgres.js 직결, 유저관리+IP/기기+CSV. appId로 멀티앱 확장.
- **인증 검증**: 구글 가입 라이브 확인(qhv147@gmail.com → codeatlas.users → 어드민 표시). Android OAuth 클라이언트 등록됨(debug SHA `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, pkg kr.codeatlas.worktimer, GCP codeatlas-500015).
- **데이터**: PWA(웹) 1494세션/1614.7h가 qhv147 계정으로 마이그레이션됨. 아이콘 v2(블루 채움링) + 히트맵 블루 적용. 백엔드에 투두/세션메타 엔드포인트 라이브(모바일 UI 미연결).
- **브랜드**: 앱 이름 **필타임**(영어 Filltime). 표시명만 변경, 번들ID `kr.codeatlas.worktimer`/슬러그 `worktimer-expo`/scheme 유지. 도메인 filltime.app 선점 권장.
- **UI 블루테마 완료**: 헤더 필타임 블루, 타이머 블루 버튼/링, 히트맵·달력 2시간 8단계 블루(H:MM 표기, 글자색 적응), 로그인 리디자인. `src/theme/colors.ts` 팔레트.
- **프로필 1차 라이브**: 설정 상단 카드 + 누적통계(총시간/세션/스트릭/주월) + 일일목표. 백엔드 `/me`·`/me/stats`·`/me/settings`.
- **SDUI 배너 라이브**: `codeatlas.app_banner` + 공개 `GET /config/banners`(앱/버전/기간 필터) → 홈 배너+상세모달. 릴리즈 없이 공지 제어.
- **어드민 배너 편집기 라이브**(2026-06-28): `ss-037-codeatlas-admin`에 사용자/공지배너 탭 + `/api/admin/banners` CRUD(생성/토글/편집/삭제). app_banner를 웹에서 제어 → SDUI 루프 완성. 커밋 1d5208f.
- **할일/세션기록/통계통합/AI분석 라이브**(2026-06-28, work-timer 웹 방식 포팅): 백엔드 `/worktimer/todos` CRUD(dacdd29). 모바일 할일 탭 + 세션종료 업무기록모달(업무내용+할일연결+완료처리) + 통계를 기록 서브탭으로 통합 + AI분석 출시예정 잠금탭. 하단 5탭(타이머/기록/할일/AI분석/설정). 커밋 c01c568. Galaxy A16 E2E PASS.

---

## 1. UI 개선
- 현재: **블루 테마로 전환 중** — 아이콘 v2(Progress Fill Ring, #3B82F6→#2563EB) + 히트맵/달력 블루 완료. 타이머 버튼만 아직 초록.
- 진행:
  - [x] 앱 아이콘/스플래시 브랜딩 — v2 채움링(타이머+게임 채움 감성), 배경 #000214. 커밋 3b58075
  - [x] 히트맵/달력 초록→밝은 블루(아이콘 통일) — 커밋 e1fcffe
  - [ ] **타이머 화면을 아이콘처럼**(블루 채움링 + 시작버튼 블루) ← 다음 추천(시그니처)
  - [ ] 디자인 시스템 정립(DESIGN.md 토큰) — `design-consultation` 스킬
  - [ ] 다크모드 (user_settings.theme 컬럼 존재 → 연결)
  - [ ] 빈 상태/로딩 스켈레톤

## 2. UX 개선
- 추천 시드:
  - [ ] 온보딩(첫 실행 가이드)
  - [ ] 햅틱 피드백(시작/종료)
  - [ ] 세션 수정 UX 개선(편집 API는 이미 있음: PATCH /sessions/:id/edit)
  - [ ] 통계 인사이트(주간 요약, 추세 코멘트)
  - [ ] 알림 타이밍/문구 다듬기
  - [ ] Live Activity(iOS) 진행중 세션 표시

## 3. 기능 추가 (work-timer 웹 모노레포 참고 — API 검토 완료 2026-06-28)
**전제**: 웹은 인증 없는 단일유저(어디에도 user_id 없음, RLS 비활성). 포팅 시 **모든 신규 테이블에 user_id FK + 쿼리 스코프** 필수(최대 적응비용). codeatlas 규칙: 신규 테이블만, 기존(users/work_sessions/user_settings/refresh_tokens/login_event) 무변경.

| 기능 | 난이도 | 신규 codeatlas 테이블(user_id 포함) | 외부의존 | 순서 |
|---|---|---|---|---|
| 세션 CRUD | S | work_sessions 이미 존재 + category/description은 `session_meta(session_id,user_id,...)` 분리 | 없음 | 1 |
| 투두 | M | `todos`, `session_todos`(다대다) | 없음 | 2 |
| 푸시 | M | `push_subscriptions` — **web-push→Expo Push/FCM·APNs 전환**(`expo_push_token`) | Expo Push | 3 |
| AI 분석/챗/리포트 | L | `analysis_reports` + 집계헬퍼 3파일 이식 | **Anthropic Haiku 4.5** 필수, OpenAI 선택 | 4 |
| 시간별 넛지 크론 | S~M | push 재사용 | `@nestjs/schedule` | 5 |

- [x] **B 백엔드 완료**: 투두 CRUD + session_todos 링크 + session_meta — TodosModule + 신규 테이블 3개, JWT 스코프, VPS 배포(b59ea99), curl E2E PASS(테넌트격리 포함). **남은건 모바일 UI 붙이기**
- [x] **PWA 데이터 마이그레이션**: public.work_sessions 1494세션/1614.7h → codeatlas qhv147 계정(session_meta 874). 실기기서 6월 272h54m 확인
- [ ] 푸리(Expo Push)
- [ ] AI 분석(Anthropic Haiku 4.5, SSE 스트리밍)
- [ ] 넛지 크론
- ★ **놓치면 안 됨**: 웹의 KST 자정 분할 로직(`splitSessionByDates`,`getOverlapDuration`)이 통계·분석 정확도 핵심 → 그대로 이식.
- 웹 엔드포인트 경로: work-timer/packages/web/app/api/{sessions,todos,analysis/*,push/*,cron}/route.ts

## 4. 기타 조언 (아키텍처/운영)
- [ ] **PWA(work-timer 웹) 싱크**: 웹도 Supabase직통→NestJS API 클라이언트로 전환하면 폰↔웹 실시간 싱크. (현재 웹은 public.work_sessions 직통이라 폰과 분리됨). 단계: 세션만 먼저 → todos/push → analysis.
- [ ] 에러 트래킹(Sentry) + 분석 도입
- [ ] 어드민에 앱 추가될 때마다 appId 셀렉터에 자동 반영(이미 byApp 기반이라 거의 자동)
- [ ] CI/CD(EAS 빌드 자동화, 백엔드 GitHub Actions 배포)

## 5. 보안 검토 (출시 전 게이트)
- [ ] **★ 운영 백엔드 `DEV_LOGIN_ENABLED` OFF** (현재 ON! /auth/dev-login 노출 중 — 출시 전 필수)
- [ ] 앱 dev-login 버튼 release 빌드 제외 확인(`__DEV__ || EXPO_PUBLIC_E2E` 게이트 — App Store 빌드엔 둘 다 false)
- [ ] **codeatlas RLS** 정비(현재 비활성 → anon 키 노출). 켜기 전 codeatlas_app 영향 검토(BYPASSRLS 또는 정책). 어드민은 service_role이라 무관.
- [ ] **어드민 admin123! 변경**(공개 URL, 약함). + 경로 난수화/허니팟(선택)
- [ ] Apple 계정삭제 revoke(.p8) — 현재 DB삭제만
- [ ] **Android production OAuth 클라이언트**(EAS production 빌드 SHA-1) — 현재 debug SHA만 등록됨
- [ ] 토큰/시크릿 점검(op 관리, .env 노출 없음 확인)

## 6. 출시
- **iOS**:
  - [ ] EAS production 빌드(Team 9Q26686S8R)
  - [ ] Apple Service ID + .p8(웹/revoke용)
  - [ ] App Store Connect 등록, 스크린샷, 메타데이터
- **Android**:
  - [ ] EAS production 빌드 + production SHA-1로 Android OAuth 클라이언트 추가
  - [ ] Play Console 등록, 스토어 등재정보
- **공통**:
  - [ ] 개인정보처리방침/이용약관 페이지(웹)
  - [ ] OAuth 동의화면 "테스트"→"프로덕션" 전환(현재 테스트 사용자만)
  - [ ] 스토어 스크린샷/아이콘/설명
  - [ ] **로케일별 앱 이름**(영어 출시): 기본 필타임 + en→Filltime. iOS expo.locales{en:CFBundleDisplayName}, Android values-en config plugin. 스토어 등록명 언어별(한 필타임/영 Filltime)
  - [ ] 도메인 filltime.app 선점, 최종 스토어 exact 중복 검색

## 7. 코드 품질 / 기술부채 (코덱스 아키텍처 평가 2026-06-28, 현 점수 B/78)
코덱스가 코드 라인 짚어 평가 → 직접 검증 결과 전부 정확. 우선순위는 "출시 전 게이트(사용자 체감) vs 출시 후 부채(내부 품질)"로 재분류.

### 출시 전 게이트 (사용자 체감 — 먼저)
- [ ] **★ 인증 만료 전파**(가장 실질 버그): `AuthContext.tsx:26`이 토큰 *존재*만 보고 signedIn. `client.ts` refresh 실패 시 `clearTokens()`만 하고 앱 signedIn은 안 내림 → 30일 뒤 refresh 만료되면 무한 401 + 빈화면(로그인 화면으로 안 빠짐). 해결: refresh 실패 → AuthContext signOut 전파 경로(콜백/이벤트).
- [ ] **env fail-fast**: `client.ts:8` `EXPO_PUBLIC_API_URL as string` 바로 캐스팅 → 누락 시 `undefined${path}` 조용히 실패. 앱 시작 시 검증·throw.
- [ ] **문서 갱신**: `README.md`(1줄~) "Expo+Supabase"·죽은 `lib/supabase.ts` 참조, 프로젝트 `CLAUDE.md:47` 동일. 실제는 NestJS API/JWT. 멀티프로젝트라 딴 세션이 오해해 잘못 건드릴 위험.
- [ ] **알림 prefix 취소**: `notifications.ts:185` cancelWorkReminder가 `getAllScheduledNotificationsAsync()`로 전부 취소(207줄에 `interval-work-` prefix 있는데 미사용). reminder/interval/test 침범. 비용 작아 같이 처리.

### 출시 후 기술부채 (내부 품질 — 동작은 함)
- [ ] **TimerScreen 도메인 훅 분리**: 세션로드+타이머+고아정리+알림+LiveActivity+모달이 한 컴포넌트(`TimerScreen.tsx:53~`). runBackgroundTasks fire-and-forget. → `useTimer`/`useSessionNotifications` 등 훅 추출. (출시 직전 대수술은 회귀위험 → 출시 후)
- [ ] **통계 N회 호출 경량화**: `StatsScreen.tsx` daily7/weekly8/monthly6 루프 `apiListSessions`. 1차로 `from~to` 한방조회+클라 그룹핑(N→1, 서버변경 X). 더 크면 서버 집계 endpoint.
- [ ] app.json newArch/bridgeless off — SDK54 안정성 이유 OK, 출시 후 RN 신아키텍처 업그레이드 과제.

## 같이 보면 좋은 문서
- `05-architecture-roadmap.md` — M0~M5 전체 아키텍처/로드맵
- `06-app-multitenancy-m1.md` — 앱 인증/API 전환
- `07-physical-device-e2e.md` — 실기기 E2E
- `08-expo-gotchas.md` — Expo 빌드/실기기 함정
- 어드민: repo wjb127/ss-037-codeatlas-admin (별도 프로젝트)
