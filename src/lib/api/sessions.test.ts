jest.mock('./client', () => ({ apiJson: jest.fn(), apiFetch: jest.fn() }));
import { mapSession } from './sessions';

describe('mapSession', () => {
  it('camelCase API 응답을 앱 WorkSession(snake_case)로 매핑', () => {
    const api = {
      id: 'x',
      startTime: '2026-06-20T00:00:00Z',
      endTime: null,
      duration: 0,
      date: '2026-06-20',
      createdAt: '2026-06-20T00:00:00Z',
      meta: { description: 'API 설계' },
    };
    const s = mapSession(api);
    expect(s).toEqual({
      id: 'x',
      start_time: '2026-06-20T00:00:00Z',
      end_time: null,
      duration: 0,
      date: '2026-06-20',
      created_at: '2026-06-20T00:00:00Z',
      description: 'API 설계',
    });
  });
});
