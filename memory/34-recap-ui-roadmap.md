# 리캡 앱 UI 로드맵 (서버 완료 · 앱 미구현)

**최종 갱신**: 2026-08-06

**언제 펴볼지**: 리캡 화면 구현 · 알림 딥링크 · 리캡 푸시 토글 ·
"리캡 서버는 됐는데 앱은 뭐부터?" · 리캡 API 응답 스키마

---

## 지금 상태 한 줄

**서버는 전부 배포·검증 완료. 앱에는 아무것도 없다.**
그래서 주간/월간 리캡 푸시를 받아도 **탭하면 그냥 앱만 열린다** — 사용자 입장에선
"알림이 왔는데 볼 게 없는" 상태라, 이 상태로 크론을 계속 돌리면 알림만 소모된다.

배경·설계 근거는 `33-pwa-and-ai-recap.md` 4장 참조.

## 서버 계약 (이미 라이브 — 앱은 여기에 맞추기만 하면 된다)

### 조회
```
GET /worktimer/recap?range=day|week|month&offset=0,1,2...
```
- **프리미엄 게이트 없음** (룰베이스라 LLM 비용 0 → 무료 개방이 의도)
- 잘못된 파라미터는 400이 아니라 **기본값으로 흡수**된다(`range=week, offset=0`).
  알림 딥링크에서 파라미터가 유실돼도 화면이 비지 않게 한 설계

### 응답 (`Recap`)
```ts
{
  range, offset, label, from, to,
  empty: boolean,          // 기록 0건 — 빈 화면 분기의 기준
  totalSeconds, sessionCount, activeDays,
  deltaSeconds, comparable, // comparable=false면 증감을 보여주면 안 됨
  highlights: [{ key, label, value }],  // total/sessions/activeDays/bestHour/bestDow/avgPerDay
  headline: string,        // 예 "지난 주 12시간 30분"
  lines: string[],         // 완성된 문장들 — 앱에서 다시 조립하지 말 것
  pushBody: string,
}
```
- `lines`·`headline`은 **서버가 조사(은/는·와/과)까지 맞춰 만든 완성 문장**이다.
  앱에서 문자열을 재조합하면 조사 버그가 되살아난다(33번 3장 참조)
- `highlights`는 key로 분기 — `bestDow`/`avgPerDay`는 **없을 수 있다**(day 구간 등)

### 푸시 payload
```ts
data: { type: 'recap', range: 'week'|'month', offset: 1 }
```
크론: 월 09:00(주간) / 매월 1일 09:00(월간) KST. 둘 다 `offset=1`.

### 설정
`user_settings.recapPushEnabled` (기본 true) — `/me/settings` 로 조회·수정

## 해야 할 일 3개

### 1. 리캡 화면
- **기존 `ShareCard`(일별/주별/월별 Wrapped 카드)에 얹는다.** 새로 만들 게 적다
- `headline` + `highlights` 그리드 + `lines` 순서로 그대로 렌더
- `empty=true`면 수치·증감 전부 감추고 `lines`만 (서버가 이미 안내 문구를 준다)
- `comparable=false`면 증감 UI 자체를 그리지 않는다 (0과 비교한 헛소리 방지)
- 기간 전환(이번/지난)은 `AnalysisScreen`에 이미 만든 토글과 같은 규약을 재사용

### 2. 알림 탭 → 딥링크
- `data.type === 'recap'`이면 리캡 화면으로 `range`/`offset` 실어 이동
- **콜드 스타트와 백그라운드 복귀 둘 다** 처리해야 한다(하나만 하면 절반이 죽는다)
- 파라미터가 없거나 깨져 있어도 서버가 기본값으로 흡수하니 **그냥 보내면 된다**

### 3. 설정의 리캡 푸시 토글
- 설정에 리캡 섹션 → `recapPushEnabled` 토글
- AI 동의 토글(`68beb20`)과 같은 패턴: **낙관적 갱신 + 실패 시 원복**
- ⚠️ 편집 가능한 설정값에 `|| 기본값` 폴백을 넣지 말 것 — 사용자가 끈 값이 부활한다

## 배포 제약 (중요)

1.0.2가 스토어에 깔린 뒤에는 **OTA(`eas update`)로 내보낼 수 있다.**
1.0.2 빌드의 runtimeVersion:
- iOS `f18017a6391e85540b73`
- Android `9a8b92f37b6af192b3d5`

단 **fingerprint를 바꾸는 변경을 하면 OTA가 끊긴다.** 네이티브 코드가 아니어도 끊긴다 —
실제로 `.gitignore` 추가분과 web 의존성 유입만으로 어긋나서 1.0.2를 새로 빌드해야 했다.
리캡 UI는 순수 JS/TS라 **새 의존성만 안 들이면 OTA로 나갈 수 있다.**
작업 후 `eas fingerprint:compare --build-id <1.0.2 빌드>` 로 확인하고 내보낼 것.

## 순서 제안

딥링크(2) → 화면(1) → 토글(3).
딥링크가 없으면 화면을 만들어도 **푸시에서 도달할 경로가 없어** 기능이 죽은 채로 남는다.

## 같이 보면 좋은 문서
- `33-pwa-and-ai-recap.md` — 리캡 서버 설계·발송 대상 원칙·실발송 사고
- `03-build-deploy.md` — EAS 빌드/OTA
