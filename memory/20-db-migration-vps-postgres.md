# DB 이관 — Supabase → VPS 로컬 PostgreSQL (2026-07-16)

**최종 갱신**: 2026-07-16

codeatlas DB를 공유 Supabase에서 VPS(45.77.135.225) 로컬 PostgreSQL 16으로 이관한 기록.
펴볼 때: "DB 어디 있지", "백업 어떻게 되지", "psql 어떻게 접속", "Supabase 아직 쓰나", "마이그레이션 어떻게 적용".

## 왜 이관했나
- Supabase 실사용 기능 0 (Auth/Storage/Realtime/PostgREST/RLS 전부 미사용) — 순수 매니지드 PG로만 쓰면서 **공유 프로젝트**(bzzjkcrbwwrqlumxigag)에 얹혀살아 blast radius 공유
- DDL 마찰 실사고: push_tokens 테이블이 앱 롤 권한부족+MCP 끊김으로 pending 됐던 것 (07-15)
- PostgREST 노출 리스크(12번 C섹션) 원천 제거, API↔DB 로컬 소켓
- 타이밍: 유저 9명·세션 1,503(도그푸딩)일 때가 유일한 적기

## 현재 상태 (이관 완료 ✅)
- **DB**: VPS PostgreSQL 16.14, `127.0.0.1:5432`만 바인딩(외부 노출 없음, 방화벽 안 엶)
- **접속**: db `codeatlas` · user `codeatlas` · 비번 `/root/.secrets/pg-codeatlas-pw`(600) · 스키마 `codeatlas`
  - 콘솔: `ssh root@45.77.135.225` → `sudo -u postgres psql codeatlas`
- **검증**: users 9 / sessions 1503 카운트 원본 일치, `/config/banners` 실쿼리 OK, API active
- **.env**: `DATABASE_URL=postgresql://codeatlas:***@127.0.0.1:5432/codeatlas?schema=codeatlas` (sslmode 불필요). 백업 `.env.bak-20260716` (구 Supabase URL — 롤백용)
- **Prisma 마이그레이션**: 베이스라인 resolve 완료(init + add_push_tokens) → **이제 deploy.sh가 `migrate deploy` 자동 적용** (공유 DB 보호 정책 폐기, 전용 DB)
- push_tokens 테이블 생성됨 (Supabase엔 안 만들어도 됨 — pending SQL 자연 소멸)

## 백업 (협상 불가 조건 — 세팅 완료 ✅)
- `/usr/local/bin/pg-backup-codeatlas.sh` — pg_dump→gzip, 최소크기 검증(10KB), 30일 보존
- 크론 `/etc/cron.d/pg-backup-codeatlas` — 매일 19:10 UTC(KST 04:10), 로그 `/var/log/pg-backup-codeatlas.log`
- 저장: `/var/backups/postgres/codeatlas-*.sql.gz` (첫 백업 61KB)
- **복원 리허설 통과**: 백업→임시DB 복원→9/1503 카운트 일치 확인 후 임시DB 정리
- **오프사이트 완료**: Cloudflare R2 `codeatlas-backups`에 업로드, 90일 보존. 아래 R2 섹션이 현재 상태.

## 이관 절차 (재사용 레시피)
1. `apt install postgresql` (localhost 기본 바인딩 확인 `ss -tlnp | grep 5432`)
2. 앱 롤+DB 생성 (비번은 openssl rand → 파일로만, stdout 금지)
3. `systemctl stop` API (무손실) → `pg_dump "$SUPABASE_URL" --schema=codeatlas --no-owner --no-privileges` (pg_dump 버전 ≥ 서버 버전 확인. psql용 URL에서 `&sslaccept=strict` 제거 필요 — prisma 전용 파라미터)
4. 앱 롤로 복원(소유권 자동) → **카운트 검증** → .env 교체(백업 먼저) → start → 외부 스모크(DB 실쿼리 엔드포인트로)
5. `prisma migrate resolve --applied <각 마이그레이션>` 베이스라인 → 이후 deploy.sh가 migrate deploy
6. 백업 크론 + **복원 리허설 1회** (백업 파일이 진짜 복원되는지)

