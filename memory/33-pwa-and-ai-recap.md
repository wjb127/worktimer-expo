# PWA 전환 + AI 분석 기간 리팩터 + 리캡 기능

**최종 갱신**: 2026-08-06

**언제 펴볼지**: PWA(app.filltime.app) 배포·아이콘 깨짐 · 웹 스텁 · AI 분석 기간(offset) ·
리캡/푸시 크론 · 데스크탑 앱을 왜 접었는지

---

## 1. 데스크탑 앱 → PWA (방향 전환)

Tauri 데스크탑 앱(ss-062)을 만들었다가 **접고 PWA를 본체로** 세웠다.
목표가 "출시"가 아니라 "이 앱을 다른 데서도 쓰기"였기 때문.

- 데스크탑 앱은 `~/Project/_archive/ss-062-filltime-desktop`로 아카이브
- `/Applications/Filltime.app`·로그인항목·WebKit데이터·`~/.config/filltime` 전부 제거(휴지통)
- 데스크탑 구글 OAuth(루프백+PKCE)도 구현했다가 **불필요해져 폐기**
  (서버 registry의 `GOOGLE_DESKTOP_CLIENT_ID` 커밋은 revert됨)

**판단 근거**: 스테이트풀/데스크탑은 차별점이 아니고, PWA가 같은 목표를 훨씬 싸게 달성.
구글 로그인도 PWA가 압도적으로 쌌다 — 서버 registry에 `GOOGLE_WEB_CLIENT_ID`가
**이미** 등록돼 있고 CORS도 `origin:true`라 **서버 변경 0**이었다.

## 2. PWA — app.filltime.app

- Vercel 프로젝트 `filltime-pwa` (org `team_8raDSNhTK9Z7AMkWMAf0mDnj` — 랜딩과 동일)
- Cloudflare에 `app` CNAME → `cname.vercel-dns.com` (DNS-only)
- 신규 Vercel 프로젝트는 **SSO 보호 기본 ON** → 302. `ssoProtection: null` PATCH로 해제
- 배포는 `./scripts/deploy-pwa.sh` (익스포트 → 후처리 → 배포 → 라이브 검증)

### ★ 아이콘 전부 두부(☒) 사고 — 반드시 기억

`@expo/vector-icons`의 Ionicons.ttf는 `node_modules` 안에 있어서 익스포트 경로가
`assets/node_modules/@expo/vector-icons/.../Ionicons.<hash>.ttf`가 된다.
**Vercel 정적 배포는 node_modules 경로를 기본 제외** → 이 파일만 404 →
expo-font 로드가 조용히 실패 → 앱의 **모든 아이콘이 두부**.

- 실측 근거: 같은 `assets/` 아래 `assets/assets/icon.png`는 200, node_modules 쪽은 404
- 해결: 산출물에 `.vercelignore`에 `!node_modules` 한 줄
- **이 후처리는 반드시 스크립트에** — 손으로 하면 빠뜨리고, 산출물에만 두면
  다음 `--clear` 익스포트에서 소실된다
- vercel 링크(`.vercel/project.json`)도 `--clear`에 지워지므로 저장소 루트에 두고
  배포 직전 복사한다

### 웹 스텁 (metro.config.js — web 플랫폼에서만 치환)

전부 "웹에서 throw해서 앱이 통째로 안 뜨던 것"들:

| 모듈 | 증상 |
|---|---|
| `react-native-android-widget` | `registerHeadlessTask` 부재 → 번들 평가 중 TypeError, 앱 자체가 안 뜸 |
| `expo-secure-store` | 웹 구현 없음 → 토큰 조회에서 즉사(로그인 불가). localStorage 셰임 |
| `expo-notifications` | 세션 종료가 예약알림 재계산하다 throw → **종료 버튼 먹통** |

- `react-native-web`의 **Alert는 구현이 빈 함수**(`class Alert { static alert() {} }`).
  앱 전체의 Alert가 조용히 삼켜진다 → `src/lib/webAlert.ts`가 웹에서만 실제 구현을 꽂음
- RevenueCat: web은 키를 비워 기존 disabled(no-op) 경로로
- 데스크탑 폭에서 모바일 레이아웃이 늘어나 달력 셀이 거대해짐 →
  `src/components/WebShell.tsx`가 웹에서만 maxWidth 480 가운데 고정

### 구글 로그인 (GIS)

- `src/lib/webGoogleAuth.ts` — GIS 공식 버튼을 직접 렌더.
  커스텀 버튼을 코드로 클릭하는 우회는 GIS가 막아서 "눌러도 반응 없음"이 된다
