// 공유 카드 테마 (앰버/네이비/라이트). 기본 = 앰버.
// gradient 없이 솔리드 색으로만 구성(순수 View → OTA 안전). 대비는 색상/명도로 확보.
// 잔디는 테마별 스케일. 바 차트는 fill + 최고일 하이라이트(barTop) + 값 라벨.

export type ShareThemeId = 'amber' | 'navy' | 'light';

export interface ShareTheme {
  id: ShareThemeId;
  label: string; // 스위처 표기
  swatch: string; // 스위처 색 점

  bg: string; // 카드 배경
  brand: string; // 브랜드 텍스트
  brandIcon: string; // 브랜드 아이콘

  heroLabel: string;
  hero: string; // 큰 숫자
  unit: string;

  statBg: string;
  statVal: string;
  statLabel: string;
  statDiv: string;
  statBorderColor?: string; // 있으면 1px 보더

  barFill: string;
  barTop: string; // 최고일 바
  barVal: string; // 값 라벨
  barLabel: string;

  grassEmpty: string;
  grassScale: string[]; // 2시간 버킷

  achBadgeBg: string;
  achIcon: string;
  achKicker: string;
  achTitle: string;
  achDesc: string;
  achPillBg: string;
  achPillTx: string;

  watermark: string;
}

export const SHARE_THEMES: Record<ShareThemeId, ShareTheme> = {
  amber: {
    id: 'amber',
    label: '앰버',
    swatch: '#FF9F1C',
    bg: '#2F6FC4',
    brand: '#FFFFFF',
    brandIcon: '#FFD98A',
    heroLabel: 'rgba(255,255,255,0.78)',
    hero: '#FFFFFF',
    unit: '#FFD98A',
    statBg: 'rgba(255,255,255,0.13)',
    statVal: '#FFFFFF',
    statLabel: '#FFE0A6',
    statDiv: 'rgba(255,255,255,0.24)',
    barFill: '#FF9F1C',
    barTop: '#FFB93D',
    barVal: '#FFE0A6',
    barLabel: 'rgba(255,255,255,0.85)',
    grassEmpty: 'rgba(255,255,255,0.10)',
    grassScale: [
      '#FFE2B0',
      '#FFD483',
      '#FFC152',
      '#FFAC2E',
      '#FF9500',
      '#FB8200',
      '#EE7100',
      '#D96100',
    ],
    achBadgeBg: '#FFB020',
    achIcon: '#5A3200',
    achKicker: '#FFE0A6',
    achTitle: '#FFFFFF',
    achDesc: 'rgba(255,255,255,0.82)',
    achPillBg: 'rgba(255,224,166,0.20)',
    achPillTx: '#FFE0A6',
    watermark: 'rgba(255,255,255,0.7)',
  },
  navy: {
    id: 'navy',
    label: '네이비',
    swatch: '#5BA7F0',
    bg: '#102D4E',
    brand: '#FFFFFF',
    brandIcon: '#7FD8FF',
    heroLabel: '#8FB3D9',
    hero: '#FFFFFF',
    unit: '#7FD8FF',
    statBg: 'rgba(255,255,255,0.06)',
    statVal: '#FFFFFF',
    statLabel: '#8FB3D9',
    statDiv: 'rgba(255,255,255,0.12)',
    statBorderColor: 'rgba(255,255,255,0.08)',
    barFill: '#5BA7F0',
    barTop: '#7FC4FF',
    barVal: '#CDE8FF',
    barLabel: '#8FB3D9',
    grassEmpty: '#16324F',
    grassScale: [
      '#1F4E7A',
      '#2C6AA6',
      '#3F86E0',
      '#5BA7F0',
      '#7FC4FF',
      '#A6DBFF',
      '#CDEBFF',
      '#EAF7FF',
    ],
    achBadgeBg: '#173B60',
    achIcon: '#8FE3FF',
    achKicker: '#7FD8FF',
    achTitle: '#FFFFFF',
    achDesc: '#8FB3D9',
    achPillBg: 'rgba(127,216,255,0.14)',
    achPillTx: '#7FD8FF',
    watermark: '#5B7BA3',
  },
  light: {
    id: 'light',
    label: '라이트',
    swatch: '#3B82F6',
    bg: '#F6FAFF',
    brand: '#2F6FC4',
    brandIcon: '#3F86E0',
    heroLabel: '#64748B',
    hero: '#1E293B',
    unit: '#3F86E0',
    statBg: '#F0F7FF',
    statVal: '#1E293B',
    statLabel: '#64748B',
    statDiv: '#D7E6FB',
    statBorderColor: '#DCEAFE',
    barFill: '#3B82F6',
    barTop: '#1D4ED8',
    barVal: '#2563EB',
    barLabel: '#64748B',
    grassEmpty: '#EBEDF0',
    grassScale: [
      '#DBEAFE',
      '#BFDBFE',
      '#93C5FD',
      '#60A5FA',
      '#3B82F6',
      '#2563EB',
      '#1D4ED8',
      '#1E40AF',
    ],
    achBadgeBg: '#EAF2FF',
    achIcon: '#2F6FC4',
    achKicker: '#3F86E0',
    achTitle: '#1E293B',
    achDesc: '#64748B',
    achPillBg: '#EAF2FF',
    achPillTx: '#2F6FC4',
    watermark: '#94A3B8',
  },
};

export const SHARE_THEME_ORDER: ShareThemeId[] = ['amber', 'navy', 'light'];
export const DEFAULT_SHARE_THEME: ShareThemeId = 'amber';

export function isShareThemeId(v: unknown): v is ShareThemeId {
  return v === 'amber' || v === 'navy' || v === 'light';
}

// 몰입 초 → 테마 잔디 색 (2시간 버킷)
export function shareHeatColor(theme: ShareTheme, seconds: number): string {
  if (seconds <= 0) return theme.grassEmpty;
  const idx = Math.min(
    Math.floor(seconds / (2 * 3600)),
    theme.grassScale.length - 1,
  );
  return theme.grassScale[idx];
}
