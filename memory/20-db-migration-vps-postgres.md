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
- ⚠️ **오프사이트(R2) 미완**: 현재 백업이 VPS 안에만 있음 = 디스크 사망 시 같이 죽음. R2 액세스 키 발급(사용자) 후 스크립트에 업로드 추가 필요

## 이관 절차 (재사용 레시피)
1. `apt install postgresql` (localhost 기본 바인딩 확인 `ss -tlnp | grep 5432`)
2. 앱 롤+DB 생성 (비번은 openssl rand → 파일로만, stdout 금지)
3. `systemctl stop` API (무손실) → `pg_dump "$SUPABASE_URL" --schema=codeatlas --no-owner --no-privileges` (pg_dump 버전 ≥ 서버 버전 확인. psql용 URL에서 `&sslaccept=strict` 제거 필요 — prisma 전용 파라미터)
4. 앱 롤로 복원(소유권 자동) → **카운트 검증** → .env 교체(백업 먼저) → start → 외부 스모크(DB 실쿼리 엔드포인트로)
5. `prisma migrate resolve --applied <각 마이그레이션>` 베이스라인 → 이후 deploy.sh가 migrate deploy
6. 백업 크론 + **복원 리허설 1회** (백업 파일이 진짜 복원되는지)

## 남은 것
- [ ] **어드민 콘솔(ss-037) 경로** — Vercel에서 postgres.js로 Supabase 직결 중 → 지금은 이관 시점 스냅샷(stale)을 봄. 깨진 건 아님. NestJS admin API(①안, 라우트 5개 포팅: login/stats/users/users[id]/banners — users만 268줄) or 어드민 VPS 이사(②안, 코드변경 0)
- [ ] **R2 오프사이트 백업** — 사용자가 CF 대시보드에서 R2 API 토큰 발급 → rclone/aws-cli로 nightly 업로드 추가
- [ ] **Supabase 정리** — 2주 관찰(~07-30) 후 codeatlas 스키마 제거. 그 전까진 롤백 백스톱
- [ ] mariadb(미사용, jusohub 잔재) 내리면 메모리 회수 — 사용자 보류 중이었음

## 같이 보면 좋은 문서
- `12-launch-action-plan.md` — C섹션 백엔드 하드닝·CF 이관 (이 문서의 선행 인프라)
- `.private/01-codeatlas-infra.md` — VPS·시크릿 참조
- codeatlas-platform-api repo `deploy/deploy.sh` — 마이그레이션 자동 적용 반영됨
