# 모바일 실기기 E2E 도구 환경 (Android 완비 / iOS 26)

**최종 갱신**: 2026-06-28

검색 hint: iOS 스샷 안 될 때, 실기기 자동화 도구 뭐 쓰지, pymobiledevice3, EAS iOS 빌드 막힐 때, idevicescreenshot 실패, --userspace.

## 핵심 결론
- **Android**: `adb`로 완비(tap/스샷/설치/Metro터널). 로컬 gradle 빠름. AI 자동 E2E 풀 가능.
- **iOS 26**: 도구 까다로움. **스샷=pymobiledevice3(해결)**, **tap=WDA 필요(미해결)**. 앱실행=devicectl. AI 자동 E2E는 "스샷+사람탭" 협업까지.

## Android (완비)
- 빌드: `cd android && ./gradlew :app:assembleDebug --no-daemon --console=plain` (증분 28~44s). **prebuild --clean 금지**(debug.keystore SHA→구글로그인 깨짐). 새 네이티브 모듈도 android/ 있으면 gradle autolink로 포함(prebuild 재실행 불필요).
- 조작: `adb shell input tap X Y`(네이티브 1080x2340 좌표, `wm size` 환산), `input text`(영문만 — 한글 X), `input swipe`.
- 스샷: `adb exec-out screencap -p > out.png` (긴 스샷은 `sips -Z 1100`로 줄여 Read).
- Metro: `adb reverse tcp:<P> tcp:<P>`(포트 일치 필수) + dev-launcher 딥링크 `exp+worktimer-expo://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<P>`.
- **JS 변경 = Metro reload**(재빌드 X), 네이티브(아이콘/이름/새모듈)만 재빌드.

## iOS 26 실기기 — 도구 진단표
| 작업 | 도구 | 상태 |
|---|---|---|
| 앱 실행 | `xcrun devicectl device process launch --device <UDID> <bundleId>` | ✓ |
| 스샷 | `pymobiledevice3 developer dvt screenshot OUT.png --userspace` | ✓ (sudo 없이) |
| tap/swipe | WebDriverAgent (Appium/Maestro) | ✗ (WDA 미설치) |
| 빌드/설치 | EAS 클라우드 / `expo run:ios --device` | 인터랙티브 1회 필요 |

### ✗ 이번 세션 막힌 것 (기록)
- `idevicescreenshot`(libimobiledevice): iOS26 신프로토콜 미지원 → "Could not start screenshotr service: Invalid service".
- `idb`(facebook): 미설치(tap용). brew+pip 무겁고 iOS26 호환 불확실 → pymobiledevice3로 스샷 대체.
- Maestro: **iOS 실기기 0개 인식**(시뮬레이터 위주). `--device <UDID>`도 "not connected".
- `sqlite3`: 기기에 바이너리 없음 → AsyncStorage(databases/RKStorage) adb run-as 조작 불가.

### ✓ pymobiledevice3 워크플로 (검증됨, 핵심)
설치: `pipx install pymobiledevice3` (9.30.1, `~/.local/bin/pymobiledevice3`). iOS26 활발 지원.
1. 인식: `pymobiledevice3 usbmux list` → WiPhone iPhone17,3 26.5
2. DDI 마운트: `pymobiledevice3 mounter auto-mount` (iOS17+ Personalized Image, TSS서명, 자동다운로드. 한번 마운트되면 "already mounted")
3. 스샷: `pymobiledevice3 developer dvt screenshot OUT.png --userspace`
   - ★ **`--userspace` = no-root 터널**(sudo 불필요). 안 붙이면 `sudo pymobiledevice3 remote tunneld` 요구.
   - `--userspace`는 dvt screenshot의 옵션(tunneld 옵션 아님).
- 전제: **Developer Mode 켜짐**(설정>개인정보보호 및 보안>개발자 모드). 이미 enabled. devicectl `developerModeStatus: enabled`로 확인.
- 기기: WiPhone, UDID `00008140-001A395E26C1801C`, iPhone16/iOS26.5.

## EAS iOS 빌드 (막힌 지점 + 해결법)
- `eas`가 PATH에 없음 → **`npx eas-cli`** 사용. 로그인됨(gawall/wjb127@naver.com).
- `eas.json` preview = `distribution: internal`(ad-hoc). 기기 등록됨(UDID 위, team `9Q26686S8R` Seung Been Wee Individual). `device:list --apple-team-id 9Q26686S8R` 필요(non-interactive면 team-id 명시).
- **첫 빌드는 인터랙티브 필수**: `npx eas-cli build -p ios --profile preview` → credentials(Dist Cert + Provisioning) 자동생성 Y. **LiveActivity 타겟** 때문에 프로비저닝 2개(app + LiveActivity).
  - non-interactive 에러: "couldn't find any credentials suitable for internal distribution. Run again in interactive mode."
- 첫 셋업 후 non-interactive 가능: **ASC API 키**(본인계정 .p8) + env `EXPO_ASC_KEY_ID`/`EXPO_ASC_ISSUER_ID`/`EXPO_ASC_API_KEY_PATH` + `EXPO_APPLE_TEAM_TYPE=INDIVIDUAL` + `EXPO_TOKEN`(Expo 토큰). ad-hoc 기기갱신 `--refresh-ad-hoc-provisioning-profile`(EAS 19.1+).

## 사용자 할 일 (추천순)
1. **EAS iOS 빌드 첫 인터랙티브** — 새 버전(공유카드/업적/할일) 폰 설치. 가장 시급.
2. **ASC API 키 생성**(App Store Connect, 본인계정) — 이후 AI가 non-interactive 빌드 자동화 + CI.
3. **WDA 셋업**(Xcode로 빌드·서명·설치 1회) — iOS 자동 tap. 복잡, 선택. 당장은 "스샷+사람탭" 협업.
4. **scrcpy**(Android 미러링) — `brew trust homebrew-ffmpeg/ffmpeg` 후 재설치. 선택(adb로 충분).
- 이미 OK: Developer Mode·USB디버깅·기기 EAS등록. 디스크풀 주의(DerivedData 정기정리).

## AI가 추가로 바로 가능
- `tidevice3`(pymobiledevice3 기반 파이썬 API) → iOS 스샷 flow 스크립트화.
- iOS 스샷 헬퍼 alias(`ios-shot`).

## 같이 보면 좋은 문서
- `07-physical-device-e2e.md` — 실기기 E2E 자동화
- `08-expo-gotchas.md` — Expo/RN 빌드·실기기 함정(→ `/expo-fix`)
- `/ship-revision-mo` 스킬 — 모바일 수정 원샷 파이프라인
