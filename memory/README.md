# memory/

`/mem` 스킬로 관리되는 프로젝트 외장 기억소. 주제별 md 분할 저장.
필요한 챕터만 읽어서 컨텍스트 윈도우 절약.

일반 노트(`*.md`)는 **git 추적** → 다른 머신/세션에서 `git pull` 로 기억 복구.
시크릿·민감정보는 `memory/.private/` 에 격리(`.gitignore` 제외, 로컬 전용).

## 빠른 참조

- 앱: WorkTimer — 업무시간 트래커. **멀티테넌트 모바일 앱으로 출시 진행 중**
- 앱 저장소: https://github.com/wjb127/worktimer-expo (origin/master) · 패키지매니저 **npm**(Expo 예외)
- 백엔드 저장소: https://github.com/wjb127/codeatlas-platform-api (NestJS, pnpm) · 라이브 **https://api.codeatlas.kr** (Cloudflare 프록시 뒤, origin 잠금)
- 번들ID: `kr.codeatlas.worktimer`
- Apple Team `9Q26686S8R` · Expo owner `@gawall` · EAS projectId `31c0b3a1-6f4a-4b05-ad00-89924a249f68`
- DB: **VPS 로컬 PostgreSQL 16**(127.0.0.1, 07-16 Supabase에서 이관 → 20번) / 앱은 NestJS API 경유 / 백업 매일 KST 04:10
- 랜딩: `ss-042-filltime-landing` → filltime.vercel.app (개인정보처리방침/약관, 사업자 코들라스)
- 진행(2026-07-19): **자정 넘긴 세션 버그 수정·배포**(백엔드 436c760 date-overlap KST 분할+end분할+cleanupOrphaned excludeId·자가치유, 앱 60f72c1 excludeId 전달) — 옛 work-timer date-overlap 이식, git worktree로 diary WIP 무손상 배포. 상세 29번
- 진행(2026-07-18): **UI 스프린트 대량**(알림페이지·할일3탭·롤링피커·명예의전당·잔디입체감·공유복사저장·히트맵가로세로·통계리캡기간·버전자동) + **OTA(EAS Update) 설정** + **Live Activity 잠금화면 마크** + **브랜드색 밝은스카이(A)** + **ASO메타 API반영** + **✅동적 배지 URL 배포**(백엔드 e9bffc3 GET /badge/:handle SVG·PATCH /me/profile opt-in 라이브 + 앱 a82479f 설정 공개배지섹션 OTA) / **압축재개는 29번 먼저** / 빌드 `6442ede2` 설치·검증 대기(배지UI는 OTA수신)
- 진행(2026-07-17): 멀티테넌시 v1.2 배포(23) + 랜딩 전면개편·배포 + 루트app/ 404복구 / 24번

## 파일 인덱스

