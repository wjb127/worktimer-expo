# iOS 구독 배포 준비 — 페이월 검증 + 구독 심사 스샷 + OTA

**최종 갱신**: 2026-07-18

iOS에 구독(프리미엄)을 태워 v1.0.1 재제출하기 위한 준비 상태·절차 + EAS Update(OTA) 운영.
펴볼 때: "구독 배포 어디까지 했지", "구독 심사 스샷 어떻게 찍지", "MISSING_METADATA 왜",
"앱 원격 업데이트(OTA) 어떻게", "폰에 어떻게 설치".

## ★ OTA (EAS Update) — 설치·원격 업데이트 (07-18 세팅 완료)

- **세팅**(커밋 `bd50553`): `expo-updates ~29.0.19` + `app.json` updates.url(`u.expo.dev/<projectId>`)
  + `runtimeVersion: {policy: fingerprint}` + `eas.json` preview/e2e→채널 `preview`, production→채널 `production`.
  fingerprint 정책 = 네이티브 지문 일치 빌드에만 OTA 수신(네이티브 불일치 사고 방지).
- **v1.0.1 preview 빌드 완료**(07-18, `d7937014-76f5-4a7d-a2c7-af6adf4d3254`):
  profile=preview / distribution=internal(ad-hoc) / **channel=preview** / runtimeVersion=`c03a1714…`(지문).
  = expo-updates 구워짐 + OTA 활성. **설치 링크**(아이폰에서 열기/QR):
  `https://expo.dev/accounts/gawall/projects/worktimer-expo/builds/d7937014-76f5-4a7d-a2c7-af6adf4d3254`
  ⚠️ 맥 아닌 **아이폰 사파리로** 열어야 설치. 설치 후 설정>일반>VPN및기기관리>개발자앱 신뢰 1회.
- **원격 업데이트(JS/에셋만)**: `cd ~/Project/worktimer-expo && npx eas-cli update --branch preview -m "요약"`.
  앱 **완전 종료 후 재실행** 시 수신. 스토어/리빌드 없음.
- **경계**: 색상·카피·롤링피커 등 JS 변경 = OTA / **네이티브 추가(라이브러리·Live Activity 자산 등) = 새 빌드**.
  지문 바뀌면 `eas update`가 옛 빌드엔 못 보낸다고 자동 차단(안전장치).
- ⚠️ 이 preview 빌드는 **실기기 테스트·OTA·구독 스샷 캡처용**(ad-hoc). App Store 제출은 **production 프로필** 빌드 별도 필요.

## ★ ASC v1.0.1 메타 반영 완료 (07-18, API PATCH — 상세 27번)
ASC에 준비버전 v1.0.1(PREPARE_FOR_SUBMISSION) 생성 + 아래 저장(라이브 1.0은 불변):
- name `필타임: 업무시간 기록 타임트래커` / subtitle `몰입·집중을 잔디로 쌓는 습관 기록`(기존 비어있던 것 채움)
- keywords `시간관리,생산성,딥워크,포모도로,스트릭,프리랜서,재택근무,루틴,타임로그,플래너,집중력,열품타,투두,할일,근무기록,시간기록,작업시간`
- 실제 스토어 반영은 v1.0.1 심사 통과 시.

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

