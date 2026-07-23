# 출시 현황 + 마케팅 로드맵 (07-19 밤)

**최종 갱신**: 2026-07-22

v1.0.1 재배포+구독 심사 제출 완료 시점의 전체 현황과 "심사 후 마케팅" 로드맵.
펴볼 때: "지금 어디까지 왔지", "마케팅 언제·뭐부터", "심사 상태", "안드 수익화 갭".

## ★★★ 2차 반려 대응 (07-24) — build 6 + 코덱스 감사 반영
- **2차 반려 원문(07-22 22:44, 실기기)**: ①3.1.2(c) 페이월(앱내)에 EULA·프라이버시 링크 없음 ②3.1.1 "구매 복원" 버튼 없음. 구독 2개 REJECTED는 앱 반려 연쇄(자동 반환).
- **대응(daf0a4a)**: PaywallModal 하단 legalRow(구매 복원·이용약관(표준EULA)·개인정보처리방침) + purchases.restorePurchases(). tsc·55tests PASS. **build 6** 재빌드→재제출.
- **코덱스(GPT) 독립감사 반영**: ①랜딩 방침에 Anthropic·RevenueCat 위탁 + 접속기록 5년 보관 명시(ss-042 f949004 푸시) ②**ASC 프라이버시 라벨 7종으로 갱신·게시**(+기타 사용자 콘텐츠, 구입 내역 — 각 앱기능/신원연결/추적없음). ⚠️gstack JS 라디오 클릭이 '예'로 잘못 저장된 것 id 기반(`CONFIRM_TRACKING_*_radioButton_false`)으로 정정 — **ASC 설문 라디오는 반드시 id로 클릭+checked 재검증**.
- **백로그**(다음 업데이트): 체험 문구에 "종료 후 {가격} 자동갱신" 명시 / Android 설정에 구독관리 링크 / 복원 에러 구분(restored·none·error) / AI 데이터 동의 화면 / 계정삭제 시 로그 익명화.
- ★ node_modules 깨짐 재발(앱·랜딩 둘 다, top-level만 소실) → mv로 치우고 클린 재설치. 앱은 npm(훅이 막으면 `npx --yes npm@11 install`), 랜딩은 pnpm.

## ★★ 심사 상태 (07-22 21:55 KST) — iOS 재제출 완료 ✅ / Android 확인 대기
- **iOS v1.0.1 = 재제출됨(WAITING_FOR_REVIEW, 07-22 12:53 UTC)**. 구독 2개 IN_REVIEW 유지.
  - **반려 원문(07-20)**: `3.1.2 Business: Payments - Subscriptions` — "auto-renewable subscriptions but does not include a functional link to the **Terms of Use (EULA) in the app's metadata**. 표준 Apple EULA면 App Description에 링크 추가."
  - **해결**: 바이너리 문제 아님(재빌드 불필요). App Description(ko) 하단에 구독 안내 + **표준 Apple EULA 링크**(apple.com/legal/.../stdeula) + 개인정보처리방침 링크 추가(API PATCH, 589자) → 버전페이지 "심사 업데이트"→계속 → 제출상세 "앱 심사에 다시 제출" 클릭. 같은 제출건(ad1b2d2d) 재제출.
  - ★ 다음 iOS 앱도 구독 있으면 **설명에 EULA 링크 처음부터 넣을 것** (3.1.2 단골). 페이월 안 ToU/프라이버시 링크+복원버튼도 다음 빌드에 추가 권장(이번엔 메타만 지적됐지만 풀 요건).
  - ★ 반려 원문 읽기: ASC API론 불가(resolutionCenterThreads 404) → 웹 필요. **gstack headed 브라우저($B connect, 별도 창)에 사용자 로그인 1회** → 이후 조작 전부 자동(cu처럼 사용자 화면 안 뺏음). playwright 잠기면 이 경로.
