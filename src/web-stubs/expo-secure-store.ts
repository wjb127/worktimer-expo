// 웹(PWA) 번들 전용 SecureStore 셰임 — metro.config.js가 web에서만 갈아끼운다.
//
// expo-secure-store는 웹 구현이 없다(getValueWithKeyAsync is not a function으로 즉사).
// 토큰 저장소(src/lib/auth/tokenStore.ts)가 이걸 쓰므로 이게 없으면 로그인 자체가 불가능.
//
// 보안 등가성에 대해:
//  - 네이티브는 Keychain/Keystore라 OS가 앱 단위로 격리한다.
//  - 웹은 브라우저 localStorage다. 오리진 단위로 격리되지만, 같은 브라우저를 쓰는
//    사람은 접근할 수 있고 XSS가 있으면 탈취된다. 즉 네이티브보다 약하다.
//  - 그래서 웹은 "공용 PC에서 쓰지 않는다"가 전제다. 더 강한 보장이 필요해지면
//    토큰을 메모리에만 두고 refresh를 httpOnly 쿠키로 옮기는 설계로 가야 한다.

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
