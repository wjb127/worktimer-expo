# iOS 구독 배포 준비 — 페이월 검증 + 구독 심사 스샷 절차

**최종 갱신**: 2026-07-17

iOS에 구독(프리미엄)을 태워 v1.0.1 재제출하기 위한 준비 상태·절차.
펴볼 때: "구독 배포 어디까지 했지", "구독 심사 스샷 어떻게 찍지", "MISSING_METADATA 왜".

## 현재 상태 (07-17 검증)

**준비물 1 — 페이월 2플랜 UI: ✅ 완성·검증**
- `src/components/PaywallModal.tsx` — 연간/월간 2플랜, 연간 기본선택, 월간×12 대비 절약률 배지,
  7일 무료체험 배지(자격 판정 후에만 — codex 반영), 실결제(`purchasePremiumPackage`).
  오퍼링 조회 실패 시 무료언락 금지 + 재시도 UI(감사 #3 방어).
- `src/lib/purchases.ts` — RC 얇은 래퍼. `$rc_monthly`/`$rc_annual` 조회, `hasTrialEligibility`
  (iOS `checkTrial...` / Android `defaultOption.freePhase`), 키 없으면 완전 no-op.
- `src/lib/premium.ts` — 3단 판정: 로컬체험(grandfather) > RC entitlement `premium` > 서버 `/me/subscription`.
  전부 fail-safe(오검출 없음).
- 호출부: `AnalysisScreen.tsx:367`, `history/CalendarView.tsx:523` (AI분석·기록수정 게이트).
- 커밋 `0fb9687`. **타입체크 클린 + premium/purchases 테스트 16개 PASS**(07-17 재검증).
- ⚠️ 21번엔 "다음 빌드"로 stale하게 적혀 있었음 → 실제론 이미 구현·머지됨.

**준비물 2 — iOS 구독 심사 스샷: 방식 "실기기 아이폰" 확정, 실행 대기(v1.0.1 빌드 선행)**

## iOS 구독(IAP) 심사 스샷 절차 — MISSING_METADATA 해소

- **원인**: ASC 구독 상품 2개(월 `filltime_premium` / 연)가 `MISSING_METADATA` = 각 구독의
  "App Store 심사 스크린샷" 누락. 가격(175지역)·체험오퍼는 이미 설정됨.
- **찍을 화면**: 페이월(PaywallModal) — 연간 선택(기본) 상태 = 7일 체험 배지 + 절약률 노출.
  월/연 두 구독이 같은 페이월에 노출되므로 **같은 스샷 1장을 두 상품에 재사용** 가능.
- **선행조건**: v1.0.1 빌드(페이월+구독오퍼링 포함)를 실기기(iOS26)에 설치 →
  21번 "iOS 대화형 빌드 1회" blocker가 바로 이것.
- **캡처 절차(실기기)**:
  1. 설정 > App Store > Sandbox 계정에 샌드박스 테스터 로그인(실가격·체험자격 렌더)
  2. 앱 실행 → AI분석 or 기록탭 세션수정 진입 → 페이월 모달
  3. 연간 선택(기본) 상태 = 7일 체험 배지 + 월간대비 절약률 보이는 화면
  4. 스샷(전원+볼륨업). iPhone 6.5"(1242×2688)면 규격 안전
  5. ASC → 각 구독 상품 → "App Store 심사 정보 > 심사 스크린샷" 업로드(+리뷰노트 선택)
  6. v1.0.1 앱 심사 제출 시 함께 전송 → MISSING_METADATA 해소
- **규격**: 앱 스크린샷 규격이면 통과(관행 6.5" 1242×2688). 실가격 안 떠도 UI만 보이면 됨.

## v1.0.1 배포 게이트 (전체 순서)

1. **[선행] iOS 대화형 빌드 1회** (FilltimeWidget 프로비저닝, 21번 blocker):
   `cd ~/Project/worktimer-expo && EXPO_ASC_API_KEY_PATH=~/.config/eas-submit/AuthKey_NWM428GNG4.p8 \
   EXPO_ASC_KEY_ID=NWM428GNG4 EXPO_ASC_ISSUER_ID=f8a8b51b-e563-4cc0-a0e7-91f387396c25 \
   npx eas-cli build -p ios --profile production` (전부 Yes)
2. 빌드 실기기 설치 → 페이월 눈확인(코드→화면 렌더 확인 원칙) + 위 스샷 캡처
3. ASC 구독 2개에 심사 스샷 업로드 → MISSING_METADATA 해소
4. v1.0.1 빌드 ASC 업로드(`eas submit`) + 메타데이터 그대로
5. 앱 심사 제출 시 구독도 함께 심사(첫 유료화라 인앱구매 심사 동반)
6. 승인 → 구독 판매 라이브

## 관련 식별자·경로

- ASC 앱ID `6790886125` · 번들 `kr.codeatlas.worktimer` · Team `9Q26686S8R`
- ASC 키: `~/.config/eas-submit/AuthKey_NWM428GNG4.p8`(시크릿 파일) · KeyID `NWM428GNG4` · Issuer `f8a8b51b-e563-4cc0-a0e7-91f387396c25`
- RC: entitlement `premium` · offering `default` · 패키지 `$rc_monthly`/`$rc_annual`
- 가격: 월 4,900 / 연 29,000 · 연간 7일 무료체험

## 같이 보면 좋은 문서
- `17-ios-app-store-submission.md` — iOS 스토어 제출(앱 스크린샷·심사 함정)
- `21-session-2026-07-16-monetization-sprint.md` — 수익화 스프린트(RC/구독서버/오퍼링)
- `19-growth-roadmap.md` — Phase3 수익화 상세
