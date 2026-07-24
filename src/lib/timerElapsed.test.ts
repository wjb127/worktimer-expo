import { elapsedSecondsSince } from './timerElapsed';

describe('elapsedSecondsSince', () => {
  it('절대 시각 기준으로 백그라운드 경과 시간을 복원한다', () => {
    expect(
      elapsedSecondsSince('2026-07-25T00:00:00.000Z', Date.parse('2026-07-25T00:02:03.900Z')),
    ).toBe(123);
  });

  it('미래 시각과 잘못된 시각은 0초로 제한한다', () => {
    expect(
      elapsedSecondsSince('2026-07-25T00:10:00.000Z', Date.parse('2026-07-25T00:00:00.000Z')),
    ).toBe(0);
    expect(elapsedSecondsSince('invalid', Date.now())).toBe(0);
  });
});
