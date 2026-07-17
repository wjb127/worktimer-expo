# 전체 아키텍처 + 출시 로드맵

**최종 갱신**: 2026-07-16

Filltime과 후속 모바일 앱을 공용 CodeAtlas 백엔드에서 운영하기 위한 시스템 전체 그림 + 단계별 로드맵.
펴볼 때: "지금 어디까지 했지", 다음 마일스톤 시작, 큰 그림 복기할 때.

## 시스템 아키텍처

```
[WorkTimer 앱 (Expo, iOS+Android)]
   · 로그인(Apple/Google) ← M1에서 추가
   · API 클라이언트 + SecureStore 토큰
        │ HTTPS (Bearer JWT)
        ▼
[NestJS 플랫폼 API]  api.codeatlas.kr (VPS 45.77.135.225)
   core / auth / worktimer 모듈 · nginx+TLS · systemd
        │ Prisma (localhost)
        ▼
[VPS PostgreSQL 16]  codeatlas DB / codeatlas 스키마
   로컬 30일 백업 + Cloudflare R2 90일
[Claude API] ← M3에서 AI 코칭(NestJS 경유)
```

핵심 원칙:
- 앱은 **NestJS API만** 호출(DB 직접 접근 X). 시크릿 전부 서버.
- 멀티앱 백엔드(공용 NestJS 1대 → 여러 앱). 첫 앱 worktimer.
- DB는 VPS 로컬 PostgreSQL의 codeatlas 스키마, 앱 데이터는 `app_id`로 격리.

## 확정 결정 (변경 시 여기 갱신)

| 항목 | 값 |
|---|---|
| 앱 레포 | worktimer-expo standalone 유지 (모노레포 X) |
| 백엔드 | NestJS 모듈러 (codeatlas-platform-api 레포) |
| 인증 | C-2 자체 OAuth(Apple+Google) + 자체 JWT |
| DB | VPS PostgreSQL 16, `codeatlas` DB/스키마, localhost 전용 |
| 번들ID | `kr.codeatlas.worktimer` |
| Apple | Seung Been Wee, Team `9Q26686S8R`, wjb127@nate.com |
| Expo owner | `@gawall` (Free) |
| API 도메인 | api.codeatlas.kr (가비아 DNS) |
| 수익화 | RevenueCat (M4) |
| 출시 타겟 | iOS + Android |

## 로드맵 (2026-07-16 현재)

```
M0 백엔드 토대          ✅ NestJS/JWT/OAuth/API/PG16/백업/어드민 운영
M1 멀티테넌시 전환       ✅ 모바일 API 전환·SecureStore·실기기 E2E
M2 기능이식+UIUX         ✅ 타이머·기록·통계·할일·공유·위젯 중심 출시 범위
M3 AI 코칭              ✅ Claude 백엔드 프록시와 자유채팅 ON (세부 개선은 21번)
M4 구독(RevenueCat)      ✅ DB·웹훅·어드민·SDK·E2E 인프라, 실제 상품 운영은 19번
M5 스토어 출시           ✅ iOS 승인/판매 가능 · Android 프로덕션 심사 중
M6 공용 앱 팩토리        🟡 2번째 앱 전 appId 신뢰경계·OAuth registry 리팩터 필요
```

> 현재 진행의 진실 소스는 `README.md`, 성장/수익화는 19번, DB/백업은 20번, 당일 세션은 21번이다.

## 외부 콘솔 상태

- Google OAuth 동의화면 production 게시 및 Android production SHA-1 등록 완료.
- App Store Connect 앱 생성·메타데이터·심사·승인 완료. Play Console 프로덕션 심사 진행 중.
- 앱별 bundle/package/OAuth/EAS/스토어 레코드는 후속 앱마다 별도 생성해야 한다.

## 설계/계획 원본 (이 레포 git 추적)

- 스펙: `docs/superpowers/specs/2026-06-20-worktimer-multitenancy-platform-design.md`
- 구현계획: `docs/superpowers/plans/2026-06-20-m0-platform-backend.md`

## 같이 보면 좋은 문서
- `04-platform-backend.md` — 백엔드 상세(엔드포인트·배포·DB·함정)
- `01-architecture.md`~`03-build-deploy.md` — 현재 worktimer-expo 앱 자체
- `.private/01-codeatlas-infra.md` — 시크릿 참조·접속 (git 제외)
