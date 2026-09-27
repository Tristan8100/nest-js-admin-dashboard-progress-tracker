import { getProgressRetryStatus } from './progress-retry-status';

describe('getProgressRetryStatus', () => {
  it('returns false for first completion on level', () => {
    expect(getProgressRetryStatus('level', undefined, 3)).toBe(false);
    expect(getProgressRetryStatus('level', undefined, 2)).toBe(false);
  });

  it('returns true when a previous imperfect score reaches perfect', () => {
    expect(getProgressRetryStatus('level', 2, 3)).toBe(true);
    expect(getProgressRetryStatus('knowledge_check', 4, 5)).toBe(true);
  });

  it('returns false for revisits after perfect score', () => {
    expect(getProgressRetryStatus('level', 3, 0)).toBe(false);
    expect(getProgressRetryStatus('level', 3, 1)).toBe(false);
    expect(getProgressRetryStatus('level', 3, 2)).toBe(false);
    expect(getProgressRetryStatus('level', 3, 3)).toBe(false);
    expect(getProgressRetryStatus('knowledge_check', 5, 4)).toBe(false);
  });

  it('returns false for tutorials regardless of score', () => {
    expect(getProgressRetryStatus('tutorial', undefined, 0)).toBe(false);
    expect(getProgressRetryStatus('tutorial', 0, 1)).toBe(false);
  });
});
