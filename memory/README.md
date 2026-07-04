# memory/

`/mem` 스킬로 관리되는 프로젝트 외장 기억소. 주제별 md 분할 저장.
필요한 챕터만 읽어서 컨텍스트 윈도우 절약.

일반 노트(`*.md`)는 **git 추적** → 다른 머신/세션에서 `git pull` 로 기억 복구.
시크릿·민감정보는 `memory/.private/` 에 격리(`.gitignore` 제외, 로컬 전용).

## 빠른 참조

- 앱: WorkTimer — 업무시간 트래커. **멀티테넌트 모바일 앱으로 출시 진행 중**
- 앱 저장소: https://github.com/wjb127/worktimer-expo (origin/master) · 패키지매니저 **npm**(Expo 예외)
- 백엔드 저장소: https://github.com/wjb127/codeatlas-platform-api (NestJS, pnpm) · 라이브 **https://api.codeatlas.kr**
- 번들ID: 현재 `com.gawall.worktimer` → **출시 시 `kr.codeatlas.worktimer`로 변경 예정**(M1)
- Apple Team `9Q26686S8R` · Expo owner `@gawall` · EAS projectId `31c0b3a1-6f4a-4b05-ad00-89924a249f68`
- DB: 공유 Supabase `bzzjkcrbwwrqlumxigag`의 **codeatlas 스키마**(백엔드) / 현재 앱은 아직 `public.work_sessions` 직접(M1서 전환)
- 진행: M0 백엔드 + D·E OAuth ✅ 라이브 / **M1 앱 전환 코드완료**(Phase0~5) — 남은건 Phase6 EAS빌드+기기테스트

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
| `raw/` | 원문 작업 로그(날짜별, 기본 비노출·지시 시에만 열람) |
| `.private/01-codeatlas-infra.md` | (private) VPS·DB·op 시크릿 참조 |

## 사용

- 컨텍스트 복구: `/mem catchup`
- 키워드 검색: `/mem recall <키워드>`
- 새 메모: `/mem save <주제>`
- 한눈에 시각화: `/mem visualize`
