// 필타임/Filltime 브랜드 컬러 팔레트 (블루 + 화이트)
// 브랜드 블루 = 밝은 스카이(A안). 기본 Tailwind blue의 쨍함을 명도↑로 완화(잔디 히트맵은 별도 스케일, 불변)
export const colors = {
  // 브랜드 블루 스케일 (밝은 스카이 A: 500=#3F86E0 / 600=#2F6FC4)
  primary: '#3F86E0', // 메인 블루 (버튼·강조)
  primaryDark: '#2F6FC4', // 진한 블루 (hover·강조, 흰 글씨 대비 확보)
  primaryMid: '#5B9DF0', // 중간 블루
  primaryLight: '#BCD9FB', // 연한 블루
  primaryFaint: '#F0F7FF', // 아주 연한 블루 (배경)

  // 텍스트 / 라인 / 배경
  ink: '#1E293B', // 라이트 배경 위 본문 텍스트
  inkSub: '#64748B', // 보조 텍스트
  line: '#E2E8F0', // 구분선/보더
  bg: '#F5F7FA', // 화면 배경
  card: '#FFFFFF', // 카드
  white: '#FFFFFF',

  // 위험 (종료 버튼 전용)
  danger: '#EF4444',
} as const;

export type AppColors = typeof colors;

// ── 히트맵/달력 색상 (2시간 단위, 0~14h+ 8단계) ──
// 밝은 블루 → 진한 블루. 14시간 초과는 최대 색상으로 고정.
export const heatEmpty = '#EBEDF0';
export const heatScale = [
  '#DBEAFE', // 0–2h
  '#BFDBFE', // 2–4h
  '#93C5FD', // 4–6h
  '#60A5FA', // 6–8h
  '#3B82F6', // 8–10h
  '#2563EB', // 10–12h
  '#1D4ED8', // 12–14h
  '#1E40AF', // 14h+ (최대)
] as const;

// 근무 초 → 히트 색상 (2시간 버킷). 0이면 empty.
export function getHeatColor(seconds: number): string {
  if (seconds <= 0) return heatEmpty;
  const idx = Math.min(
    Math.floor(seconds / (2 * 3600)),
    heatScale.length - 1,
  );
  return heatScale[idx];
}

// 셀 위 글자색: 진한 칸(8h↑ = #3B82F6 이상)은 흰색, 그 외는 ink (대비 확보)
export function getHeatTextColor(seconds: number): string {
  return seconds >= 8 * 3600 ? '#FFFFFF' : colors.ink;
}
