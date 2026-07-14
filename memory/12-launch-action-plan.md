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
- [x] **백엔드 하드닝 2건(2026-07-14, 코덱스 진단 → Claude 수정·검증)**:
  - **DB TLS 강제+검증**: `DATABASE_URL`이 sslmode 없어 Prisma 기본 `prefer`(평문 fallback 가능)였음 → `?sslmode=require&sslaccept=strict` 적용. Supabase 풀러 인증서(`Supabase Root 2021 CA` 자체서명)를 `/usr/local/share/ca-certificates/supabase-root-2021.crt`로 시스템 신뢰저장소에 설치(update-ca-certificates, openssl verify return 0). ★함정: Prisma `sslcert=<CA번들>` 방식은 "unable to get issuer certificate"로 실패(앱 502 한번 남) → **시스템 store 방식이 정답**. 검증: 10/10 요청 200, 불안정 0. 백업 `.env.bak-20260714`
  - **NestJS 비root 하드닝**: `User=root`(systemd-analyze 9.6 UNSAFE) → 전용 시스템 유저 `codeatlas`(uid999) + 드롭인 `10-hardening.conf`(NoNewPrivileges/ProtectSystem=strict/ProtectHome/PrivateTmp/CapabilityBoundingSet=/SystemCallFilter=@system-service/UMask=0077, MemoryDenyWriteExecute는 V8 JIT 때문에 미설정). **9.6→1.7 OK**. 앱→`/root/.secrets`(CF토큰) 접근 Permission denied 격리 확인. `.env` 640 root:codeatlas. 백업 `.service.bak-20260714`
  - repo(codeatlas-platform-api) `deploy/codeatlas-api.service`에 하드닝+전제조건 반영 커밋 `4da4552`(로컬, 미푸시)
- [x] **백엔드/모바일 하드닝 3묶음(2026-07-14, 코덱스 findings 3~7 중 실익분)**:
  - **A(인프라)**: CF SSL Full→**strict**(origin LE 검증) + **Min TLS 1.2**(TLS1.0/1.1 차단) + nginx `conf.d/20-default-reject.conf`(`ssl_reject_handshake` — unknown SNI 거절 = 타 CF계정 우회 2차차단). `.env`에 `NODE_ENV=production`. 검증 CF경유 200 유지
  - **B(백엔드 코드, 배포 완료)**: ThrottlerGuard 전역 등록(APP_GUARD) + `main.ts` trust proxy(프록시 뒤 실IP 스로틀) / refresh 회전 원자화(조건부 updateMany, 재사용 탐지) / todos interface DTO→class+class-validator(전역 ValidationPipe 실효, 컨트롤러 import type→import). repo 커밋 `cb05d33`, deploy.sh로 VPS 배포·스모크 OK, codeatlas 유저로 안정 기동
  - **C(모바일 SDUI)**: `HomeBanner.tsx` 배너 actionUrl을 https/mailto/tel 화이트리스트로만 오픈(`isSafeActionUrl`, 모듈스코프 재사용). 백엔드 탈취 시 악성 딥링크 차단 — **앱 팩토리 템플릿 상속 패턴**. 커밋 `d1d6571`, tsc0·테스트26/26
  - **의도적 defer(규모 대비 과함)**: SSH sudo유저 전환(키전용이라 실익 미미, forwarding 끄기 정도만), CF Authenticated Origin Pulls(mTLS, 복잡), Multer audit(업로드 경로 없음), CORS-all(모바일전용 API라 무해), 미사용 mariadb(서비스만 끄면 메모리 회수 가능)
