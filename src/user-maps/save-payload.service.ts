import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  UserMap,
  UserMapDocument,
  MapProgress,
} from './entities/user-map.entity/user-map.entity';

import { SyncProgressDto } from './dto/sync-progress.dto/sync-progress.dto';

import {
  WORLD_NAMES,
  getWorldIndexForLevel,
  getWorldIndexForTutorial,
  getWorldIndexForKnowledgeCheck,
  getMapName,
  getRank,
} from './payload-mapping';
import { getProgressRetryStatus } from './helpers/progress-retry-status';

@Injectable()
export class ProgressTransformService {
  constructor(
    @InjectModel(UserMap.name)
    private readonly userMapModel: Model<UserMapDocument>,
  ) {}

  // =========================================================
  // PREVIEW ONLY
  // =========================================================

  transform(dto: SyncProgressDto) {
    const maps = WORLD_NAMES.map((name, worldIndex) => ({
      name,
      rank: getRank(worldIndex),
      progress: [] as MapProgress[],
    }));

    // ---------------------------------------------------------
    // LEVELS
    // ---------------------------------------------------------

    for (const level of dto.levelProgress ?? []) {
      const worldIndex = getWorldIndexForLevel(level.levelIndex);

      if (worldIndex === -1) {
        continue;
      }

      maps[worldIndex].progress.push({
        type: 'level',
        level: level.levelIndex,
        score: level.stars,
        date_acquired: new Date(),
        attempts: [],
      });
    }

    // ---------------------------------------------------------
    // TUTORIALS
    // ---------------------------------------------------------

    for (const tutorial of dto.tutorialProgress ?? []) {
      if (!tutorial.finished) {
        continue;
      }

      const worldIndex = getWorldIndexForTutorial(tutorial.tutorialIndex);

      if (worldIndex === -1) {
        continue;
      }

      maps[worldIndex].progress.push({
        type: 'tutorial',
        level: tutorial.tutorialIndex,
        date_acquired: new Date(),
        attempts: [],
      });
    }

    // ---------------------------------------------------------
    // KNOWLEDGE CHECKS
    // ---------------------------------------------------------

    for (const check of dto.knowledgeCheckProgress ?? []) {
      if (!check.finished) {
        continue;
      }

      const worldIndex = getWorldIndexForKnowledgeCheck(check.checkIndex);

      if (worldIndex === -1) {
        continue;
      }

      maps[worldIndex].progress.push({
        type: 'knowledge_check',
        level: check.checkIndex,
        score: check.score,
        date_acquired: new Date(),
        attempts: [],
      });
    }

    return maps;
  }

  // =========================================================
  // ACTUAL SYNC
  // =========================================================

