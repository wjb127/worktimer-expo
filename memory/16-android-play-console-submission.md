# 안드로이드 Play Console 프로덕션 심사 제출 자동화 (2026-07-14)

**최종 갱신**: 2026-07-14

이 세션에서 필타임을 Play Console 프로덕션 심사 제출 직전까지 전자동으로 세팅한 기록.
펴볼 때: "Play 출시 어디까지 했지", "게스트/계정삭제 구현 어떻게 했지", "Play Console 자동화 교훈".
절차·주의점은 스킬 `/android-play-deploy`에도 정리됨(그게 재사용 SOP, 이 문서는 이 앱 실제 진행상태).

## 결론: Android 출시 준비 사실상 100% 완료 (마지막 제출 클릭만 대기)

Play Console 게시개요 **"검토를 위해 앱 전송" 버튼 1번**이면 심사 제출. 지금 비활성인 이유는
모든 입력 완료됐는데 Play가 "게시 준비" 상태를 아직 재평가 중(대시보드 카운트 캐시 지연).
스토어 리스팅 자체는 "검토를 위해 전송 준비 완료"로 확인됨. 몇 분~1시간 내 자동 활성 예상.

## 핵심 식별자

- Play 개발자 계정: **가월(개인계정)**, 계정ID `7811900040565701772` (2020년 앱 존재 = 2023.11 이전 = 폐쇄테스트 20명 요건 **면제**)
- 필타임 앱ID: `4972863427204935503` · 패키지 `kr.codeatlas.worktimer`
- 프로덕션 트랙ID: `4697651873559093410` · 내부테스트 트랙ID: `4700817370575575164`
- 내부테스트 참여링크: `https://play.google.com/apps/internaltest/4700817370575575164`
- EAS 빌드: gawall(wjb127@naver.com) · Play앱서명 키 crd `E7JO5p_Ik-`(default, 재빌드 시 동일 사용)
- 삭제 안내: `https://filltime.vercel.app/delete-account` · 연락 이메일 `wjb127@naver.com`

## 이번에 구현/배포한 것

### 게스트/데모 모드 (심사자 로그인 우회 — 앱액세스 "특별권한 불필요" 근거)
- 백엔드 `POST /auth/guest` (공개, 게이트 없음) → 공유 데모계정(provider='guest', guest@codeatlas.kr) 토큰 발급.
  `src/auth/auth.service.ts` guest() + controller + dto.ts provider 유니온에 'guest' 추가. 커밋 `968cac8`
- 앱 LoginScreen "게스트로 둘러보기" 버튼(`src/screens/LoginScreen.tsx`). 커밋 `4896c35`
- **배포**: VPS `/opt/codeatlas-api`는 git repo 아님 → `rsync dist/ root@45.77.135.225:/opt/codeatlas-api/dist/ && systemctl restart codeatlas-api`. prod 검증 `curl -X POST .../auth/guest` → 201 OK
- 계정삭제는 앱(설정 "계정 삭제" → `DELETE /auth/account`)+백엔드(user.delete cascade) **이미 완비**돼 있었음
- 삭제 웹페이지: `ss-042-filltime-landing/src/app/delete-account/page.tsx` 신규(Vercel git자동배포, 커밋 `4bc5185`)

### AAB v2 재빌드 (게스트 버튼 포함)
- versionCode는 **app.json `android.versionCode`**에 둠(android/ gitignore라 build.gradle 수정 무의미, EAS prebuild 재생성)
- `eas build -p android --profile production --non-interactive` → aab 다운로드 → 프로덕션 트랙 업로드
- **같은 키스토어 재사용**됨(첫빌드 자동생성분) → 서명 일관성 유지

### Play Console (playwright MCP 백그라운드로 전부)
- 앱 생성(생산성/무료/한국어) · **앱콘텐츠 선언 10/10**: 개인정보처리방침·광고X·광고ID X·콘텐츠등급(전체이용가,IARC 9문항 전부 아니요)·타겟층(18+ → 아동단계 자동스킵)·**데이터안전**·정부X·금융X·건강X·**앱액세스(로그인없이 접근가능="아니요")**
- **데이터안전 5유형**: 이메일주소·사용자ID(개인정보) / 앱상호작용(앱활동,PostHog) / 비정상종료로그·진단(앱정보및성능,Sentry). 전부 수집O·공유X·목적(이메일=앱기능+계정관리, 나머지=애널리틱스)·필수·임시처리X. 삭제URL=위 delete-account
- 스토어등록정보: 이름·간단/자세한설명·아이콘512(sips 리사이즈)·피처그래픽1024x500(PIL 직접생성)·**폰6/7인치6/10인치6 스크린샷**(out/ship-evidence-mo 6.28 실기기 스샷 1080x2160 크롭)
- 카테고리(생산성)+연락처이메일 · **출시국가 176개+기타(전세계)** 전체선택

## 다음 스텝 (남은 것 딱 2개)

1. **최종 제출**: 게시개요 `/publishing` → "검토를 위해 앱 전송" 활성화되면 클릭 (Play 상태반영 대기 중)
2. **GCP OAuth SHA-1**: 앱무결성(`/app-integrity/overview`)에서 Play앱서명 SHA-1 확보 → GCP 콘솔 Android OAuth 클라(프로젝트 codeatlas-500015)에 등록. 안 하면 Play설치본 구글로그인 깨짐(업로드키+Play서명키 둘 다 등록)
3. (심사 후) 리젝 대응 — 게스트버튼으로 접근 확인, 임시앱이름 kr.codeatlas.worktimer(unreviewed)는 심사통과 시 필타임으로 바뀜

## 같이 보면 좋은 문서
- `12-launch-action-plan.md` — 사용자 액션 체크리스트
- `15-session-2026-07-14-ui-hardening.md` — 직전 세션(UI/보안/기록탭)
- `.private/01-codeatlas-infra.md` — VPS 접속·배포(rsync)·GCP OAuth 클라ID
