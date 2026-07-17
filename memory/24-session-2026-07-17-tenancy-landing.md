# 세션종합(07-17) — 멀티테넌시 배포 + 랜딩 개편 + 압축 후 재개

**최종 갱신**: 2026-07-17

이 파일 하나로 압축 후 즉시 재개. 상세는 22(감사)·23(테넌시 합의문)·19(로드맵) 참조.
펴볼 때: 컴팩트 직후 "어디까지 했지 / 다음 뭐지".

## 오늘 완료 (전부 배포·검증됨)
1. **보안 감사 3라운드** → 22번. 게스트격리·웹훅tx·세션멱등·AI서버게이트·마스킹·푸시해제 등. 백엔드 `1e93e4e`+, 앱 `641613d`+ (모두 라이브)
2. **멀티테넌시 v1.2 합의(3자)+구현+배포** → 23번. registry(SSOT+startup validation)·aud→appId 서버판정·JWT{sub,appId}·레거시 A안·@AppScope/TenantGuard/ScopeAnnotationValidator(fail-closed 부팅)·AppActor·User @@unique([appId,id])·교차테넌트 e2e. codex 검수 3라운드(`2358912`→`55ee9cc`→`cc2aab8`→`fe181f3`). 라이브 E2E(게스트 appId·refresh복원·미등록401) 통과
3. **★마이그레이션 드리프트 근본수정**(`6b907fa`): 마이그레이션 파일이 5테이블(todos·session_todos·session_meta·login_event·app_banner) 안 만들던 것(과거 db push 흔적) → IF NOT EXISTS로 편입. prod no-op, 새DB 완전스키마. **테스트 결정성 파다가 발견한 1년 잠복버그**
4. **테스트 결정성**(`cbc920d`,`0c36f60`): jest globalSetup(테스트DB 하드가드+migrate deploy+14테이블 완전성검사) + `pnpm test:reset`. ⚠️환경이 DB파괴 3중차단(쉘훅+Prisma Claude가드) → 리셋은 사람이 `pnpm test:reset`(터미널)
5. **필타임 랜딩 전면개편+배포**(ss-042 `ed1fa86`,`d2e3cf4`): 플레이스홀더35줄→풀랜딩. HabitHeat 블루잔디 히어로(라이브 컴포넌트, 채워지는 애니)+Forest 구성(문제→3스텝→기능벤토→공유카드→도그푸딩→가격→CTA)+Pretendard. **★루트 app/이 src/app 가리던 404 장애 복구**(랜딩·privacy·terms 전부 죽어있던 것→전라우트 200)

## ✅ GitHub 동기화 완료 (07-17 push)
- **worktimer-expo**: `df36f90`까지 push 완료 (memory 문서들 + 앱측 보안수정 + DB이관 문서 동기화)
- **ss-042-filltime-landing**: `d2e3cf4`까지 push 완료 (랜딩 전면개편 + 공유카드 fix)
- codeatlas-platform-api: 이미 동기화됨 (diary 세션이 푸시, `d757a76` 조각일기 브랜드)

## 다음 작업 (재개 우선순위)
1. **diary(조각일기) 재개** — 재개 게이트 충족됨. `diary-wip-checkpoint-20260717` 브랜치에서 registry에 ai-diary 채우고(OAuth클라·audience env·probeRoutes) 모듈 @AppScope 재작성, 신규테이블 day-1 복합FK. ⚠️브랜드명 "조각일기"로 확정됨(appId는 ai-diary 유지)
2. **랜딩 후속**: Android 승인시 site.ts `android.available:true` / 실제 앱스샷 확보시 교체 / OG 다듬기
3. **codex 미해결 정책 1건**: 게스트 body appId 암호학 바인딩 불가 — 토론
4. **REQUIRE_JWT_APP_ID 전환기 닫기** (전 유저 토큰 회전 후 며칠 뒤)
- ~~git push 3repo~~ ✅ 07-17 완료

## 핵심 포인터
- 랜딩: ss-042-filltime-landing, filltime.vercel.app(Vercel CLI배포). ★배포는 deploy-guard가 cwd(worktimer-expo) 기준검사 → ss-042의 .claude/deploy-target+.vercel/project.json을 worktimer-expo에 임시복사→`vercel --prod`→`vercel alias set <배포> filltime.vercel.app`→임시파일 제거(settings.local.json 보존). alias 자동이동 안함
- 테스트DB 리셋: `cd codeatlas-platform-api && pnpm test:reset`(본인 터미널)
- 백엔드 배포: `GIT_PUSH_APPROVED=1 SERVER=root@45.77.135.225 ./deploy/deploy.sh` (배포전 백업: `/usr/local/bin/pg-backup-codeatlas.sh`)
- 실기기: SM-A165N 무선adb

## 같이 보면 좋은 문서
- `23-multitenancy-architecture-plan.md` — 테넌시 합의문 v1.2 전문
- `22-security-audit-fixes.md` — 감사 판정·수정
- `21-session-2026-07-16-monetization-sprint.md` — 전일 수익화