| 파일 | 언제 펴볼지 |
|---|---|
| `01-architecture.md` | 현재 앱 구조·탭 네비게이션·파일 위치 |
| `02-data-layer.md` | 현재 앱 세션 로직, duration, 자정/고아세션 |
| `03-build-deploy.md` | 현재 앱 빌드/EAS/Live Activity/알림 |
| `04-platform-backend.md` | NestJS 백엔드 — API/인증/배포/DB스키마/멀티앱확장 |
| `05-architecture-roadmap.md` | 전체 시스템 아키텍처·출시 로드맵(M0~M5)·결정사항 |
| `06-app-multitenancy-m1.md` | 앱 인증/API 전환 구조·함정(npm shim/jest/jose)·Phase6 빌드 |
| `07-physical-device-e2e.md` | 실기기 아이폰 E2E 자동화(Maestro on-device/Appium)·Metro 제거·e2e 빌드 |
| `08-expo-gotchas.md` | Expo/RN 빌드·실기기·Metro·런타임 함정 모음(→ 스킬 `/expo-fix`) |
| `09-launch-roadmap.md` | ★ 출시 로드맵 리빙노트 — UI/UX/기능/조언/보안/출시 6스트림 + 기술부채(코덱스 B/78) |
| `10-viral-share-strategy.md` | ★ 비즈니스 방향성·바이럴 기능 로드맵(Tier1~3 공유카드/소셜)·경쟁분석·수익모델 |
| `11-mobile-dev-env.md` | 실기기 E2E 도구(Android adb 완비 / iOS26 pymobiledevice3 스샷·EAS빌드 막힌점·할일목록) |
| `12-launch-action-plan.md` | ★ 사용자 액션 체크리스트 — 키발급/콘솔작업/출시게이트/출시후 수익화 순서 |
| `13-release-blockers-local-fixes.md` | ★ 출시 블로커 로컬 처리 — EAS env, expo-doctor, SDK patch, Android 실기기 smoke |
| `14-sdui-app-factory-strategy.md` | ★ SDUI 앱 팩토리 경영 판정 — A/B 정책 경계, 하이브리드 구조, 규모·경제성·MVP 가드레일 |
| `15-session-2026-07-14-ui-hardening.md` | ★ 세션종합(07-14) — 백엔드하드닝·CF이관·동시성수정·UI대개편(종아이콘/탭바)·기록탭 CRUD + 현재상태 + 다음진행 |
| `16-android-play-console-submission.md` | ★ Android Play 심사 제출 완료(07-15) — 게스트모드·AAB v2·선언10/10·스토어·국가·최종전송 + GCP OAuth SHA-1 2개·동의화면 게시(구글로그인) + **eas submit 자동화(SA키·gcloud우회·API검증)** + 식별자(앱ID/트랙ID/SHA-1/OAuth클라/SA) |
| `17-ios-app-store-submission.md` | ★ iOS App Store **심사제출 완료(WAITING_FOR_REVIEW)**(07-15) — 빌드·altool업로드·앱생성·스샷(iPhone+iPad)·연령등급4+·앱개인정보설문·심사제출 전부 playwright + eas submit/CI 세팅 + ★ASC키 개인vs클라 함정 + 식별자(ascAppId/키ID/Issuer/Team) |
| `18-competitor-research.md` | ★ 경쟁앱 리서치(07-15) — 국내(열품타·투두메이트·열공시간·순공시간·TimeBlocks) + 글로벌(Toggl·RescueTime·Clockify·Rize·Forest·Focus To-Do·Session·Flow·Opal) + 소셜벤치(Strava·Duolingo·Wrapped·RevenueCat). 가격관행·광고vs구독·페이월·화이트스페이스 |
| `19-growth-roadmap.md` | ★ 성장 로드맵 리빙노트(07-15) — 측정→리텐션→수익화(구독)→바이럴→소셜 Phase0~5 + 대원칙(광고X/핵심무료/리텐션후수익화) + 현재자산 체크리스트. **계속 업데이트** |
| `20-db-migration-vps-postgres.md` | ★ DB 이관(07-16) — Supabase→VPS 로컬 PG16 완료. 접속법·백업크론(KST 04:10, 30일)·복원리허설·migrate deploy 자동화 + 남은것(어드민 경로/R2 오프사이트/Supabase 정리) |
| `21-session-2026-07-16-monetization-sprint.md` | ★ 세션종합(07-16) — **압축 후 재개 1순위**. 오늘 완료 10건 + 사용자액션 4개 + 다음작업 + 핵심 포인터 |
| `22-security-audit-fixes.md` | ★ 보안 감사 12건 검수·수정·배포(07-16) — 판정표, 게스트격리/웹훅멱등/AI게이트, 멀티세션 격리배포 레시피, 결정 대기 4건 |
| `23-multitenancy-architecture-plan.md` | ★ 멀티테넌시 합의문 v1.2 전문(07-17) — 불변식 10·신뢰체인·레거시토큰 A안·Phase 0~3·diary 재개 게이트. **위승빈 최종 승인 대기** |
| `24-session-2026-07-17-tenancy-landing.md` | ★ 세션종합(07-17) — **압축 후 재개 1순위**. 멀티테넌시v1.2 배포·마이그레이션 드리프트수정·테스트결정성·랜딩 전면개편+404장애복구 + 미푸시/다음작업/배포레시피 |
| `25-ios-subscription-launch-prep.md` | ★ iOS 구독 배포 준비(07-17) — 페이월 2플랜 UI 완성·검증(테스트16 PASS) + 구독 심사스샷 실기기 캡처 절차(MISSING_METADATA 해소) + v1.0.1 배포 게이트 순서 |
| `26-landing-analytics-marketing.md` | ★ 랜딩 유입추적·광고 세팅(07-18) — PostHog 선정근거·store_click·/go UTM숏링크 사용법 + 백엔드 불구축·부정클릭 단계대응 결정 |
| `27-aso-app-store-optimization.md` | ★ ASO 딥리서치(07-18) — SEO 개념비교·iOS vs Android 인덱싱차이·애플 키워드필드 100자 규칙·한국어 형태소·평점/PPO·기각된 통설 + 필타임 제목/부제/키워드 체크리스트 |
| `28-design-ref-ai-token-monitor.md` | 디자인 레퍼런스(07-18) — AI Token Monitor 앱에서 빼올 것: 잔디 셀 입체감(depth) 기법·리더보드 레이아웃·히트맵 기간토글·색 절제(밝은스카이 이미 반영) |
| `29-session-2026-07-18-ui-sprint.md` | ★ 세션종합(07-18) — **압축 후 재개 1순위**. UI스프린트(알림페이지·할일3탭·롤링피커·명예의전당·잔디입체감·공유복사저장·히트맵토글·통계리캡·버전자동)+OTA설정+Live Activity마크+브랜드색A+ASO메타 / 빌드6442ede2 설치·검증 / 다음=동적배지URL |
| `raw/` | 원문 작업 로그(날짜별, 기본 비노출·지시 시에만 열람) |
| `.private/01-codeatlas-infra.md` | (private) VPS·DB·op 시크릿 참조 |

## 사용

- 컨텍스트 복구: `/mem catchup`
- 키워드 검색: `/mem recall <키워드>`
- 새 메모: `/mem save <주제>`
- 한눈에 시각화: `/mem visualize`
