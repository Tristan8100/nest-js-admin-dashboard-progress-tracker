import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getWorldIndexForLevel,
  getLocalLevelIndex,
  getWorldIndexForTutorial,
  getLocalTutorialIndex,
  getWorldIndexForKnowledgeCheck,
  getLocalKnowledgeCheckIndex,
  getMapName,
  getRank,
} from './payload-mapping';
import { SyncProgressDto } from './dto/sync-progress.dto/sync-progress.dto';
import { Model, Types } from 'mongoose';
import { UserMap, UserMapDocument } from './entities/user-map.entity/user-map.entity';
import { User, UserDocument } from 'src/users/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';

export interface TransformedProgressEntry {
  type: 'level' | 'tutorial' | 'knowledge_check';
  level: number;
  score?: number;
}

export interface TransformedMap {
  name: string;
  rank: number;
  progress: TransformedProgressEntry[];
}

@Injectable()
export class ProgressTransformService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    
        @InjectModel(UserMap.name)
        private readonly userMapModel: Model<UserMapDocument>,
      ) {}
  /**
   * Takes the raw game payload (global indices) and groups it into the
   * 4 per-world map structures the backend schema expects (local indices).
   * Pure transform only — does not touch the database.
   */
  transform(dto: SyncProgressDto): TransformedMap[] {
    // one bucket per world, in fixed order (materials, living, force, earth)
    const worldBuckets: TransformedProgressEntry[][] = [[], [], [], []];

    for (const entry of dto.levelProgress) {
      const worldIndex = getWorldIndexForLevel(entry.levelIndex);
      if (worldIndex === -1) continue;
      worldBuckets[worldIndex].push({
        type: 'level',
        level: getLocalLevelIndex(entry.levelIndex),
        score: entry.stars,
      });
    }

    for (const entry of dto.tutorialProgress) {
      const worldIndex = getWorldIndexForTutorial(entry.tutorialIndex);
      if (worldIndex === -1) continue;
      worldBuckets[worldIndex].push({
        type: 'tutorial',
        level: getLocalTutorialIndex(entry.tutorialIndex),
      });
    }

    for (const entry of dto.knowledgeCheckProgress) {
      const worldIndex = getWorldIndexForKnowledgeCheck(entry.checkIndex);
      if (worldIndex === -1) continue;
      worldBuckets[worldIndex].push({
        type: 'knowledge_check',
        level: getLocalKnowledgeCheckIndex(entry.checkIndex),
        score: entry.score,
      });
    }

    return worldBuckets.map((progress, worldIndex) => ({
      name: getMapName(worldIndex),
      rank: getRank(worldIndex),
      progress,
    }));
  }

  async syncProgress(userId: string, dto: SyncProgressDto) {
    const userExists = await this.userModel.exists({ _id: userId });
    if (!userExists) throw new NotFoundException('User not found');
 
    const transformedMaps = this.transform(dto);
 
    const results: UserMapDocument[] = [];
 
    for (const map of transformedMaps) {
      // Skip worlds with nothing to sync — don't create/overwrite an empty map
      // for a world the player hasn't touched yet.
      if (map.progress.length === 0) continue;
 
      const existing = await this.userMapModel.findOne({
        user_id: new Types.ObjectId(userId),
        rank: map.rank,
      });
 
      if (existing) {
        // Already exists — delete then re-add, per the requested behavior.
        await this.userMapModel.deleteOne({ _id: existing._id });
      }
 
      const created = await this.userMapModel.create({
        user_id: new Types.ObjectId(userId),
        name: map.name,
        rank: map.rank,
        progress: map.progress,
      });
 
      results.push(created);
    }
 
    return {
      message: 'Progress synced successfully',
      maps: results,
    };
  }
}