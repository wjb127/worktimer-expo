/**
 * 로컬 타임존 기준 날짜 유틸리티
 * toISOString()은 UTC 기준이므로 한국(UTC+9)에서 자정~오전 9시 사이에
 * 전날 날짜가 반환되는 문제를 방지
 */

/**
 * Date 객체를 로컬 타임존 기준 YYYY-MM-DD 문자열로 변환
 */
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 오늘 날짜를 로컬 타임존 기준 YYYY-MM-DD 문자열로 반환
 */
export const getLocalToday = (): string => {
  return formatDateString(new Date());
};

/**
 * 특정 월의 시작일을 YYYY-MM-DD 문자열로 반환
 */
export const getMonthStart = (year: number, month: number): string => {
  return formatDateString(new Date(year, month, 1));
};

/**
 * 특정 월의 마지막일을 YYYY-MM-DD 문자열로 반환
 */
export const getMonthEnd = (year: number, month: number): string => {
  return formatDateString(new Date(year, month + 1, 0));
};
