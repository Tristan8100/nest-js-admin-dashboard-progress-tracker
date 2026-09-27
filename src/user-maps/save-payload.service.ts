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
      const worldIndex = getWorldIndexForLevel(
        level.levelIndex,
      );

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

      const worldIndex = getWorldIndexForTutorial(
        tutorial.tutorialIndex,
      );

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

      const worldIndex =
        getWorldIndexForKnowledgeCheck(
          check.checkIndex,
        );

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

  async syncProgress(
    userId: string | Types.ObjectId,
    dto: SyncProgressDto,
  ) {
    const objectUserId =
      userId instanceof Types.ObjectId
        ? userId
        : new Types.ObjectId(userId);

    // =======================================================
    // IMPORTANT:
    //
    // EVERYTHING BELOW THIS SECTION happens BEFORE the main
    // payload is processed/saved.
    //
    // We take a snapshot of whether currentProgress ALREADY
    // existed in MongoDB.
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

      const rawType =
        current.progressType.toLowerCase();

      currentProgressType =
        rawType === 'knowledgecheck'
          ? 'knowledge_check'
          : rawType;

      currentProgressLevel =
        current.progressIndex;

      // -----------------------------------------------------
      // NORMALIZE WORLD USING SAME PAYLOAD MAPPING
      // -----------------------------------------------------

      let worldIndex = -1;

      switch (currentProgressType) {
        case 'level':
          worldIndex = getWorldIndexForLevel(
            current.progressIndex,
          );
          break;

        case 'tutorial':
          worldIndex = getWorldIndexForTutorial(
            current.progressIndex,
          );
          break;

        case 'knowledge_check':
          worldIndex =
            getWorldIndexForKnowledgeCheck(
              current.progressIndex,
            );
          break;
      }

      if (worldIndex !== -1) {
        currentMapRank = getRank(worldIndex);

        // ---------------------------------------------------
        // ATTEMPT TIME
        // ---------------------------------------------------

        if (current.clientTimestamp) {
          const parsedDate = new Date(
            current.clientTimestamp,
          );

          if (!Number.isNaN(parsedDate.getTime())) {
            currentAttemptTime = parsedDate;
          }
        }

        if (!currentAttemptTime) {
          currentAttemptTime = new Date();
        }

        currentAttemptScore = current.score ?? 0;

        // ---------------------------------------------------
        // CRITICAL:
        //
        // SEARCH MONGODB BEFORE DOING ANYTHING ELSE.
        //
        // This query determines whether this is a RETRY.
        // ---------------------------------------------------

        const existingMap =
          await this.userMapModel
            .findOne({
              user_id: objectUserId,
              rank: currentMapRank,
            })
            .lean();

        if (existingMap) {
          const existingProgress =
            existingMap.progress?.find(
              (progress) =>
                progress.type ===
                  currentProgressType &&
                progress.level ===
                  currentProgressLevel,
            );

          if (existingProgress) {
            // THIS WAS ALREADY IN DB BEFORE THIS SYNC.
            isRetry = true;

            previousScore =
              existingProgress.score;
          }
        }
      }
    }

    // =======================================================
    // FROM THIS POINT FORWARD:
    //
    // isRetry CANNOT CHANGE.
    //
    // The main payload is now allowed to create/update data,
    // but it can no longer accidentally turn a first attempt
    // into a retry.
    // =======================================================

    // =======================================================
    // LOAD EXISTING MAPS
    // =======================================================

    const existingMaps =
      await this.userMapModel.find({
        user_id: objectUserId,
      });

    const mapsByRank = new Map<
      number,
      UserMapDocument
    >();

    for (const map of existingMaps) {
      mapsByRank.set(map.rank, map);
    }

    // =======================================================
    // GET OR CREATE MAP
    // =======================================================

    const getOrCreateMap = (
      worldIndex: number,
    ): UserMapDocument => {
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
    // =======================================================

    const upsertProgress = (
      userMap: UserMapDocument,
      type: string,
      level: number,
      score?: number,
    ) => {
      const existingProgress =
        userMap.progress.find(
          (progress) =>
            progress.type === type &&
            progress.level === level,
        );

      if (existingProgress) {
        if (score !== undefined) {
          existingProgress.score = score;
        }

        return;
      }

      userMap.progress.push({
        type,
        level,
        ...(score !== undefined
          ? { score }
          : {}),
        date_acquired: new Date(),
        attempts: [],
      });
    };

    // =======================================================
    // LEVEL PROGRESS
    // =======================================================

    for (const level of dto.levelProgress ?? []) {
      const worldIndex =
        getWorldIndexForLevel(
          level.levelIndex,
        );

      if (worldIndex === -1) {
        continue;
      }

      const userMap =
        getOrCreateMap(worldIndex);

      upsertProgress(
        userMap,
        'level',
        level.levelIndex,
        level.stars,
      );
    }

    // =======================================================
    // TUTORIAL PROGRESS
    // =======================================================

    for (const tutorial of dto.tutorialProgress ?? []) {
      if (!tutorial.finished) {
        continue;
      }

      const worldIndex =
        getWorldIndexForTutorial(
          tutorial.tutorialIndex,
        );

      if (worldIndex === -1) {
        continue;
      }

      const userMap =
        getOrCreateMap(worldIndex);

      upsertProgress(
        userMap,
        'tutorial',
        tutorial.tutorialIndex,
      );
    }

    // =======================================================
    // KNOWLEDGE CHECK PROGRESS
    // =======================================================

    for (const check of dto.knowledgeCheckProgress ?? []) {
      if (!check.finished) {
        continue;
      }

      const worldIndex =
        getWorldIndexForKnowledgeCheck(
          check.checkIndex,
        );

      if (worldIndex === -1) {
        continue;
      }

      const userMap =
        getOrCreateMap(worldIndex);

      upsertProgress(
        userMap,
        'knowledge_check',
        check.checkIndex,
        check.score,
      );
    }

    // =======================================================
    // SAVE NORMAL PAYLOAD
    // =======================================================

    for (const userMap of mapsByRank.values()) {
      await userMap.save();
    }

    // =======================================================
    // RETRY HANDLING
    // =======================================================
    //
    // ONLY runs when the progress was found in MongoDB
    // BEFORE this sync started.
    //
    // Therefore:
    //
    // First attempt:
    //     isRetry = false
    //     -> NO attempts entry
    //
    // Retry:
    //     isRetry = true
    //     -> append exactly ONE attempt
    // =======================================================

    if (
      isRetry &&
      currentMapRank !== undefined &&
      currentProgressType !== undefined &&
      currentProgressLevel !== undefined &&
      currentAttemptTime
    ) {
      const currentMap =
        await this.userMapModel.findOne({
          user_id: objectUserId,
          rank: currentMapRank,
        });

      if (currentMap) {
        const currentMapProgress =
          currentMap.progress.find(
            (progress) =>
              progress.type ===
                currentProgressType &&
              progress.level ===
                currentProgressLevel,
          );

        if (currentMapProgress) {
          // -------------------------------------------------
          // RETRY ALWAYS GETS RECORDED
          // -------------------------------------------------

          currentMapProgress.attempts.push({
            attempt_time: currentAttemptTime,
            score: currentAttemptScore,
          });

          // -------------------------------------------------
          // date_acquired ONLY MOVES IF THE RETRY MATCHES
          // OR BEATS THE PREVIOUS SCORE.
          // -------------------------------------------------

          if (
            previousScore === undefined ||
            currentAttemptScore >= previousScore
          ) {
            currentMapProgress.date_acquired =
              currentAttemptTime;
          }

          await currentMap.save();
        }
      }
    }

    // =======================================================
    // RETURN FINAL USER MAPS
    // =======================================================

    return this.userMapModel.find({
      user_id: objectUserId,
    });
  }
}