// 웹(=Tauri 데스크탑) 번들 전용 SecureStore 셰임 — metro.config.js가 web에서만 갈아끼운다.
//
// expo-secure-store는 웹 구현이 없다(getValueWithKeyAsync is not a function으로 즉사).
// 토큰 저장소(src/lib/auth/tokenStore.ts)가 이걸 쓰므로 이게 없으면 로그인 자체가 불가능.
//
// 보안 등가성에 대해:
//  - 네이티브는 Keychain/Keystore라 OS가 앱 단위로 격리한다.
//  - 여기는 Tauri WebView의 localStorage다. 브라우저 탭이 아니라 앱 전용 데이터 디렉토리
//    (~/Library/WebKit/kr.codeatlas.filltime.desktop)에 격리되고, 외부 오리진이 접근할 수
//    없다(로컬 번들 오리진 전용, CSP로 외부 스크립트 차단). 즉 "같은 맥 사용자"까지가
//    신뢰 경계이고, 이는 기존 데스크탑 앱이 ~/.config/filltime/config.json에 리프레시
//    토큰을 평문 저장하던 것과 같은 수준이다(더 낫지도, 나쁘지도 않음).
//  - 하드웨어 백업 저장소가 필요해지면 Tauri stronghold 플러그인으로 교체할 것.

const PREFIX = 'securestore.';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // 프라이빗 모드 등에서 접근 자체가 throw할 수 있다.
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  const s = store();
  if (!s) return null;
  return s.getItem(PREFIX + key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const s = store();
  if (!s) return;
  s.setItem(PREFIX + key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  const s = store();
  if (!s) return;
  s.removeItem(PREFIX + key);
}

export async function isAvailableAsync(): Promise<boolean> {
  return store() !== null;
}

// 네이티브 모듈이 export하는 옵션 상수들 — 호출부가 참조해도 깨지지 않게 형태만 맞춘다.
export const WHEN_UNLOCKED = 'whenUnlocked';
export const AFTER_FIRST_UNLOCK = 'afterFirstUnlock';
export const ALWAYS = 'always';
