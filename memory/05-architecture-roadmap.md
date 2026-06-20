# 전체 아키텍처 + 출시 로드맵

**최종 갱신**: 2026-06-20

WorkTimer를 멀티테넌트 모바일 앱으로 출시하기 위한 시스템 전체 그림 + 단계별 로드맵.
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
        │ Prisma (codeatlas_app role, 세션풀러)
        ▼
[Supabase Postgres]  codeatlas 스키마 (공유 프로젝트 내 격리)
        ▲ public.* (200+ 라이브 테이블) 은 무관
[Claude API] ← M3에서 AI 코칭(NestJS 경유)
```

핵심 원칙:
- 앱은 **NestJS API만** 호출(Supabase 직접 접근 X). 시크릿 전부 서버.
- 멀티앱 백엔드(공용 NestJS 1대 → 여러 앱). 첫 앱 worktimer.
- DB는 공유 Supabase의 codeatlas 스키마로 격리.

## 확정 결정 (변경 시 여기 갱신)

| 항목 | 값 |
|---|---|
| 앱 레포 | worktimer-expo standalone 유지 (모노레포 X) |
| 백엔드 | NestJS 모듈러 (codeatlas-platform-api 레포) |
| 인증 | C-2 자체 OAuth(Apple+Google) + 자체 JWT |
| DB | 공유 Supabase `bzzjkcrbwwrqlumxigag`의 codeatlas 스키마, 전용 role |
| 번들ID | `kr.codeatlas.worktimer` |
| Apple | Seung Been Wee, Team `9Q26686S8R`, wjb127@nate.com |
| Expo owner | `@gawall` (Free) |
| API 도메인 | api.codeatlas.kr (가비아 DNS) |
| 수익화 | RevenueCat (M4) |
| 출시 타겟 | iOS + Android |

## 로드맵 (마일스톤)

```
M0 백엔드 토대          ✅ 완료·배포 (인증코어+세션/설정 API, codeatlas 격리, api.codeatlas.kr 라이브)
   D Google OAuth        ✅ /auth/google 라이브 (Web+iOS client ID 설정)
   E Apple Sign In+삭제   ✅ /auth/apple + DELETE /auth/account 라이브 (App ID 생성됨)
M1 멀티테넌시 전환       🟡 코드완료(Phase0~5): 로그인/토큰/API클라이언트/session.ts·화면 supabase제거/계정삭제
                        ⬜ Phase6: EAS dev빌드 + 실기기 로그인 E2E (사용자 기기). 상세 → 06 문서
M2 기능이식+UIUX         ⬜ 카테고리·일일목표·스트릭·포모도로·세션메모·다크모드·CSV
M3 AI 코칭              ⬜ NestJS Claude 프록시, 리포트 캐싱, 엔타이틀먼트
M4 구독(RevenueCat)      ⬜ IAP, 영수증검증/웹훅, 프리미엄 게이팅
M5 스토어 출시           ⬜ 개인정보처리방침·ATS·Apple/Google 콘솔·EAS submit·심사
```

> M0+M1이 "로그인 되는 멀티테넌트 앱 + 배포된 백엔드". 현재 M0 끝, 다음은 D/E(OAuth) 또는 M1(앱 전환).

## 외부 콘솔 작업 (사용자 클릭 필요, 미완)

- **Google OAuth**: 신규 GCP 프로젝트 `codeatlas`에서 클라이언트(iOS/Android/Web) 발급 → 공개ID는 평문, secret은 op.
- **Apple Sign In**: Apple Developer에서 App ID에 Sign in with Apple + Services ID + Key(.p8) 발급 → .p8는 op, Key ID/Team ID 평문.
- 둘 다 D/E 구현 시점에 Claude가 클릭 가이드 제공. 코드/연동/테스트는 Claude.

## 설계/계획 원본 (이 레포 git 추적)

- 스펙: `docs/superpowers/specs/2026-06-20-worktimer-multitenancy-platform-design.md`
- 구현계획: `docs/superpowers/plans/2026-06-20-m0-platform-backend.md`

## 같이 보면 좋은 문서
- `04-platform-backend.md` — 백엔드 상세(엔드포인트·배포·DB·함정)
- `01-architecture.md`~`03-build-deploy.md` — 현재 worktimer-expo 앱 자체
- `.private/01-codeatlas-infra.md` — 시크릿 참조·접속 (git 제외)