## 어드민 콘솔(ss-037) — VPS 이사 완료 ✅ (07-16, ②안)
- ①(NestJS 포팅)은 실측 후 폐기(users 라우트만 268줄, 포팅버그 리스크) → ②(VPS 이사, 코드변경 최소)로 사용자 재승인
- **https://admin.codeatlas.kr** — systemd `codeatlas-admin`(:3001, 하드닝, codeatlas 유저) + nginx + LE cert(DNS-01) + CF 프록시 ON. ss-037 커밋 `ad2e9e2`, 재배포 `./deploy/deploy-vps.sh`
- 변경: next standalone + db.ts 로컬이면 ssl off. env는 `/opt/codeatlas-admin/.env`(640)
- 검증: /login 200 + 오답로그인 401 + **admin_login_attempts 실제 기록 확인**(catch가 DB실패 삼키므로 401만으론 증거 아님 — 테이블 행으로 검증하는 게 정석)
- ★★ **함정: postgres.js에 `?schema=` 붙은 URL 주면 조용히 연결 거부** — Prisma 전용 파라미터를 PG 서버에 그대로 전달해서. 어드민 auth가 전부 try/catch라 에러도 안 보임(401만 나옴). postgres.js용 URL엔 schema 파라미터 제거 필수
- Vercel 구 배포는 살아있음(stale Supabase 봄) — 혼란 방지 위해 pause/삭제 권장(사용자 결정)

## R2 오프사이트 백업 — 완료 ✅ (07-16)
- 버킷 `codeatlas-backups`(Qhv147 CF계정 46e9985a...) — 백업 스크립트가 pg_dump 후 `rclone copyto` 업로드. **로컬 30일 + R2 90일** 보존
- 자격증명: CF API 토큰(`op://Dev-Clients/otdvwuq4kkzw7xakwqwrcamshi`)에서 파생 — **access_key_id=토큰ID, secret=SHA256(토큰값)** (CF 공식 S3 호환 방식). VPS `/root/.config/rclone/rclone.conf`(600)
- ★함정: apt rclone(1.60)은 R2에 501 NotImplemented 재시도 소음 → **공식 최신(1.74)을 /usr/local/bin에** 설치로 해결(클린 실행 검증됨)
- 검증: R2에 61KB 백업 안착 확인(rclone ls)

## Vercel 구 어드민 정리 — 완료 ✅ (07-16)
- **git 연동 해제**(`vercel git disconnect`) — ★git push가 stale Vercel 자동배포를 계속 만들고 있었음(푸시 1분 뒤 새 배포 발견). 연동 끊어 재발 차단
- 프로덕션 배포 4개 전부 삭제 → 기본 도메인 404. 프로젝트·env는 보존(롤백 가능). 어드민 진입점은 **admin.codeatlas.kr 유일**
- (참고: Vercel CLI vca_ 토큰은 REST PATCH에 안 먹힘 — CLI 명령으로 우회)

## 구 웹 워크타이머 데이터 이관 ✅ (07-16 — "이관 미흡" 체감의 진짜 정체)
- **`public.work_sessions`(공유 Supabase, 구 work-timer 웹앱 테이블)에 1,616행/1,810h** — 모바일만 codeatlas로 전환됐고 **웹은 여전히 public에 기록 중**이었음(당일 기록 존재). codeatlas엔 1,498행/1,615h만 = **195h가 웹에만**
- 이관: service_role PostgREST로 전체 덤프 → VPS에서 **start_time 초절삭 anti-join** → 미존재 **122세션 INSERT**(구글유저 631269b9..., category/description은 session_meta로) → 최종 **1,620세션/1,810h 정합**. 사전 백업 `codeatlas-20260716-0519.sql.gz`
- 구 테이블 특징: 정수 id, user_id 전부 null(단일유저 웹), category/description 인라인
- 접근 함정: codeatlas 롤·어드민 롤 모두 public 권한 없음(격리 설계) → **service_role 키(ss-037 .env.local)로 PostgREST 조회**가 유일 경로였음
- ⚠️ **미해결: 웹이 계속 public에 쓰면 diff 재발** — 옵션: ①웹을 codeatlas API로 전환(근본) ②주기 동기화 크론 ③웹 중단. 사용자 결정 대기

## 남은 것
- [ ] **웹 워크타이머 → codeatlas 전환 or 동기화** (위 참조, 사용자 결정)
- [ ] **Supabase 정리** — 2주 관찰(~07-30) 후 codeatlas 스키마 제거. **단 public.work_sessions는 웹 문제 해결 전까지 보존**
- [ ] mariadb(미사용, jusohub 잔재) 내리면 메모리 회수 — 사용자 보류 중이었음
- [ ] 어드민 실로그인 확인(사용자, Keychain 비번) — smoke는 통과, 대시보드 렌더만 눈확인

## 같이 보면 좋은 문서
- `12-launch-action-plan.md` — C섹션 백엔드 하드닝·CF 이관 (이 문서의 선행 인프라)
- `.private/01-codeatlas-infra.md` — VPS·시크릿 참조
- codeatlas-platform-api repo `deploy/deploy.sh` — 마이그레이션 자동 적용 반영됨
