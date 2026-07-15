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
- DB: 공유 Supabase `bzzjkcrbwwrqlumxigag`의 **codeatlas 스키마**(백엔드, TLS strict) / 앱은 NestJS API 경유
- 랜딩: `ss-042-filltime-landing` → filltime.vercel.app (개인정보처리방침/약관, 사업자 코들라스)
- 진행(2026-07-15): 백엔드 하드닝+CF이관 ✅ / 측정·랜딩 ✅ / UI 대개편 Android 실기기 ✅ / **Android Play 프로덕션 심사 제출 완료 ✅**(게스트모드·AAB v2·선언10/10·스토어·국가·최종전송 전부, "검토 중" 상태 → 16번) / **GCP OAuth SHA-1 등록+동의화면 프로덕션 게시 완료 ✅**(구글로그인 동작) / **eas submit 배포자동화 세팅+검증(200) 완료 ✅**(SA키 gcloud, 다음부턴 `eas build --auto-submit`, 브라우저 없이 → 16번) / **iOS App Store 심사제출 완료 ✅ WAITING_FOR_REVIEW**(빌드·altool업로드·스샷·연령등급·앱개인정보·심사제출 전부 playwright, ascAppId 6790886125 → 17번) / **남은건 양OS(Play+App Store) 심사결과 대기 → 승인시 라이브** / **성장 로드맵 확정(07-15): 경쟁리서치(18) 기반 측정→리텐션→구독→바이럴→소셜 Phase0~5(19). 대원칙=광고X·핵심무료·리텐션확인후수익화**

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
| `raw/` | 원문 작업 로그(날짜별, 기본 비노출·지시 시에만 열람) |
| `.private/01-codeatlas-infra.md` | (private) VPS·DB·op 시크릿 참조 |

## 사용

- 컨텍스트 복구: `/mem catchup`
- 키워드 검색: `/mem recall <키워드>`
- 새 메모: `/mem save <주제>`
- 한눈에 시각화: `/mem visualize`
