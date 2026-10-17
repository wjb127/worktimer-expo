import * as SecureStore from "expo-secure-store";

// 키 이름 끝의 .v2 는 iOS 키체인 접근 등급을 바꾸려고 붙였다.
//
// expo-secure-store 기본값(WHEN_UNLOCKED)은 기기가 잠기고 약 10초 뒤부터 읽기를 막는다.
// 잠긴 상태에서 앱이 깨어나면(Live Activity·알림·iOS 사전 실행) 토큰을 못 읽고
// "User interaction is not allowed" 로 실패했다 (Sentry 5b89b2cc…, 2026-10-15).
// AFTER_FIRST_UNLOCK 은 재부팅 후 한 번 잠금을 풀면 그 뒤로는 잠긴 상태에서도 읽힌다
// (애플이 백그라운드에서 쓰는 자격 증명에 권장하는 등급).
//
// 같은 키에 등급만 바꿔 다시 쓸 수는 없다. 이미 있는 항목에 set 하면 라이브러리가 값만
// 바꾸고 등급은 그대로 둔다 (SecureStoreModule.swift update()). 지우고 다시 쓰면 그 사이에
// 앱이 죽었을 때 토큰이 사라져 로그아웃된다. 그래서 새 키에 먼저 쓰고, 다 쓴 다음에
// 옛 키를 지운다. 읽을 때는 새 키 → 옛 키 순서라 이전 버전에서 로그인한 사용자도
// 로그인 상태가 유지되고, 첫 토큰 갱신(15분) 때 새 키로 옮겨진다.
//
// 따로 "옛 키 → 새 키 복사" 단계를 두지 않은 이유: 동시에 진행 중인 토큰 갱신과 겹치면
// 이미 회전된 옛 refresh 토큰으로 새 값을 덮어써 서버가 재사용으로 거부한다(오로그아웃).
const ACCESS = "codeatlas.accessToken.v2";
const REFRESH = "codeatlas.refreshToken.v2";
const LEGACY_ACCESS = "codeatlas.accessToken";
const LEGACY_REFRESH = "codeatlas.refreshToken";

// 등급은 쓸 때만 의미가 있다 (조회 쿼리에는 등급이 들어가지 않는다)
const WRITE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// 정리용 삭제 — 실패해도 읽기는 새 키가 우선이라 무해하다
const removeQuietly = (key: string) =>
  SecureStore.deleteItemAsync(key).catch(() => {});

export const saveTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync(ACCESS, access, WRITE_OPTIONS);
  await SecureStore.setItemAsync(REFRESH, refresh, WRITE_OPTIONS);
  // 새 키에 둘 다 쓴 뒤에만 옛 키를 지운다
  await removeQuietly(LEGACY_ACCESS);
  await removeQuietly(LEGACY_REFRESH);
};

// 읽기 실패(throw)는 그대로 던진다 — '토큰 없음(null)'과 구분해야 호출부가
// 실패를 로그아웃으로 착각하지 않는다.
const read = async (key: string, legacyKey: string) =>
  (await SecureStore.getItemAsync(key)) ??
  (await SecureStore.getItemAsync(legacyKey));

export const getAccessToken = () => read(ACCESS, LEGACY_ACCESS);
export const getRefreshToken = () => read(REFRESH, LEGACY_REFRESH);

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await removeQuietly(LEGACY_ACCESS);
  await removeQuietly(LEGACY_REFRESH);
};