- **Android vc4 = 정상 심사 중 ✅ (막힌 것 아님, 07-22 Play Console 실확인)**:
  - 게시 개요에 "**변경사항을 검토 중입니다**" — 프로덕션 1.0.1(vc4)+176개국+등록정보+콘텐츠등급+데이터보안 전부 심사 중. **관리형 게시 꺼짐 = 승인 즉시 자동 게시.**
  - ❌기각: 12테스터 요건 아님(가월 계정엔 습관메이커·Life Timer 등 프로덕션 앱 기존재 = 프로덕션 액세스 있음). 수동 전송 게이트도 아님.
  - 앱 목록의 "아직 검토를 위해 전송되지 않음"은 **vc1 내부테스트 draft** 표시였음(오해 소지, 심사 무관).
  - 참고: 신규 앱 + 구독 + 건강앱 선언이라 심사 길어질 수 있음(7일+ 정상). 07-20 03:27 제출 → **07-27 이후에도 무소식이면 에스컬레이션**. 재제출 금지(시계 리셋).

## ★ 현재 상태 (한눈에, 07-19 제출 시점)
- **iOS v1.0.1 = 심사 제출됨 → 07-22 REJECTED 확인(위 참조)**. build 5 첨부.
  - 포함: 롤링 수정(c8bbdef, TimeRangeWheel 느린드래그 확정 + CalendarView 제스처 복구)
    + ASO 이름/부제/키워드 + AI스트리밍·대시보드·테마·알림인박스 등 최신 JS 전부
  - **구독 연간/월간도 함께 WAITING_FOR_REVIEW** (버전+그룹+구독2 = 4개 한 심사건). 첫 유료화.
  - 승인 시 → ASO 키워드 검색노출 + 구독 결제 라이브 동시.
- **폰(WiPhone)**: build 5 ad-hoc 설치 완료. OTA runtime `c694be81`(이후 preview OTA 닿음).
- **측정 인프라 = 준비 완료**: PostHog AARRR 대시보드(project 497680, dash 1871502) + UTM 숏링크(랜딩).
- 상세 배포 방법/식별자/교훈 → **25번**(iOS 구독) + 배포 실전 교훈.

## ★ "수익화 올라갔다"의 정확한 의미
- **제출됨/심사 중 ≠ 라이브.** iOS 승인 나야 실제 구독 판매. 지금은 "준비 끝 + 대기".

## 마케팅 게이트 (언제 시작?) — iOS-first (07-19 정제)
**"iOS+Android 둘 다 승인 후 마케팅"은 과보수.** Android 때문에 iOS 학습을 늦출 이유 없음.
- **iOS 1.0.1 승인 즉시 = 오가닉 소프트런치 시작** — SNS 도그푸딩·타깃 커뮤니티·지인. 목표는 매출 아니라 **첫 세션 완료 표본 + D1/D7 데이터**.
- **유료 광고는 스토어별 결제 스모크 후** — iOS 실구독 구매/복원 확인되면 iOS 유료광고 OK. Android는 RC 갭(아래) 닫고 별도 트랙.
- 광고비 새는 것 방지: 다운로드+결제가 실제 동작하는 스토어에만 유료 집행.

### 승인 후 페이즈 (요약, 상세는 아래 로드맵)
1. **0~2주 소프트런치**: iOS 오가닉 유입, 설치→온보딩→첫세션→D1→D7→공유 퍼널 측정. **신규 대형기능 개발 중단.**
2. **2~4주 리텐션 판정**: D7<15% 온보딩·타이머진입 마찰 수정 / 15~20% 리캡·위젯·스트릭 / ≥20% 공유딥링크·페이월 최적화. (추억팔이는 "지난주/30일 전"으로 단축, 1년 전은 신규엔 너무 늦음)
3. **4~8주 바이럴**: 공유카드에 앱링크·UTM, 세션종료·주간리캡에서만 공유 제안. 공개 인증페이지는 공유클릭 데이터 나온 뒤.
4. **8주+ 추가 BM**: 프리랜서 고객/프로젝트 분류·월간 PDF·Freelancer Pro(유료의사 확인 후). 친구피드·랭킹은 마지막.

