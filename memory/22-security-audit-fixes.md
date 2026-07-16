# 출시 전 보안 감사 12건 — 검수·수정·배포 (07-16)

**최종 갱신**: 2026-07-16

외부 감사(코덱스류) 12건을 전수 검수 → 11건 동의(#6 부분동의) → 심각건 즉시 수정·배포.
펴볼 때: "감사 지적 뭐였지", "게스트/웹훅/멱등 왜 이렇게 돼있지", "결정 대기 항목".

## 판정·처리 요약
| # | 지적 | 판정 | 처리 |
|---|---|---|---|
| 1 | P0 테스트→운영DB fail-open | 동의 | ✅ setup-env: DATABASE_URL_TEST 필수(미설정 즉시 실패) |
| 2 | P1 게스트 전원 guest-demo 공유 | 동의 | ✅ 로그인마다 `guest-{uuid}` 고유 유저. 잔존 guest-demo 정리는 **결정 대기** |
| 3 | P1 결제장애=영구 무료 프리미엄 | 동의 | ✅ 앱 `0fb9687`: 페이월 2플랜 + 오퍼링 실패=재시도 UI(무료지급 제거). 기존 로컬체험 보유자 grandfather — 회수는 **결정 대기** |
| 4 | P1 AI 서버 권한검사 없음 | 동의 | ✅ ai.service isPremium 게이트 — 비프리미엄 LLM 호출 차단(비용 0), 분석은 룰베이스. **오너(qhv147)에 comp_owner active 구독 수동 부여**(폰 Claude 유지) |
| 5 | P1 웹훅 중복·역순 취약 | 동의 | ✅ `rc_event_id` unique(중복 skip) + `last_event_at` 비교(역순 무시). 마이그레이션 `20260716130000` |
| 6 | P1 계정삭제 거짓성공+Apple revoke 없음 | **부분동의** (cascade 있어 "행만 삭제"는 과장) | ✅ 앱: res.ok 검사+실패 알럿. Apple 토큰 revoke는 **결정 대기**(client secret 인프라 필요, 심사 가이드 5.1.1(v)) |
| 7 | P1 로그아웃해도 refresh 30일 생존 | 동의 (백엔드 /auth/logout 이미 존재, 앱이 안 불렀음) | ✅ 앱 signOut이 서버 revoke 호출(베스트에포트) |
| 8 | P1 유저 전환 시 푸시 이전계정 귀속 | 동의 | ✅ signOut 시 푸시토큰 캐시 초기화 → 다음 로그인이 재등록(서버 upsert가 소유 이관) |
| 9 | P1 타이머 시작/종료 비멱등 | 동의 | ✅ start=진행중 재사용, end=재종료 시 그대로 반환(duration 불변) |
| 10 | P2 delete API 실패 삼킴 | 동의 | ✅ sessions/todos delete !ok면 throw (콜사이트 복구로직은 이미 있었음) |
| 11 | P2 어드민 API appId 미격리 | 동의(단일앱이라 저위험) | **결정 대기** |
| 12 | P2 AI 마크다운 평문 노출 | 동의(실기기 확인) | ✅ 서버 프롬프트 평문 지시 + 앱 stripMarkdown. 덤: 세션 0개 가짜통계(bestHour=0시) 가드 |

## 커밋·배포
- 백엔드 `9e7e6e4` (adm 모듈 커밋 누락분 포함) — **VPS 배포·마이그레이션·E2E 완료**
- 앱 `0fb9687`(페이월 2플랜) + `641613d`(#6#7#8#10#12) — tsc 0·jest 43/43, **v1.0.1 빌드 탑재 대기**
- E2E 실측: 게스트 2회 로그인 → 서로 다른 user id ✓ / 게스트 자유채팅 → "프리미엄 기능" 안내 ✓ / 분석 칩 → 룰베이스 ✓ / start×2 동일 세션 ✓ / end×2 duration 불변 ✓
- 시각화 리포트: `docs/backend-audit-2026-07-16.html` (워크플로우 생성, git 미추적 로컬 문서)

## ★ 멀티세션 격리 배포 레시피 (km-216 응용 실전)
백엔드 워킹트리에 **ai-diary 세션 WIP**(멀티앱 확장, DiaryModule, ALLOWED_APP_IDS)가 미커밋 상태로 섞여 있었음.
auth.service·schema.prisma·app.module 3개 파일은 내 수정과 **혼합**이라 stash 불가 →
1. `git worktree add /tmp/api-audit-deploy HEAD` (깨끗한 HEAD 사본)
2. clean 파일은 cp, 혼합 3개는 HEAD 버전에 내 수정만 재적용(python 치환)
3. node_modules 심링크(메인 레포 client가 mixed schema superset이라 빌드 호환) → 빌드·테스트·deploy.sh 전부 워크트리에서
4. 본 레포 커밋은 `git hash-object -w` + `git update-index --cacheinfo`로 워크트리 버전을 index에 직접 스테이징 — **워킹트리(남의 WIP) 무접촉**
5. 커밋 후 `git status`: 내 것 = 커밋됨, 남의 WIP = ` M`으로 그대로 보존

## 결정 대기 (사용자)
- [ ] #6 Apple 로그인 토큰 revoke 구현 여부 (Apple client secret 필요)
- [ ] #11 어드민 API appId 스코핑 (멀티앱 확장 시 필수 — diary 온보딩 전에 하면 좋음)
- [ ] #2 잔존 guest-demo 계정·데이터 삭제 여부 (내 E2E 테스트 데이터 섞여있음)
- [ ] #3 기존 로컬체험 플래그 보유자 회수 여부 (현재 영구 grandfather — 사실상 오너 폰뿐일 가능성)

## 같이 보면 좋은 문서
- `21-session-2026-07-16-monetization-sprint.md` — 같은 날 수익화 스프린트
- `19-growth-roadmap.md` — Phase 3 상세
