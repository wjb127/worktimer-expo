// 공유카드는 사진 앱에 "저장만" 한다(ShareCardModal saveToLibraryAsync, 라이브러리 읽기 없음).
// 그런데 expo-media-library가 AndroidManifest에 READ_MEDIA_IMAGES/READ_MEDIA_VIDEO(광범위 사진·영상 읽기)를
// 자동 추가 → Google Play "사진·동영상 권한 선언"을 강제(저장전용 앱엔 부적합, 심사 리젝 사유).
// Expo 공식 withBlockedPermissions로 안 쓰는 읽기 권한을 최종 매니페스트에서 확실히 차단(제거)한다.
// (저장은 API 29+ MediaStore로 읽기 권한 없이 동작 — writeOnly. ShareCardModal도 requestPermissionsAsync(true))
const { AndroidConfig } = require('@expo/config-plugins');

module.exports = function withMediaWriteOnly(config) {
  // 저장(write)만 하므로 모든 미디어/스토리지 읽기 권한 차단. WRITE_EXTERNAL_STORAGE(구버전 저장용)는 유지.
  return AndroidConfig.Permissions.withBlockedPermissions(config, [
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
    'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
    'android.permission.READ_EXTERNAL_STORAGE',
  ]);
};
