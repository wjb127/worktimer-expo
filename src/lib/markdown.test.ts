import { stripMarkdown } from './markdown';

describe('stripMarkdown', () => {
  it('굵게/취소선/인라인코드 제거', () => {
    expect(stripMarkdown('**43시간** __집중__ ~~취소~~ `코드`')).toBe(
      '43시간 집중 취소 코드',
    );
  });

  it('헤더/인용/리스트 정리', () => {
    expect(stripMarkdown('## 제목\n> 인용문\n- 항목1\n* 항목2')).toBe(
      '제목\n인용문\n· 항목1\n· 항목2',
    );
  });

  it('링크는 텍스트만 남긴다', () => {
    expect(stripMarkdown('[필타임](https://filltime.vercel.app) 참고')).toBe(
      '필타임 참고',
    );
  });

  it('평문은 그대로', () => {
    expect(stripMarkdown('오늘 3시간 몰입했어요. 실천 제안: 휴식.')).toBe(
      '오늘 3시간 몰입했어요. 실천 제안: 휴식.',
    );
  });
});
