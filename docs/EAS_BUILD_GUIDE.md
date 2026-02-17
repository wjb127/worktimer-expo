# EAS Build 가이드

Expo Application Services(EAS)를 사용한 빌드 프로파일별 차이점과 사용법을 정리한 문서.

---

## 빌드 프로파일 비교

| | Development | Preview | Production |
|---|---|---|---|
| **용도** | 개발/디버깅 | 테스트/개인 사용 | 앱스토어 출시 |
| **Dev Server 필요** | O (필수) | X | X |
| **독립 실행** | X | O | O |
| **배포 방식** | Ad Hoc (내부) | Ad Hoc (내부) | TestFlight / App Store |
| **유효 기간** | 짧음 (불안정) | 프로비저닝 유효기간 (최대 1년) | 영구 (스토어 배포 시) |
| **디버깅 도구** | O (React DevTools 등) | X | X |
| **앱 크기** | 큼 (디버그 번들 포함) | 작음 (최적화됨) | 작음 (최적화됨) |
| **성능** | 느림 (디버그 모드) | 빠름 (릴리즈 모드) | 빠름 (릴리즈 모드) |

---

## 각 프로파일 상세

### 1. Development (개발 빌드)

```bash
eas build --profile development --platform ios
```

- `expo-dev-client`를 포함한 개발용 빌드
- **반드시 개발 서버(`npx expo start --dev-client`)가 실행 중이어야** 앱이 동작함
- Hot Reload, React DevTools 등 개발 도구 사용 가능
- Ad Hoc 프로비저닝으로 등록된 기기에만 설치 가능
- 며칠~몇 주 후 만료되어 실행 불가능해지는 경우가 흔함
- **용도**: 기능 개발 중 실기기에서 디버깅할 때

### 2. Preview (미리보기/테스트 빌드)

```bash
eas build --profile preview --platform ios
```

- **개발 서버 없이 독립 실행** 가능 (릴리즈 모드로 빌드됨)
- Ad Hoc 배포 방식 → Apple Developer에 기기 UDID 등록 필요
- 프로비저닝 프로파일 유효기간(최대 1년) 동안 안정적으로 사용 가능
- 앱스토어 심사 없이 QR코드/링크로 바로 설치
- 디버깅 도구는 포함되지 않음
- **용도**: 개인 사용, QA 테스트, 베타 테스터 배포

### 3. Production (프로덕션 빌드)

```bash
eas build --profile production --platform ios
```

- App Store / TestFlight 배포용 빌드
- App Store Connect에 업로드하여 심사 후 배포
- TestFlight을 통해 최대 10,000명에게 베타 배포 가능
- 앱스토어에 게시되면 만료 없이 영구 사용
- **용도**: 정식 출시, TestFlight 베타 테스트

---

## 개인 사용 시 추천: Preview 빌드

개인적으로 설치해서 사용하는 목적이라면 **Preview 프로파일이 최적**.

**이유:**
1. 앱스토어 심사가 불필요 (개인용이니까)
2. Dev Server 없이 독립 실행 가능
3. 릴리즈 모드라 성능이 좋음
4. 프로비저닝 유효기간(~1년) 동안 안정적
5. 빌드 후 링크/QR로 간편 설치

---

## 빌드 및 설치 흐름

### Preview 빌드 실행

```bash
# 1. 빌드 시작
eas build --profile preview --platform ios

# 2. 빌드 완료 후 (EAS 서버에서 빌드, 보통 10~20분 소요)
#    → 터미널에 설치 QR코드 및 링크 출력됨
#    → iPhone으로 링크 열면 설치 가능

# 3. 빌드 목록 확인
eas build:list --platform ios

# 4. 최근 빌드 확인
eas build:view
```

### 기기 등록 (처음 한 번만)

Ad Hoc 빌드는 Apple Developer에 기기 UDID가 등록되어 있어야 설치 가능.

```bash
# 기기 등록 (QR코드로 기기 정보 수집)
eas device:create

# 등록된 기기 목록 확인
eas device:list
```

첫 빌드 시 EAS가 자동으로 기기 등록을 안내하므로, 별도로 하지 않아도 됨.

---

## OTA 업데이트 (EAS Update)

빌드를 새로 하지 않고도 JS 번들만 업데이트할 수 있는 기능.

```bash
# JS 코드만 변경했을 때 (네이티브 코드 변경 없을 때)
eas update --branch preview --message "버그 수정"
```

- **가능**: JS/TS 코드 변경, 스타일 변경, 이미지 교체
- **불가능**: 네이티브 모듈 추가/변경, app.json 설정 변경, SDK 버전 업그레이드

→ 네이티브 변경이 없는 경우 새 빌드 없이 즉시 업데이트 배포 가능.

---

## 자주 하는 실수 & 주의사항

### Development 빌드가 며칠 후 안 되는 이유
- Ad Hoc 프로비저닝 프로파일이 만료됨
- 개발 인증서가 갱신됨
- Dev Server가 꺼져 있으면 앱 자체가 실행 안 됨
- **해결**: Preview 빌드로 전환

### Preview 빌드 설치가 안 될 때
- 기기 UDID가 등록되지 않은 경우 → `eas device:create`
- 프로비저닝 프로파일에 기기가 포함되지 않은 경우 → 빌드를 다시 해야 함
- 이전 버전을 삭제하고 재설치

### 네이티브 변경 후에는 반드시 새 빌드
- `app.json`의 `plugins` 변경
- 새 네이티브 모듈 설치 (`expo-live-activity` 등)
- Expo SDK 버전 업그레이드
- iOS `infoPlist` 설정 변경

---

## 현재 프로젝트 eas.json 설정

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

- `distribution: "internal"` → Ad Hoc 방식으로 등록된 기기에 직접 설치
- `developmentClient: true` → expo-dev-client 포함 (development만 해당)
- production은 기본값 사용 → App Store 배포용

---

## 빠른 참조

```bash
# 개발 중 실기기 디버깅
eas build --profile development --platform ios
npx expo start --dev-client

# 개인 사용 / 테스트 (추천)
eas build --profile preview --platform ios

# 앱스토어 출시
eas build --profile production --platform ios
eas submit --platform ios

# JS만 변경 시 빠른 업데이트
eas update --branch preview --message "업데이트 내용"

# 기기 등록
eas device:create
```
