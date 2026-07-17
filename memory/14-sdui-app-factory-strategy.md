# SDUI 앱 팩토리 전략 판정
**최종 갱신**: 2026-07-16

VPS 1대와 공용 백엔드로 여러 앱을 운영하는 기술은 가능하지만, 솔로 개발자의 안전한 사업 모델은 "자기 계정 수백 앱"이 아니라 "소수 자체 앱 + 클라이언트 소유 계정의 화이트라벨"이다.

## 경영 판정

- **A. 내 개발자 계정 1개로 수백 앱**: 비권장. Apple Guideline 4.3의 유사/중복 앱과 4.2.6의 템플릿 앱 위험이 기술적 확장성보다 먼저 사업을 막는다. 명시된 안전 수량은 없으며, 운영 가드레일은 서로 목적과 기능이 명백히 다른 자체 앱 **활성 3~5개, 총 5~10개** 정도다. 숫자가 아니라 유사성·반복 제출·낮은 고유 가치가 판정 기준이다.
- **B. 클라이언트별 소유 계정으로 납품**: 조건부 권장. 4.2.6이 안내하는 정석에 가깝다. 솔로 운영 상한은 **활성 고객 10~20개**, 강한 표준화와 유료 유지보수 체계가 있을 때 약 30개다. 수백 개는 개발팀·심사 운영·CS 자동화가 있는 플랫폼 사업의 규모다.
- 계정을 여러 개 만들어 A의 심사를 우회하면 안 된다. 클라이언트 계정 분리는 실제 브랜드·법적 소유권·계약 관계가 있을 때만 사용한다.
- 권장 포트폴리오는 **자체 플래그십 1~3개 + 화이트라벨 고객 5~15개**다. 필타임을 먼저 출시한 뒤 두 번째 앱으로 공장 가설을 검증한다.

## 정책 경계

- **Apple 4.3 Spam**: 같은 소스, 메타데이터, 기능, UI를 이름·색상·콘텐츠만 바꿔 반복 제출하면 리젝과 계정 위험이 커진다. 공식 문구는 포화 카테고리에 고유하고 품질 높은 경험을 요구한다.
- **Apple 4.2.6 Template apps**: 상용 템플릿/앱 생성 서비스 결과물은 콘텐츠 제공자가 직접 제출해야 한다. 여러 고객 콘텐츠를 한 앱에 모은 picker/aggregator 모델은 예외 경로지만 각 고객의 독립 브랜드 앱 요구와 충돌한다.
- **Apple 2.5.2 Executable code**: 내려받은 코드로 기능을 바꾸면 안 된다. JSON으로 이미 바이너리에 포함된 컴포넌트와 허용 액션을 조합하는 SDUI는 상대적으로 안전하지만, 임의 JS·동적 네이티브 모듈·심사 후 앱 목적 전환은 금지 경계다.
- **Google Play**도 Repetitive Content와 Webview/Affiliate Spam을 금지한다. Play가 수량 면에서 더 관대하다고 전제하면 안 된다.
- **원스토어**는 보조 유통 채널로는 유용하지만 iOS 정책 위험을 해결하지 못한다.

주요 1차 출처:

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Spam 정책: https://support.google.com/googleplay/android-developer/answer/9899034
- 원스토어 심사가이드: https://onestore-dev.gitbook.io/dev/tools/council/guide

## 권장 제품 구조

Full SDUI 제네릭 렌더러보다 **하이브리드 SDUI**를 쓴다.

- 네이티브/로컬 고정: 인증, 온보딩, 타이머, 결제, 권한, 계정 삭제, 오프라인 동기화, 복잡한 상태 전이.
- SDUI 허용: 홈 섹션 순서, 배너, 카드, 리스트, 단순 폼, CTA, 공지, 공유 미리보기, 테마 토큰.
- 서버는 자유로운 위젯 트리 대신 도메인 매크로 컴포넌트를 내려준다. 예: `TimerSummary`, `StreakHeatmap`, `ShareProofCard`, `TaskList`.
- 액션은 `navigate`, `openSafeUrl`, `startTimer`, `share`, `track` 같은 allowlist만 허용한다. 임의 URL, 임의 API 호출, JS 실행은 금지한다.

권장 config envelope:

```text
schemaVersion, configId, appId, publishedAt, expiresAt
minBinaryVersion, requiredCapabilities
theme, navigation, screens/sections, analytics
signature
```

호환 규칙:

- 클라이언트가 binary version과 capability set을 보낸다.
- 스키마는 additive하게 진화시킨다.
- 모르는 optional 컴포넌트는 건너뛴다.
- 모르는 critical 컴포넌트/액션은 번들 fallback 화면으로 전환한다.
- 최소 6~12개월 구버전 config snapshot fixture를 CI에서 렌더 테스트한다.

