# 출시 액션 플랜 — 사용자(위승빈) 액션 아이템

**최종 갱신**: 2026-07-05

수익화 준비 4종(애널리틱스/Sentry/온보딩/인앱리뷰) 코드 완료 후, **사용자가 직접 해야 하는 것들**의 체크리스트.
펴볼 때: "다음에 내가 뭐 해야 하지", 출시 준비 재개할 때. 기술 상세는 `09-launch-roadmap.md`.

표기: `[사용자]` = 사용자만 가능(계정·콘솔·결제·결정) / `[→Claude]` = 사용자가 재료 주면 Claude가 이어서 실행.

## A. 지금 바로 (기능 켜기 — 계정/키 발급) — ✅ 완료 (2026-07-04)

- [x] **PostHog 계정**: `.env`에 `EXPO_PUBLIC_POSTHOG_KEY` 주입. `/capture/` 직접 curl 검증(HTTP 200), 대시보드 Activity에서 확인됨
- [x] **Sentry 계정**: `.env`에 `EXPO_PUBLIC_SENTRY_DSN`, EAS secret에 `SENTRY_ORG`(9402a118a6b8)·`SENTRY_PROJECT`(filltime)·`SENTRY_AUTH_TOKEN`(1Password 경유). `/store/` 직접 curl 검증(HTTP 200), Sentry Issues에서 확인됨
- [x] **identifyUser 배선** — 커밋 33f2214. `AuthContext.signInWithTokens`에서 로그인 후 `GET /me`로 id·provider 조회 → `identifyUser(me.id)` + `track('login_success', {provider})`. /me 실패 시 익명 폴백. tsc 0에러, 테스트 26/26 유지
- 참고: 네이티브 dev client 실기기 앱 실행 통한 최종 E2E는 미실시(선택사항, 직접 API 검증으로 핵심 리스크 제거됨)

## B. 출시 준비 (콘솔/계정 작업 — 사용자 계정 필요)

- [ ] `[사용자]` **GCP 콘솔**(codeatlas-500015): OAuth 동의화면 "테스트"→"프로덕션" 전환 (안 하면 테스트 유저 외 구글로그인 불가)
- ~~filltime.app 도메인 구매~~ → **보류로 재조정(2026-07-05)**. 인디 개발 단계에서 우선순위 낮음(공개 프로필 웹은 출시 후 Tier2 기능 시점에 재검토). 개인정보처리방침 URL은 도메인 없이 Vercel 서브도메인(`filltime.vercel.app`, 아래 랜딩페이지)으로 충분
- [ ] `[사용자]` **Apple**: App Store Connect 앱 등록(Team 9Q26686S8R) + Apple Service ID·`.p8` 키 발급(계정삭제 revoke용)
- [ ] `[사용자]` **Play Console**: 앱 등록 (개발자 계정 없으면 $25 결제)
- [x] **개인정보처리방침·이용약관 웹페이지** — `ss-042-filltime-landing` 프로젝트로 1차 생성 완료(아래 참조). 사업자 정보(담당자명·연락처)는 플레이스홀더 — 확정 시 교체 필요
- [ ] `[→Claude]` EAS production 빌드 → SHA-1 추출 → `[사용자]` GCP에 Android production OAuth 클라이언트 등록
  (현재 debug SHA만 등록 — 프로덕션 빌드에서 구글로그인 즉사 방지)
- [ ] `[→Claude]` 스토어 스크린샷·메타데이터·로케일별 앱 이름(필타임/Filltime) 준비

## C. 출시 직전 게이트 (보안) — ✅ 대부분 완료 (2026-07-04)

- [x] ★ 운영 백엔드 `DEV_LOGIN_ENABLED` OFF — VPS(`root@45.77.135.225`) `/opt/codeatlas-api/.env` 수정 + `systemctl restart codeatlas-api`. 변경 전후 curl 검증(`/auth/dev-login` 201→404), `/health` 정상 확인
- [x] 어드민 콘솔 비밀번호 변경 — **ENV 마스터(Vercel `ADMIN_PASSWORD`) + DB `codeatlas.admin_users` 해시 둘 다 교체** (하나만 바꾸면 다른 경로로 여전히 뚫림 — 실제로 첫 시도 때 ENV만 바꿔서 구멍 남아있던 걸 발견해 DB도 마저 교체). 새 비번은 macOS Keychain(`ks-cp ss-037-codeatlas-admin/admin-password`)에 저장. `admin123!` 401 확인, 새 비번 200 확인
- [x] 스토어 빌드에 `EXPO_PUBLIC_E2E` 미설정 확인 — `eas.json` `production` 프로필 비어있음(env 없음), `.env`에도 없음. 이미 안전, 조치 불요
- [ ] codeatlas RLS 정비 — **보류, 사용자가 직접 검토 예정.** 조사 결과: 테이블 11개 전부 RLS 비활성이지만 `service_role`/`postgres`는 원래 RLS 우회 롤이라 백엔드·어드민은 무관. 진짜 리스크는 "`codeatlas` 스키마가 Supabase PostgREST(anon 키로 접근되는 REST API)에 노출돼 있는가" — 이건 SQL로 확인 안 되고 Supabase 대시보드 Settings→API→Exposed schemas에서만 확인 가능(당시 MCP 연결 끊겨 있어 미확인). `codeatlas`가 노출 목록에 없으면 RLS 켤 필요 시급하지 않음, 있으면 RLS보다 그 목록에서 빼는 게 더 간단한 수정
- [ ] Apple 계정삭제 revoke 구현 (B의 .p8 받은 후 — 심사 리젝 사유)
- [x] VPS SSH 하드닝(2026-07-12) — 브루트포스 17,991건 진단(침입 성공 0건, fail2ban 누적 1,266 IP 차단 확인) 후 `/etc/ssh/sshd_config.d/00-hardening.conf`로 비번 로그인 차단(`PasswordAuthentication no` + `PermitRootLogin prohibit-password`). **이후 VPS 접속은 키(ED25519, qhv147) 전용** — 비번 경로는 "Permission denied (publickey)"가 정상. 백업: `sshd_config.bak-20260712`. 잠금 사고 시 Vultr 웹 콘솔로 복구
- [x] VPS 앱계층 하드닝(2026-07-12, 보안점수 76→~85 B+) — 서버 실태: node(codeatlas-api :3000) + PHP(jusohub 포털 :8080/8088) 2개 프로젝트, DB(3306)·node(3000) 내부바인딩, `.env` 600 root, TLS LE 유효. 조치:
  - nginx `/etc/nginx/conf.d/00-hardening.conf`: `server_tokens off`(버전숨김) + `limit_req_zone rate=20r/s`; api 서버블록에 `proxy_hide_header X-Powered-By` + `limit_req burst=50 nodelay`. 검증: 헤더 `Server: nginx`만·X-Powered-By 제거, 100동시요청→43개 429. 백업 `api.codeatlas.kr.bak-20260712`
  - fail2ban `jail.local`: 밴타임 10m→1h, nginx-limit-req(maxretry10)·nginx-botsearch jail 추가. 활성 jail 3개(sshd/nginx-limit-req/nginx-botsearch)
  - 커널 재부팅: 6.8.0-124→134, reboot-required 해제, 전 서비스 복구·API 200 확인