- [x] VPS SSH 하드닝(2026-07-12) — 브루트포스 17,991건 진단(침입 성공 0건, fail2ban 누적 1,266 IP 차단 확인) 후 `/etc/ssh/sshd_config.d/00-hardening.conf`로 비번 로그인 차단(`PasswordAuthentication no` + `PermitRootLogin prohibit-password`). **이후 VPS 접속은 키(ED25519, qhv147) 전용** — 비번 경로는 "Permission denied (publickey)"가 정상. 백업: `sshd_config.bak-20260712`. 잠금 사고 시 Vultr 웹 콘솔로 복구
- [x] VPS 앱계층 하드닝(2026-07-12, 보안점수 76→~85 B+) — 서버 실태: node(codeatlas-api :3000) + PHP(jusohub 포털 :8080/8088) 2개 프로젝트, DB(3306)·node(3000) 내부바인딩, `.env` 600 root, TLS LE 유효. 조치:
  - nginx `/etc/nginx/conf.d/00-hardening.conf`: `server_tokens off`(버전숨김) + `limit_req_zone rate=20r/s`; api 서버블록에 `proxy_hide_header X-Powered-By` + `limit_req burst=50 nodelay`. 검증: 헤더 `Server: nginx`만·X-Powered-By 제거, 100동시요청→43개 429. 백업 `api.codeatlas.kr.bak-20260712`
  - fail2ban `jail.local`: 밴타임 10m→1h, nginx-limit-req(maxretry10)·nginx-botsearch jail 추가. 활성 jail 3개(sshd/nginx-limit-req/nginx-botsearch)
  - 커널 재부팅: 6.8.0-124→134, reboot-required 해제, 전 서비스 복구·API 200 확인
- [x] **Cloudflare 이관 완료(2026-07-14, 보안점수 ~85→~90 A-)** — codeatlas.kr을 가비아 NS→CF로 이관. api·jusohub 프록시 뒤로. origin IP 은닉+우회 직타 차단 완성.
  - CF 존 `a6b374a69ec4558c86093424711a7a82`(acct `46e9985a2cd78037a239e6a0a1a4067d`, `Qhv147@gmail.com`), active. api·jusohub A레코드 프록시 ON, SSL=Full, Always-HTTPS=on. NS = achiel/aida.ns.cloudflare.com (레지스트리 등록 확인)
  - nginx `conf.d/10-cloudflare-realip.conf`: CF 22개 대역 `set_real_ip_from` + `real_ip_header CF-Connecting-IP` (rate-limit/fail2ban이 실클라 IP 인식)
  - certbot **DNS-01 전환**: `python3-certbot-dns-cloudflare` 설치, `/root/.secrets/cloudflare.ini`(600, CF토큰), api·jusohub 둘 다 재발급 성공 + 갱신설정 `authenticator=dns-cloudflare`, certbot.timer active. **포트80 의존 제거 → origin 잠금 가능해짐**
  - **ufw origin 잠금**: 80/443을 CF 22개 대역만 허용(44규칙), anywhere 규칙 제거. **22(SSH)는 유지**. 검증: CF경유 api 200 + origin 직타(--resolve 45.77.135.225) 443/80 전부 timeout 차단 + SSH 정상
  - **★ Bot Fight Mode/브라우저챌린지 의도적 OFF** — 모바일 앱 API 호출은 JS 챌린지 못 풀어 죽음. API 존은 L3/4 자동 DDoS(챌린지 없음)만
  - ~~8080/8088 jusohub 직결포트 노출~~ → 아래 jusohub 제거로 해소(포트 폐쇄됨)
- [x] **jusohub(주소허브) VPS 정리(2026-07-14)** — 다른 서버로 이관 완료(브랜드 도메인 jusohubgo.com→208.87.241.137, 한글도메인→141.164.55.40로 이미 이전 확인)라 이 VPS에서 제거. codeatlas는 MariaDB·PHP·해당 웹루트 전부 미사용이라 무관.
  - **백업 후 제거**: `/root/jusohub-backup-20260714/`(88M — DB덤프 2개 + nginx설정 + 웹루트 tar) 떠두고 진행
  - 제거: nginx 사이트 2개(jusohub/jusowhy-portal), 인증서 jusohub.codeatlas.kr, ufw 8080/8088, CF DNS jusohub.codeatlas.kr 레코드(→codeatlas.kr엔 api만 남음), 웹루트 319M(`/var/www/{jusohub,jusowhy-portal}`), php8.3-fpm 중지+비활성
  - **미제거(사용자 요청으로 보존)**: MariaDB DB 2개(`jusohub_wp`,`jusowhy_portal_wp`) + mariadb 서비스 살아있음. DROP은 훅이 차단(하드룰, 우회마커 없음)→사용자 직접 실행 필요했으나 "놔둬라"로 보류. 나중에 완전삭제 시: `mysql -e "DROP DATABASE jusohub_wp; DROP DATABASE jusowhy_portal_wp;"` 후 mariadb disable + 백업 삭제

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