- GCP 웹 클라이언트 `1052634480432-ght8f11dsq628f9tr7qp05v2opoastto`에
  **승인된 JavaScript 원본** `https://app.filltime.app` + `http://localhost:8081` 추가함
  (이 클라이언트는 원래 네이티브 `webClientId` 용도라 원본이 하나도 없었다 →
   `no registered origin` / `401 invalid_client`)

## 3. AI 분석 기간 리팩터 (서버: codeatlas-platform-api)

### 고친 버그
- **후속 대화가 기간을 잃었다**: 자유 채팅이 `buildDataContext(actor, 'month')` 하드코딩.
  "오늘 분석" 후 질문하면 이번 달 데이터로 답했다(사용자는 모름).
  → `chat_sessions.analyze_range/analyze_offset` 저장 후 이어받게
- **과거 기간 조회 불가** → `resolveWindow(range, offset)`.
  offset≥1이면 그 기간 **마지막 날까지** 포함(리캡의 전제)
- **비교 기준 없음** → 현재/직전 구간을 **한 쿼리**로 읽어 서버가 증감 계산 후 주입.
  직전 기간 기록 없으면 비교 줄 자체를 뺀다(0과 비교한 헛소리 방지)
- day 구간의 "최강 요일" 제외(항상 그날이라 무의미)
- 할일(`sessionTodos`)을 기존 쿼리에 얹어 포함 — DB 왕복 증가 0
- `logs.slice(-15)` → 기간 전체 고른 샘플링 20건 + 생략 건수 고지
  (월간에서 월초가 통째로 사라져 잘못된 서사를 만들 여지)

### 한국어 문구 함정
- 조사 고정으로 "이번 주**은**"/"지난 주**과**"/"어제**은**" — offset 도입 **전부터** 있던 버그.
  `hasJongseong`으로 은/는·와/과 선택
- 1분 미만 차이에 "0분 늘었어요"는 정보 없음 → "비슷해요"

## 4. 리캡 (룰베이스, 비프리미엄 무료)

- `src/stats/work-stats.service.ts` (@Global) — AI·리캡이 **같은 계산**을 쓴다.
  두 벌이면 "AI가 말한 숫자"와 "리캡 숫자"가 갈라진다
- `src/stats/recap.service.ts` — `fromContext`는 순수 함수(크론에서 재사용)
- `GET /worktimer/recap?range&offset` — **프리미엄 게이트 없음**.
  LLM 비용 0이라 잠글 이유가 없고, 잠그면 전환 유입구를 버리는 셈
- `ExpoPushService`를 `src/push/`로 공용화(diary 폴더에 있었을 뿐, 앱 무관)
- `user_settings.recap_push_enabled` 기본 true
- 크론: 월 09:00(주간) / 1일 09:00(월간) KST, 둘 다 offset=1

**발송 대상 원칙**: 그 기간에 **실제 기록이 있는 사용자만**.
넓으면 안 쓰는 사람에게 "기록 없어요"가 가서 알림이 통째로 차단되고,
그러면 진짜 보낼 게 생겼을 때 도달 자체가 불가능해진다.
휴면 복귀 유도는 목적이 다른 별개 기능이라 섞지 않는다.

### ★ 실제 발송 사고 (2026-08-05)
크론이 도는지 확인하려고 어드민 수동 실행을 눌렀는데 **그게 곧 실제 발송**이었다.
예정에 없던 수요일에 3건이 실사용자에게 나갔다.
→ `sendRecaps(range, dryRun)` + 어드민 엔드포인트 **dry-run 기본**,
  진짜 보내려면 `send=1` 명시. dry-run도 집계는 반환(검증 가능해야 의미 있음).

수동 실행 경로 자체는 유지 — 크론이 **조용히 안 도는 것**이 이 기능 최대 운영 위험.

## 5. 지금 상태 / 남은 일

**서버**: 전부 배포됨. `/worktimer/recap`, 크론, 옵트아웃 모두 운영 검증 완료.
**앱**: 커밋·푸시만 됨. **스토어/OTA 미반영** — 사용자는 아직 못 씀.

앱에 없는 것:
- 리캡 화면 (기존 `ShareCard`의 일별/주별/월별 Wrapped 카드에 얹으면 됨)
- 알림 탭 → 리캡 딥링크 (`data.type='recap'`, range/offset 실려 옴)
- 설정의 리캡 푸시 토글 (`recapPushEnabled`)
- AI 화면의 `이번/지난` 토글도 OTA 필요

리서치 7개 항목 중 **4번(리캡 push) 포함 전부 서버 구현 완료**.

## 같이 보면 좋은 문서
- `32-launch-status-marketing-roadmap.md` — 출시 현황·마케팅
- `05-architecture-roadmap.md` — codeatlas 플랫폼 구조
