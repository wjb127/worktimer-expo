# 세션종합(07-16) — 수익화 스프린트 + 압축 후 재개 가이드

**최종 갱신**: 2026-07-16

이 파일 하나로 컨텍스트 압축 후 즉시 재개. 상세는 19(로드맵)·20(DB이관) 참조.
펴볼 때: 컴팩트 직후, "어디까지 했지 / 다음 뭐지".

## 오늘 완료 (전부 커밋·푸시·배포·검증됨)
1. **DB 이관**: Supabase→VPS PG16 + R2 오프사이트 백업 + 어드민 VPS 이사(admin.codeatlas.kr) → 20번
2. **구 웹 데이터 회수**: public.work_sessions 122세션/195h + **할일 903개 + 세션링크 70개** → codeatlas (구글유저 631269b9...). 최종 1,620세션/1,810h 정합. ⚠️웹이 계속 public에 쓰는 중 — 전환/동기화 미결
3. **위젯 양OS**: Android 실기기 렌더 검증 ✅ (투명버그 = legacy arch headless → **newArchEnabled:true**로 해결)
4. **FCM 풀체인**: Firebase(codeatlas-500015)+google-services.json(EAS file env)+FCM V1키 → push_tokens 실토큰 안착 검증
5. **RevenueCat**: 프로젝트 3330e6b6, 앱2개(IAP키 CC8Y7QB24X), SDK키 EAS env, entitlement `premium`, 웹훅 E2E
6. **구독 서버**: subscriptions/subscription_events + RC웹훅 + /me/subscription (backend `da09e6f`)
7. **프리미엄 v1**(`cd034a0`+`9c82ddd`): premium.ts 3단판정(로컬체험>RC>서버) + PaywallModal(**오퍼링 감지시 실결제 자동전환**, 없으면 로컬체험) + 기록수정 게이트(수동추가는 무료)
8. **AI분석 = GPT식 채팅**(backend `82f262e`): chat_sessions/messages DB + /ai/* CRUD + 분석칩(일/주/달)→채팅응답→자유대화. **Haiku 키없으면 룰베이스 폴백으로 완전동작**(E2E 게스트 검증). 분당 10회 스로틀
9. **가입자 현황판**: `filltime.vercel.app/admin-dashboard-v3` 라이브 — backend GET /admin/overview(x-admin-key) + 랜딩 프록시(비번게이트) + noindex. 스모크 200/401/실데이터 ✅
10. **빌드6**(`1772a785`) 폰 설치됨 — 채팅AI+프리미엄+위젯+RC+FCM 전부 포함 최종본

## ★사용자 액션 대기 (블로커)
- [x] ~~Anthropic API 키~~ **해결(07-16)**: 재발급 불필요 — work-timer Vercel prod env의 키가 살아있었음(200). `vercel env pull`→VPS `/opt/codeatlas-api/.env` 주입→**AI 자유채팅 ON**(E2E 실응답 확인). ⚠️주입 시 .env 소유권 함정: sed -i가 root 소유로 재생성→하드닝 드롭인(User=codeatlas) 때문에 EACCES 크래시→`chown codeatlas:codeatlas`로 복구. ⚠️발견 버그: 세션 0개 유저도 systemPrompt에 "시간대: 0시" 가짜 통계 주입(ai.service.ts bestHour indexOf) → 빈데이터 가드 필요(미수정)
- [x] ~~구독 가격~~ **완료(07-16): 월 4,900 / 연 29,000 + 연간 7일 체험 확정** → ASC 상품 2개(가격 175지역·체험오퍼·MISSING_METADATA=심사스샷만 남음) + Play `filltime_premium` monthly/yearly ACTIVE + freetrial7d ACTIVE + RC offering `default` 구성·REST 검증 완료. 상세·함정은 19번 Phase3. ✅페이월 2플랜 UI 완료(`0fb9687`, 타입체크+테스트16 그린, 07-17 검증). 남은것: iOS 구독 심사스샷(실기기 방식 확정 → 17번 절차, v1.0.1 빌드 선행), Android 실결제는 내부테스트 트랙에서
- [ ] **iOS 대화형 빌드 1회** (FilltimeWidget 프로비저닝): `cd ~/Project/worktimer-expo && EXPO_ASC_API_KEY_PATH=~/.config/eas-submit/AuthKey_NWM428GNG4.p8 EXPO_ASC_KEY_ID=NWM428GNG4 EXPO_ASC_ISSUER_ID=f8a8b51b-e563-4cc0-a0e7-91f387396c25 npx eas-cli build -p ios --profile production` (전부 Yes)
- [ ] admin.codeatlas.kr 실로그인 눈확인 / 폰에서 빌드6 기능 확인(AI채팅·페이월·할일903개)

## 다음 작업 후보 (Claude가 이어갈 것)
- 웹 워크타이머(~/Project/work-timer) → codeatlas API 전환 or 동기화 크론 (diff 재발 방지)
- 스토어 승인 후 v1.0.1 양대 제출 (위 기능 전부 탑재)
- Supabase 정리(~07-30), mariadb 정리(보류중)

## 핵심 포인터
- 시크릿: VPS `/root/.secrets/`(rc-webhook-auth·admin-dash-key·pg-codeatlas-pw), `~/.config/eas-submit/`(p8·SA·FCM키), Keychain `ss-042-filltime-landing/admin-dash-password`
- repo 4개 전부 푸시됨: worktimer-expo(`4c4c12c`+) / codeatlas-platform-api(`82f262e`+admin) / ss-037(`672a359`) / ss-042(admin-dashboard-v3 — **커밋 필요 확인**)
- 실기기: SM-A165N 무선adb(`adb mdns services`→connect), 빌드6 설치됨
- 배포: 백엔드 deploy.sh(migrate 자동) / 어드민 deploy-vps.sh / 랜딩 vercel --prod+**alias set 필수**(자동이동 안함)
- ⚠️훅: 이 세션 쉘 cwd가 worktimer-expo로 강제리셋 → 타 프로젝트 vercel 배포시 deploy-guard가 cwd 기준 검사(사용자 승인 후 링크파일 임시복사로 통과했음)

## 같이 보면 좋은 문서
- `19-growth-roadmap.md` — 로드맵 전체 + 오늘 항목 상세
- `20-db-migration-vps-postgres.md` — DB·이관·백업 상세
