// 필타임/Filltime 브랜드 컬러 팔레트 (블루 + 화이트)
// 앱 아이콘(블루 그라데이션 #3B82F6→#2563EB)과 일관된 톤
export const colors = {
  // 브랜드 블루 스케일
  primary: '#3B82F6', // 메인 블루
  primaryDark: '#2563EB', // 진한 블루 (강조)
  primaryMid: '#60A5FA', // 중간 블루
  primaryLight: '#BFDBFE', // 연한 블루
  primaryFaint: '#EFF6FF', // 아주 연한 블루 (배경)

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