  async syncProgress(userId: string | Types.ObjectId, dto: SyncProgressDto) {
    const objectUserId =
      userId instanceof Types.ObjectId
        ? userId
        : new Types.ObjectId(userId);

    // =======================================================
    // LOAD EXISTING MAPS FIRST
    //
    // Everything below reads from this snapshot BEFORE any
    // mutation happens, so it doubles as the "was this already
    // in the DB" check for retry detection — no second query
    // needed later.
    // =======================================================

    const existingMaps = await this.userMapModel.find({
      user_id: objectUserId,
    });

    const mapsByRank = new Map<number, UserMapDocument>();

    for (const map of existingMaps) {
      mapsByRank.set(map.rank, map);
    }

    // =======================================================
    // DETERMINE RETRY INFO FOR dto.currentProgress
    //
    // isRetry/previousScore are decided ONCE, from the
    // pre-mutation snapshot above, and never change after
    // this point.
    // =======================================================

    let isRetry = false;
    let previousScore: number | undefined;

    let currentMapRank: number | undefined;
    let currentProgressType: string | undefined;
    let currentProgressLevel: number | undefined;
    let currentAttemptTime: Date | undefined;
    let currentAttemptScore = 0;

    const current = dto.currentProgress;

    if (
      current &&
      current.progressType &&
      current.progressIndex !== undefined &&
      current.progressIndex >= 0
    ) {
      // -----------------------------------------------------
      // NORMALIZE TYPE
      // -----------------------------------------------------

      const rawType = current.progressType.toLowerCase();

      currentProgressType =
        rawType === 'knowledgecheck' ? 'knowledge_check' : rawType;

      currentProgressLevel = current.progressIndex;

      // -----------------------------------------------------
      // NORMALIZE WORLD USING SAME PAYLOAD MAPPING
      // -----------------------------------------------------

      let worldIndex = -1;

      switch (currentProgressType) {
        case 'level':
          worldIndex = getWorldIndexForLevel(current.progressIndex);
          break;

        case 'tutorial':
          worldIndex = getWorldIndexForTutorial(current.progressIndex);
          break;

        case 'knowledge_check':
          worldIndex = getWorldIndexForKnowledgeCheck(current.progressIndex);
          break;
      }

      if (worldIndex !== -1) {
        currentMapRank = getRank(worldIndex);

        // ---------------------------------------------------
        // ATTEMPT TIME
        // ---------------------------------------------------

        if (current.clientTimestamp) {
          const parsedDate = new Date(current.clientTimestamp);

          if (!Number.isNaN(parsedDate.getTime())) {
            currentAttemptTime = parsedDate;
          }
        }

        if (!currentAttemptTime) {
          currentAttemptTime = new Date();
        }

        currentAttemptScore = current.score ?? 0;

        // ---------------------------------------------------
        // WAS THIS ALREADY IN THE DB BEFORE THIS SYNC?
        // ---------------------------------------------------

        const existingMap = mapsByRank.get(currentMapRank);

        const existingProgress = existingMap?.progress?.find(
          (progress) =>
            progress.type === currentProgressType &&
            progress.level === currentProgressLevel,
        );

        if (existingProgress) {
          isRetry = true;
          previousScore = existingProgress.score;
        }
      }
    }

    // =======================================================
    // GET OR CREATE MAP
    // =======================================================

  const getOrCreateMap = (worldIndex: number): UserMapDocument => {
      const rank = getRank(worldIndex);

      let userMap = mapsByRank.get(rank);

      if (!userMap) {
        userMap = new this.userMapModel({
          user_id: objectUserId,
          name: getMapName(worldIndex),
          rank,
          progress: [],
        });

        mapsByRank.set(rank, userMap);
      }

      return userMap;
    };

    // =======================================================
    // UPSERT PROGRESS
    //
    // statusRetry now lives on each ATTEMPT, not on the
    // progress record itself. It's only ever set when we push
    // a new attempt — which only happens on the retry branch,
    // for the single record matching dto.currentProgress.
    // =======================================================

    const upsertProgress = (
      userMap: UserMapDocument,
      type: string,
      level: number,
      score?: number,
    ) => {
      const existingProgress = userMap.progress.find(
        (progress) => progress.type === type && progress.level === level,
      );

      const isCurrentProgressRecord =
        isRetry &&
        currentAttemptTime !== undefined &&
        currentMapRank === userMap.rank &&
        currentProgressType === type &&
        currentProgressLevel === level;

      if (existingProgress) {
        // -----------------------------------------------------
        // MAIN PAYLOAD score overwrite — ONLY for records that
        // are NOT the currentProgress record. The current-
        // progress record's score is governed entirely by the
        // retry check below, not by whatever the bulk payload
        // sent for it.
        // -----------------------------------------------------

        if (!isCurrentProgressRecord && score !== undefined) {
          existingProgress.score = score;
        }

        // ---------------------------------------------------
        // RETRY HANDLING — ONLY for the record matching
        // dto.currentProgress, and ONLY if it existed before
        // this sync started (isRetry was decided up top and
        // can't change).
        // ---------------------------------------------------

        if (isCurrentProgressRecord) {
          const statusRetry = getProgressRetryStatus(
            type,
            previousScore,
            currentAttemptScore,
          );

          existingProgress.attempts.push({
            attempt_time: currentAttemptTime as Date,
            score: currentAttemptScore,
            statusRetry,
          });

          // -------------------------------------------------
          // score and date_acquired ONLY move when the retry
          // is an actual success (statusRetry === true). A
          // tie, a worse attempt, or a non-retry-eligible type
          // (e.g. tutorial) never touches either field.
          // -------------------------------------------------

          if (statusRetry) {
            existingProgress.score = currentAttemptScore;
            existingProgress.date_acquired = currentAttemptTime as Date;
          }
        }

        return;
    }

  // -----------------------------------------------------
  // First time this record is created this sync -> can
  // never be a retry (isRetry required it to already
  // exist), so it's just a plain new record with no
  // attempts yet.
  // -----------------------------------------------------

  userMap.progress.push({
    type,
    level,
    ...(score !== undefined ? { score } : {}),
    date_acquired: new Date(),
    attempts: [],
  });
};

    // =======================================================
    // LEVEL PROGRESS
    // =======================================================

    for (const level of dto.levelProgress ?? []) {
      const worldIndex = getWorldIndexForLevel(level.levelIndex);

      if (worldIndex === -1) {
        continue;
      }

      const userMap = getOrCreateMap(worldIndex);

      upsertProgress(userMap, 'level', level.levelIndex, level.stars);
    }

    // =======================================================
    // TUTORIAL PROGRESS
    // =======================================================

    for (const tutorial of dto.tutorialProgress ?? []) {
      if (!tutorial.finished) {
        continue;
      }

      const worldIndex = getWorldIndexForTutorial(tutorial.tutorialIndex);

      if (worldIndex === -1) {
        continue;
      }

      const userMap = getOrCreateMap(worldIndex);

      upsertProgress(userMap, 'tutorial', tutorial.tutorialIndex);
    }

    // =======================================================
    // KNOWLEDGE CHECK PROGRESS
    // =======================================================

    for (const check of dto.knowledgeCheckProgress ?? []) {
      if (!check.finished) {
        continue;
      }

      const worldIndex = getWorldIndexForKnowledgeCheck(check.checkIndex);

      if (worldIndex === -1) {
        continue;
      }

      const userMap = getOrCreateMap(worldIndex);

      upsertProgress(userMap, 'knowledge_check', check.checkIndex, check.score);
    }

    // =======================================================
    // SAVE — single save pass, retry data already applied
    // above, no second query/save needed.
    // =======================================================

    for (const userMap of mapsByRank.values()) {
      await userMap.save();
    }

    // =======================================================
    // RETURN FINAL USER MAPS
    // =======================================================

    return this.userMapModel.find({ user_id: objectUserId });
  }
}