- [x] **1. iOS 대화형 빌드 1회 ✅ 완료(07-18, preview `d7937014`)** — FilltimeWidget 프로비저닝 통과.
  ★함정: inline env(`VAR=x \` 줄바꿈)가 터미널 붙여넣기에서 안 먹어 `.p8` 프롬프트 뜸 → **`export`로 각 줄 완결**해야 eas-cli 자식까지 상속:
  `export EXPO_ASC_API_KEY_PATH=$HOME/.config/eas-submit/AuthKey_NWM428GNG4.p8` / `export EXPO_ASC_KEY_ID=NWM428GNG4` / `export EXPO_ASC_ISSUER_ID=f8a8b51b-e563-4cc0-a0e7-91f387396c25` / `export EXPO_APPLE_TEAM_TYPE=INDIVIDUAL` → `npx eas-cli build -p ios --profile preview`. Team ID 물으면 `9Q26686S8R`, 타겟3개 프로파일 y.
- [ ] **2. 빌드 실기기 설치**(위 링크) → 페이월 눈확인(코드→화면 렌더) + 구독 스샷 캡처(샌드박스)
- [ ] **3. ASC 구독 2개에 심사 스샷 업로드** → MISSING_METADATA 해소
- [ ] **4. production 프로필 빌드** (App Store 제출용, preview는 ad-hoc라 제출 불가) → `eas submit -p ios --profile production --latest`
- [ ] **5. v1.0.1 심사 제출** — 구독 동반(첫 유료화 인앱구매 심사) + 메타(name/subtitle/keywords 이미 반영됨)
- [ ] **6. 승인 → 구독 판매 라이브**

> 💡 이후 JS 변경은 4~6 없이 OTA(`eas update --branch preview`)로 실기기 즉시 반영(위 OTA 섹션).

## ★ v1.0.1 재배포 실전 (2026-07-19) — 자율 배포 뚫은 방법

**빌드 크레덴셜 (production 첫 빌드 = App Store 배포 프로파일 처음)**
- 비대화형 빌드 실패: `Distribution Certificate is not validated for non-interactive builds` — production 프로파일 3개(app/LiveActivity/widget) 생성은 대화형만 됨.
- **해결: `expect`로 대화형 자동응답**(pty 제공). `/tmp/eas-build.exp` — Team ID→9Q26686S8R, cert 재사용·프로파일 생성 프롬프트에 Enter/y. env `EXPO_APPLE_TEAM_ID=9Q26686S8R` + ASC 4종 export하면 애플 비번 안 물음. `--no-wait`로 큐잉만 하고 반환.
- **빌드 ERRORED: `provisioning profile doesn't include signing certificate`** — 공유 계정에 배포 인증서 4개(5B24=A9V37, 41A85=B6B9V, 2×Apple Distribution). EAS 서명=5B24인데 **LiveActivity App Store 프로파일만 옛 인증서(41A85) 참조**(2026-07-14 stale). app/widget은 expect 빌드가 5B24로 재생성했지만 LiveActivity는 재사용됨.
  - **비파괴 수정**: ASC API로 그 프로파일만 삭제(`DELETE /v1/profiles/{id}`) → EAS 재빌드 시 현재 인증서(5B24)로 새로 생성. **인증서 revoke 절대 금지**(공유 계정 — 오늘의인생조언·UNICEF·습관메이커·암기훈련소도 이 인증서 씀).
  - 진단: `GET /v1/profiles/{id}/certificates`로 프로파일별 인증서 serial 대조.

**구독 심사 스샷 (MISSING_METADATA 해소)**
- 결측은 심사 스샷 하나뿐(로케일·가격·기간 다 있었음).
- 업로드 3스텝: `POST /v1/subscriptionAppStoreReviewScreenshots`(예약, subscription 관계) → uploadOperations의 PUT(청크) → `PATCH uploaded=true + sourceFileChecksum=md5`.
- **★ 규격/인코딩 함정**: 1179×2556(아이폰15/16 네이티브)은 `IMAGE_INCORRECT_DIMENSIONS`로 거부. **1242×2688(6.5")로** 리사이즈해도 sips 출력 PNG는 또 FAILED(imageAsset 0x0=디코드실패). **magick으로 clean 재인코딩해야 통과**: `magick src -resize 1242x2688! -background white -alpha remove -alpha off -colorspace sRGB -depth 8 -strip out.png`. 그 뒤 assetDeliveryState=COMPLETE → 구독 READY_TO_SUBMIT.

**제출**
- `eas submit -p ios --profile production --id <buildId> --non-interactive` (무료티어 큐 지연 없었음, 바로 업로드).
- 심사노트에 **구독 페이월 도달경로 추가**(리뷰어가 IAP 찾게): "AI분석 탭 또는 기록 탭 세션수정 시 페이월" (`PATCH /v1/appStoreReviewDetails/{id}` notes).
- 빌드 ASC 처리 후 버전에 첨부(`PATCH /v1/appStoreVersions/{ver}/relationships/build`).
- **★ IAP 심사 제출은 ASC API 불가 → 웹 전용**: `reviewSubmissionItems`는 `subscription` 관계 미지원(409 UNKNOWN). API로 버전만 제출하면 구독은 READY_TO_SUBMIT로 남아 페이월 2.1 리젝 위험. **첫 구독은 반드시 앱 버전과 함께** 제출해야 함("첫 구독 그룹은 새 앱 버전으로 제출").
- **★ ASC 웹 제출 플로우(playwright, 로그인은 사람)**: ①버전 페이지(`/distribution/ios/version/inflight`) "심사에 추가" → 드롭다운 "기존 제출 초안" 선택(확인 다이얼로그 "계속") ②구독 그룹 페이지 "심사에 추가" ③**각 구독 상세**(`/distribution/subscriptions/{id}`) "심사에 추가" → 드롭다운서 같은 초안 선택(⚠️그룹만 넣으면 "그룹 내 자동갱신 구독과 함께 제출" 경고, 개별 구독 2개 다 넣어야 버튼 활성) ④제출 초안 패널 "심사를 위해 제출" → "N개 항목 제출됨". 결과: 버전+그룹+구독2 = 4개 함께 WAITING_FOR_REVIEW.
- ⚠️ 이미 API로 버전만 제출했다면 먼저 취소(`PATCH reviewSubmissions/{id} {canceled:true}` → 버전 DEVELOPER_REJECTED, 편집가능) 후 웹으로 재제출.

## 관련 식별자·경로

- ASC 앱ID `6790886125` · 번들 `kr.codeatlas.worktimer` · Team `9Q26686S8R`
- ASC 키: `~/.config/eas-submit/AuthKey_NWM428GNG4.p8`(시크릿 파일) · KeyID `NWM428GNG4` · Issuer `f8a8b51b-e563-4cc0-a0e7-91f387396c25`
- RC: entitlement `premium` · offering `default` · 패키지 `$rc_monthly`/`$rc_annual`
- 가격: 월 4,900 / 연 29,000 · 연간 7일 무료체험

## 같이 보면 좋은 문서
- `17-ios-app-store-submission.md` — iOS 스토어 제출(앱 스크린샷·심사 함정)
- `21-session-2026-07-16-monetization-sprint.md` — 수익화 스프린트(RC/구독서버/오퍼링)
- `19-growth-roadmap.md` — Phase3 수익화 상세
