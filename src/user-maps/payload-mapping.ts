// Mirrors Unity's WorldMapping.cs — kept in sync manually since the
// conversion now lives on the backend instead of in the game.

export const WORLD_NAMES = ['materials', 'living', 'force', 'earth'];
export const LEVELS_PER_WORLD = 10;

// (startIndex, count) per world, in WORLD_NAMES order
export const TUTORIAL_RANGES: [number, number][] = [
  [0, 4],  // materials: 0-3
  [4, 4],  // living: 4-7
  [8, 3],  // force: 8-10
  [11, 3], // earth: 11-13
];

// explicit global knowledge check indices per world
export const KNOWLEDGE_CHECK_INDICES: number[][] = [
  [0, 1], // materials
  [2, 3], // living
  [4, 5], // force
  [6, 7], // earth
];

export function getWorldIndexForLevel(globalLevelIndex: number): number {
  return Math.floor(globalLevelIndex / LEVELS_PER_WORLD);
}

export function getLocalLevelIndex(globalLevelIndex: number): number {
  return globalLevelIndex % LEVELS_PER_WORLD;
}

export function getWorldIndexForTutorial(globalTutorialIndex: number): number {
  for (let w = 0; w < TUTORIAL_RANGES.length; w++) {
    const [start, count] = TUTORIAL_RANGES[w];
    if (count > 0 && globalTutorialIndex >= start && globalTutorialIndex < start + count) {
      return w;
    }
  }
  return -1;
}

export function getLocalTutorialIndex(globalTutorialIndex: number): number {
  const worldIndex = getWorldIndexForTutorial(globalTutorialIndex);
  if (worldIndex === -1) return -1;
  return globalTutorialIndex - TUTORIAL_RANGES[worldIndex][0];
}

export function getWorldIndexForKnowledgeCheck(globalCheckIndex: number): number {
  for (let w = 0; w < KNOWLEDGE_CHECK_INDICES.length; w++) {
    if (KNOWLEDGE_CHECK_INDICES[w].includes(globalCheckIndex)) return w;
  }
  return -1;
}

export function getLocalKnowledgeCheckIndex(globalCheckIndex: number): number {
  const worldIndex = getWorldIndexForKnowledgeCheck(globalCheckIndex);
  if (worldIndex === -1) return -1;
  return KNOWLEDGE_CHECK_INDICES[worldIndex].indexOf(globalCheckIndex);
}

export function getMapName(worldIndex: number): string {
  return WORLD_NAMES[worldIndex];
}

export function getRank(worldIndex: number): number {
  return worldIndex + 1;
}