## Codeatlas 기준 레퍼런스 구조

```text
앱별 manifest(appId, bundleId, brand, capabilities)
  -> 동적 app.config.ts -> 앱별 EAS project -> 앱별 binary

Expo/RN 공용 셸
  -> bootstrap: appId + binaryVersion + capabilities
  -> Cloudflare latest pointer
  -> immutable signed config
  -> schema/action 검증
  -> bundled fallback + disk last-known-good

Cloudflare
  -> latest pointer: 짧은 TTL
  -> hash config/assets: 긴 TTL, immutable

NestJS control plane
  -> draft/validate/publish/rollback/audit
  -> VPS PostgreSQL codeatlas schema(app_id 멀티테넌트)
```

- 현재 `GET /config/banners`와 어드민 편집 루프를 씨앗으로 재사용한다.
- 앱 소스의 하드코딩된 `app=worktimer`를 나중에 빌드타임 manifest의 `appId`로 승격한다.
- 앱마다 bundle ID와 EAS project가 필요하다. 하나의 바이너리로 서로 다른 독립 스토어 앱을 제공할 수는 없다.
- 단일 `codeatlas` 스키마 + `app_id`는 현재 규모와 소규모 수백 tenant에도 적절하다. 모든 unique/FK/index와 Nest 권한 검사에 `app_id`를 포함한다. DB 직접 접근은 금지하고 API guard를 강제한다.
- 현재 VPS는 2c/8GB, 2026-07-16 실측 가용 메모리 약 7GB·디스크 92GB다. 초기 앱 여러 개에는 충분하지만 앱별 rate limit/관측/쿼리 예산이 필요하다.
- config는 canonical JSON(RFC 8785) 후 Ed25519 서명한다. 서명 개인키는 VPS 밖 KMS/HSM 계열에 둔다.

## 용량과 장애 격리

예시 부하 `100앱 x 1,000 DAU x 하루 config 2회`는 20만 요청/일, 평균 약 2.3 rps다. 피크를 10배로 잡아도 약 23 rps이고 Cloudflare cache hit 95%면 origin은 약 1.2 rps다. config 전달 자체보다 동적 비즈니스 API, 배치, DB 연결, CS가 실제 병목이다.

- immutable config + 짧은 TTL pointer + last-known-good로 백엔드 장애 때도 앱이 열린다.
- 앱별 rate limit, timeout, circuit breaker, connection pool budget, publish validation을 둔다.
- 잘못된 config는 전체가 아니라 `appId/configId` 단위로 즉시 rollback한다.
- 단일 VPS 침해는 전 앱 침해이므로 API runtime, admin/control plane, config signing 권한을 분리한다.

## 경제성 가드레일

- 앱 1개 출시 작업: 대략 **16~32시간**.
- 월 유지보수: 앱당 **0.5~2시간**. 100개면 초기 1,600~3,200시간, 매월 50~200시간이라 솔로 운영 범위를 넘는다.
- 화이트라벨은 초기 구축비와 월 유지보수를 분리한다. 내부 원가 기반 최소 가설은 구축 **250만~500만원**, 월 **15만~50만원** 수준이며 시장 시세가 아니라 목표 마진 검증용 숫자다.
- 심사, 인증서, 스크린샷, 개인정보 표시, 데이터 안전 양식, SDK 업데이트, CS를 앱별 원가에 반드시 포함한다.

## MVP와 중단 조건

1. 필타임을 먼저 출시한다.
2. 기존 banners를 versioned config + validate/publish/rollback 구조로 승격한다.
3. 필타임 홈 일부만 매크로 SDUI로 전환하고 구버전 fallback을 검증한다.
4. 실제 클라이언트 소유 계정으로 두 번째 앱 1개를 같은 셸에서 만든다.
5. 세 번째 앱 전에는 아래 지표를 통과해야 한다.

판정 지표:

- review-ready까지 1일 미만
- 앱별 전용 코드 변경 10% 미만
- config 검증 오류 0.1% 미만, blank screen 0건
- rollback 5분 미만, config cache hit 95% 이상
- crash-free sessions 99.8% 이상
- 앱당 월 유지보수 2시간 미만
- first-review 승인율 80% 이상

중단 조건:

- 같은 제품군에서 Apple 4.3 리젝 1회가 나오면 유사 앱 추가 제출을 중단한다.
- 클라이언트가 자체 개발자 계정을 거부하면 별도 branded app 대신 aggregator/PWA/웹 배포를 제안한다.
- 앱별 전용 분기와 수동 운영이 누적되면 신규 판매를 멈추고 셸·manifest·심사 자료 자동화부터 고친다.
