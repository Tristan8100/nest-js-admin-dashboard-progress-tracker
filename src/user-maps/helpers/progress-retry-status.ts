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

  const previous = previousScore ?? undefined;

  // If the previous score is undefined, we cannot determine if the user has improved or not, so we return false.
  if (previous === undefined) { 
    return false;
  }

  

  return previous < perfectScore; //updated modified return
}
