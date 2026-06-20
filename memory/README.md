# memory/

`/mem` 스킬로 관리되는 프로젝트 외장 기억소. 주제별 md 분할 저장.
필요한 챕터만 읽어서 컨텍스트 윈도우 절약.

일반 노트(`*.md`)는 **git 추적** → 다른 머신/세션에서 `git pull` 로 기억 복구.
시크릿·민감정보는 `memory/.private/` 에 격리(`.gitignore` 제외, 로컬 전용).

## 빠른 참조

- 앱: WorkTimer — 개인 업무시간 트래커 (Expo 54 + RN 0.81 + Supabase)
- 저장소: https://github.com/wjb127/worktimer-expo (origin/master)
- iOS bundleId: `com.gawall.worktimer` · EAS owner `gawall` · projectId `31c0b3a1-6f4a-4b05-ad00-89924a249f68`
- 패키지매니저: **npm** (이 프로젝트만 예외 — Expo 기본)
- 배포: `eas build --profile <development|preview|production> --platform ios`
- DB: Supabase `work_sessions` 단일 테이블, anon 키 직접 접근, RLS=Allow all

## 파일 인덱스

| 파일 | 언제 펴볼지 |
|---|---|
| `01-architecture.md` | 앱 구조·탭 네비게이션·파일이 어디 있는지 |
| `02-data-layer.md` | 세션 저장/조회 버그, duration, 날짜 어긋남, 자정/고아세션 |
| `03-build-deploy.md` | 빌드 깨짐, EAS, TestFlight/스토어, Live Activity, 알림 |

## 사용

- 컨텍스트 복구: `/mem catchup`
- 키워드 검색: `/mem recall <키워드>`
- 새 메모: `/mem save <주제>`
- 한눈에 시각화: `/mem visualize`
