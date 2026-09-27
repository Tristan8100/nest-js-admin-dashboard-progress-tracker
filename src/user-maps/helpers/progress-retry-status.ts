export type ProgressType = 'level' | 'tutorial' | 'knowledge_check';

const PERFECT_SCORE_BY_TYPE: Record<ProgressType, number> = {
  level: 3,
  tutorial: 0,
  knowledge_check: 5,
};

export function getProgressRetryStatus(
  type: string,
  previousScore?: number,
  currentScore?: number,
): boolean {
  const normalizedType = type?.toLowerCase();

  if (normalizedType === 'tutorial') {
    return false;
  }

  const perfectScore =
    normalizedType === 'level'
      ? PERFECT_SCORE_BY_TYPE.level
      : normalizedType === 'knowledge_check'
        ? PERFECT_SCORE_BY_TYPE.knowledge_check
        : undefined;

  if (perfectScore === undefined) {
    return false;
  }

  const current = currentScore ?? 0;
  const previous = previousScore ?? undefined;

  if (previous === undefined) {
    return false;
  }

  if (current >= perfectScore && previous < perfectScore) {
    return true;
  }

  return false;
}
