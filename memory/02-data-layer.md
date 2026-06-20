# 데이터 레이어 — Supabase 스키마 / 세션 로직 / 핵심 함정

**최종 갱신**: 2026-06-20

DB 스키마, 세션 CRUD 동작 방식, 자정 넘김·고아세션 같은 까다로운 처리 정리.
펴볼 때: 세션 저장/조회 버그, duration 계산, 날짜 어긋남, 타이머 동작 손볼 때.

## DB 스키마 (`work_sessions` 단일 테이블)

`supabase/migrations/001_create_work_sessions.sql`:

| 컬럼 | 타입 | 의미 |
|---|---|---|
| id | UUID PK (gen_random_uuid) | |
| start_time | TIMESTAMPTZ NOT NULL | 세션 시작 |
| end_time | TIMESTAMPTZ (nullable) | **NULL = 진행 중** |
| duration | INTEGER (초) | 종료 시 계산해서 저장 |
| date | DATE NOT NULL | 로컬 기준 YYYY-MM-DD |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

- 인덱스: `date`, `end_time`
- **RLS 켜져 있는데 정책이 `Allow all (USING true)`** — 인증 없는 단일 사용자 앱이라 사실상 오픈. 인증 추가하면 이 정책 반드시 수정.
- 클라이언트는 **anon 키**로 직접 접근 (서버 없음, service_role 안 씀).

## 클라이언트 (`lib/supabase.ts`)

- `react-native-url-polyfill/auto` 먼저 import (RN fetch 폴리필)
- storage = AsyncStorage, persistSession true
- env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env`, git 제외)

## 세션 함수 (`src/lib/session.ts`)

- `getTodayTotal()` — 오늘 `date` + `end_time NOT NULL` 의 duration 합. 진행 중 세션은 제외.
- `getOngoingSession()` — **date 필터 없이** `end_time IS NULL` 최신 1건. 자정 넘겨도 어제 시작한 세션을 잡으려고 일부러 날짜 안 거름. 없으면 `PGRST116` → null 정상 반환.
- `startSession()` — insert (start=now, end=null, duration=0, date=오늘)
- `endSession(id, startTime)` — **duration을 타임스탬프 차이로 재계산**해서 저장. 클라이언트 카운터 값 안 믿음 (백그라운드/슬립으로 틀어지므로). `floor((now-start)/1000)`.

## ★ 핵심 함정 2개 (이미 해결된 것)

### 1. UTC 자정 버그 → `dateUtils.ts`
`toISOString()`은 UTC 기준이라 한국(UTC+9)에서 **자정~오전 9시 사이에 전날 날짜**가 나옴.
→ 날짜 문자열은 **항상 `getLocalToday()` / `formatDateString()`** 사용 (getFullYear/getMonth/getDate 로컬 조합). `date` 컬럼 채울 때 절대 `toISOString().slice(0,10)` 쓰지 말 것.

### 2. 자정 넘김 + 고아 세션 → `cleanupOrphanedSessions()`
세션 켠 채 자정 넘기거나 앱이 죽으면 `end_time NULL`인 과거 세션이 남음(고아).
- `getOngoingSession()`이 date 필터를 뺀 이유가 이것 (어제 세션도 잡음).
- `cleanupOrphanedSessions(excludeId?)` — 오늘 이전(`date < today`)의 미종료 세션을 각 **해당 날짜 23:59:59로 종료** 처리하고 duration 계산. 현재 진행 중 세션은 `excludeId`로 제외.
- 최근 커밋 `28f5e37 fix: 자정 넘김 세션 오류 수정 및 고아 세션 자동 정리`가 이 처리.

## 같이 보면 좋은 문서
- `01-architecture.md` — 화면이 이 함수들을 어디서 호출하는지
- `03-build-deploy.md` — 배포/빌드