### ⚠️ Android 갭 (07-20 브라우저+API 실측 확정)
- ✅ **RC 정상** — 코덱스 "RC 오퍼링 0패키지"는 오진. 대시보드 Android 상품 2개 Published + `default` 오퍼링 연결 + REST가 Android로 2패키지(`$rc_monthly`/`$rc_annual`→`filltime_premium`) 반환. **RC 고칠 것 없음.**
- ✅ **Play 상품/트랙 있음** — 구독 ACTIVE, production 트랙 vc2(completed)+internal vc1. 공개 404 = 첫앱 구글심사 대기.
- ✅ **해결(07-20)**: production vc2(RC 前 빌드)를 **vc4(1.0.1, RC+롤링수정+2플랜페이월)로 덮어써서 제출** — production 트랙 vc4 completed, 구글 재심사중. 승인되면 안드 페이월·구독 동작.
  - ★ **Play 권한 함정**: vc3 제출이 `photo and video permissions 선언` 정책으로 실패 — expo-media-library가 공유카드 저장기능에 READ_MEDIA_IMAGES/VIDEO(광범위 읽기)를 자동추가. 앱은 저장만 함(saveToLibraryAsync). **fix**: `plugins/withMediaWriteOnly.js`(withBlockedPermissions로 READ_MEDIA_*·READ_EXTERNAL_STORAGE 차단, tools:node=remove) + ShareCardModal `requestPermissionsAsync(true)` writeOnly. prebuild로 매니페스트 검증. 커밋 4894490 → vc4.
- Android ASO — 긴 설명(4000자) 키워드 자연반복 + 짧은설명 80자 (27번). 새 빌드 제출 때 등록정보 갱신.

## "마케팅 시작" = 구체적으로 뭐냐
현 병목 = **store_click 0** (아무도 랜딩→스토어로 안 옴 = 퍼널 최상단 Acquisition이 전부).
1. **채널 정하기** — 오가닉/커뮤니티/광고 중. 앱 성격(일·몰입 생산성) 타겟.
2. **랜딩(filltime.vercel.app)/스토어로 사람 보내기** — UTM 숏링크로 채널별 추적.
3. **AARRR 대시보드로 측정 → 반복** — 유입 부으면 store_click·활성화·리텐션·결제 퍼널이 살아남.
- 포지셔닝: "열품타=공부, Strava=운동, 필타임=일·몰입". iOS 라이브 먼저라 초기엔 iOS로 유입 몰기.

## 성장 원칙 (mem 19 연장선)
측정(✅대시보드) → 수익화(✅구독 제출) → **다음 = 유입(마케팅)** → 리텐션 개선 → 바이럴(공유카드).
지금은 유입 부어서 대시보드 바늘을 움직일 사람을 데려오는 단계.

## 다음 액션 (사용자 선택 대기)
- [x] **Android production 빌드 vc4(RC+페이월+권한fix) → Play 제출 완료(07-20)** — production 트랙 vc4, 구글 재심사중. 승인 대기.
- [ ] 마케팅 계획 수립 (채널 우선순위 + 첫 2주 액션 + 예산 유무별 분기) — 승인 대기 중 병행
- [ ] iOS 승인 후: 랜딩 스토어링크 라이브 확인 + store_click 발화 테스트

## 같이 보면 좋은 문서
- `25` iOS 구독·재배포 실전(빌드/인증서/스샷/IAP웹제출) · `27` ASO 키워드
- `30` AARRR/PostHog 대시보드 · `26` 랜딩 유입추적/UTM · `19` 성장 로드맵 Phase
- `31` 07-19 세션종합(자정버그·데이터·대시보드) · `16` Android Play 제출
