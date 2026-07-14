# 안드로이드 Play Console 프로덕션 심사 제출 자동화 (2026-07-14)

**최종 갱신**: 2026-07-14

이 세션에서 필타임을 Play Console 프로덕션 심사 제출 직전까지 전자동으로 세팅한 기록.
펴볼 때: "Play 출시 어디까지 했지", "게스트/계정삭제 구현 어떻게 했지", "Play Console 자동화 교훈".
절차·주의점은 스킬 `/android-play-deploy`에도 정리됨(그게 재사용 SOP, 이 문서는 이 앱 실제 진행상태).

## 결론: Android 출시 준비 100% 완료 — Google 사전스캔만 대기 (다음 세션 여기서 재개)

**모든 입력 완료 + 대시보드 잠금 해제됨.** 남은 건 Play 게시개요 `/publishing` **"검토를 위해 앱 전송" 버튼 클릭 1번**뿐.
지금 그 버튼이 비활성인 유일한 이유 = **Google 사전검사(빠른검사) 진행 중**("최대 N분 남음", ~14분). 스캔 끝나면 버튼 활성.

### ★ 다음 세션 재개 절차 (컴팩트 후)
1. `/publishing` 접속 → "검토를 위해 앱 전송" 버튼 **비활성이면 스캔 남음**(대기) / **활성이면 클릭** → 게시확인 다이얼로그 뜨면 "저장 및 출시"/전송 확인 → **심사 제출 완료**
2. 제출 후 GCP OAuth SHA-1 등록(§다음스텝) — 이게 진짜 마지막
3. playwright MCP 브라우저에 이미 로그인돼 있음(가월 계정). 세션 끊겼으면 재로그인 필요

### ★★ 10/11 미완료 미스터리의 진짜 원인 (하드런 교훈 — 스킬에도 반영)
"스토어 설정 10/11"의 미완료 태스크는 스토어등록정보(✓완료)가 아니라 **"앱 카테고리 선택 및 연락처 세부정보 제공"**이었음.
카테고리(생산성)는 됐는데 **연락처 이메일이 계속 저장 실패**했던 이유:
- 연락처 "저장 및 출시" 버튼 → **"Google Play에 변경사항을 게시하시겠어요?" 확인 다이얼로그가 하나 더 뜸** → 그 확인을 안 누르면 저장 롤백
- 카테고리 모달은 "저장"만이라 확인 없이 됐고, **연락처만 이 2단계 확인**이 있었음
- 해결: 확인 다이얼로그의 "저장 및 출시"까지 클릭 → 이메일 wjb127@naver.com 저장 확정 → 11/11 → 잠금 해제
- 교훈: **"저장 및 출시" 계열 버튼은 게시 확인 다이얼로그 2단계**가 붙음. 모달 안 닫히면 확인 다이얼로그 있는지 확인. evaluate .click()은 저장핸들러 안 먹힘 → **browser_click(실제 클릭)** 필수

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
