import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

// 앱 버전 정보 — 하드코딩(1.0.0 고정) 대신 실제 빌드/업데이트에서 읽는다.
// 빌드하면 build 번호가, OTA로 밀면 '최근 업데이트' 시각이 바뀌어 "수정됐는지" 눈에 보임.

export interface VersionInfo {
  version: string; // 앱 버전 (예: 1.0.1)
  build: string; // 네이티브 빌드 번호 (production autoIncrement로 증가)
  updatedLabel: string; // '기본 빌드' 또는 OTA 업데이트 시각
  channel: string | null; // preview / production
}

const pad = (n: number) => String(n).padStart(2, '0');

export function getVersionInfo(): VersionInfo {
  const version = Application.nativeApplicationVersion ?? '—';
  const build = Application.nativeBuildVersion ?? '—';

  // expo-updates: OTA로 받은 업데이트면 createdAt이 그 시각, 기본(내장) 빌드면 embedded
  let updatedLabel = '기본 빌드';
  try {
    if (!Updates.isEmbeddedLaunch && Updates.createdAt) {
      const d = Updates.createdAt;
      updatedLabel = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 업데이트`;
    }
  } catch {
    // expo-updates 비활성(개발/미구성) 시 기본값 유지
  }

  let channel: string | null = null;
  try {
    channel = Updates.channel ?? null;
  } catch {
    channel = null;
  }

  return { version, build, updatedLabel, channel };
}
