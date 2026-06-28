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

---

## 1. UI 개선
- 현재: 기본 RN 스타일(시작/종료 원형버튼, 4탭). 어드민은 깔끔.
- 추천 시드:
  - [ ] 디자인 시스템 정립(컬러/타이포/스페이싱 토큰) — `design-consultation` 스킬 활용 가능
  - [ ] 다크모드 (user_settings.theme 컬럼 이미 존재 → 연결만)
  - [ ] 타이머 화면 비주얼 폴리시(프로그레스 링/애니메이션)
  - [ ] 빈 상태/로딩 스켈레톤(기록/통계 첫 진입)
  - [ ] 앱 아이콘/스플래시 브랜딩

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

- [ ] **B 착수**: 세션메타 + 투두(1·2) — 백엔드 모듈 + 신규 테이블 + JWT 스코프
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

## 같이 보면 좋은 문서
- `05-architecture-roadmap.md` — M0~M5 전체 아키텍처/로드맵
- `06-app-multitenancy-m1.md` — 앱 인증/API 전환
- `07-physical-device-e2e.md` — 실기기 E2E
- `08-expo-gotchas.md` — Expo 빌드/실기기 함정
- 어드민: repo wjb127/ss-037-codeatlas-admin (별도 프로젝트)