- [ ] **Cloudflare 이관(선택, 진행중)** — codeatlas.kr은 **가비아 NS**(CF 아님). api·jusohub 2레코드뿐(MX·root·www 없음)이라 이관 저위험. CF 계정에 이미 12개 존 있음(토큰 `op://Dev-Clients/otdvwuq4kkzw7xakwqwrcamshi/773gkd5l242v2kko7z3vilzegm`). 이관 시 origin IP 은닉+엣지 WAF/rate-limit. **핵심 주의: 프록시 후 ufw 443을 CF IP대역만 허용해야 우회차단 됨 + certbot은 HTTP-01→DNS-01(CF플러그인) 전환 필요(포트80 의존 제거)**. NS 변경은 사용자가 가비아에서 직접(achiel/aida.ns.cloudflare.com)

## E. 광고용 랜딩페이지 (신규, 2026-07-05)

- **프로젝트**: `ss-042-filltime-landing` (`~/Project/ss-042-filltime-landing`) — Next.js 16 + Tailwind + TypeScript, pnpm
- **GitHub**: https://github.com/wjb127/ss-042-filltime-landing (private)
- **Vercel**: 기본 alias `ss-042-filltime-landing.vercel.app` + 예쁜 alias `filltime.vercel.app`
- **페이지**: `/`(홈, 필수 링크 위주 미니멀 히어로) · `/privacy`(개인정보처리방침) · `/terms`(이용약관)
- [x] 개인정보처리방침·이용약관에 실제 사업자 정보 반영(2026-07-05, 사업자등록증 PDF 기반) — 상호 코들라스(Codlas), 대표 위승빈, 사업자등록번호 237-02-03826, 인천 서구 청라동 소재. 연락 이메일은 `wjb127@naver.com`(개인 gmail 대신 사용, 스팸 감수 결정)
- [x] Deployment Protection 해제 완료(2026-07-05, 사용자가 대시보드에서 직접 끔) — 홈/privacy/terms 3개 페이지 전부 curl로 `HTTP:200` 공개 접속 검증됨
- [x] 랜딩 전체 페이지 푸터(레이아웃)에 사업자 정보 상시 노출 완료(2026-07-05) — privacy/terms 본문 블록은 중복이어도 법적 관례상 유지하기로 결정(사용자 확인)
- 홈페이지는 아직 마케팅 카피/스크린샷 없음 — 스토어 등록 후 다운로드 버튼·스크린샷 보강 예정

## D. 출시 후 (수익화 순서 — `10-viral-share-strategy.md` 프레임)

1. **측정 2주**: PostHog에서 D1/D7 리텐션·온보딩 완주율·공유카드 생성률·프리미엄 관심 클릭률 확인
   (D7 15~20% 미만이면 페이월보다 리텐션 수리 먼저)
2. **리텐션 인프라**: 홈화면 위젯 → Expo Push(주간 리캡 월요일 발송) → 스트릭 위험 알림
3. **결제**: RevenueCat + 구독 (프리미엄 = AI분석 + 카드 테마 + 상세통계 + 위젯 고급형).
   가격은 연간 우선 + 7일 무료체험, 관심 클릭 데이터 보고 결정. **공유 기능은 절대 유료화 X**
4. **성장**: 공개 프로필 웹(filltime.app/@id), ASO 반복
5. **기술부채**: TimerScreen 훅 분리, RN 신아키텍처, CI/CD

## 같이 보면 좋은 문서

- `09-launch-roadmap.md` — 출시 로드맵 전체 + 수익화 준비 4종 상세(커밋·env)
- `10-viral-share-strategy.md` — 비즈니스 방향성·수익모델 근거
