import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  getWorldIndexForLevel,
  getWorldIndexForTutorial,
  getWorldIndexForKnowledgeCheck,
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

  transform(dto: SyncProgressDto): TransformedMap[] {
    const worldBuckets: TransformedProgressEntry[][] = [[], [], [], []];

    const addOrUpdateEntry = (worldIndex: number, newEntry: TransformedProgressEntry) => {
      const bucket = worldBuckets[worldIndex];
      const existing = bucket.find(
        (e) => e.type === newEntry.type && e.level === newEntry.level,
      );

      if (existing) {
        if (newEntry.score !== undefined) {
          existing.score = Math.max(existing.score ?? 0, newEntry.score);
        }
      } else {
        bucket.push(newEntry);
      }
    };

    // Store absolute level index directly
    for (const entry of dto.levelProgress) {
      const worldIndex = getWorldIndexForLevel(entry.levelIndex);
      if (worldIndex === -1) continue;
      addOrUpdateEntry(worldIndex, {
        type: 'level',
        level: entry.levelIndex, // Raw global index (e.g., 0-39)
        score: entry.stars,
      });
    }

    // Store absolute tutorial index directly
    for (const entry of dto.tutorialProgress) {
      const worldIndex = getWorldIndexForTutorial(entry.tutorialIndex);
      if (worldIndex === -1) continue;
      addOrUpdateEntry(worldIndex, {
        type: 'tutorial',
        level: entry.tutorialIndex, // Raw global index (e.g., 4 instead of 0)
      });
    }

    // Store absolute knowledge check index directly
    for (const entry of dto.knowledgeCheckProgress) {
      const worldIndex = getWorldIndexForKnowledgeCheck(entry.checkIndex);
      if (worldIndex === -1) continue;
      addOrUpdateEntry(worldIndex, {
        type: 'knowledge_check',
        level: entry.checkIndex, // Raw global index (e.g., 2 instead of 0)
        score: entry.score,
      });
    }

    const typePriority: Record<string, number> = {
      knowledge_check: 0,
      tutorial: 1,
      level: 2,
    };

    return worldBuckets.map((progress, worldIndex) => {
      const sortedProgress = progress.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return typePriority[a.type] - typePriority[b.type];
      });

      return {
        name: getMapName(worldIndex),
        rank: getRank(worldIndex),
        progress: sortedProgress,
      };
    });
  }

  async compareNames(dbName: string, payloadName: string) {
    if (dbName.toLowerCase() !== payloadName.toLowerCase()) {
      throw new BadRequestException(
        `Username mismatch: expected "${dbName}", got "${payloadName}".`,
      );
    }
  }

  async syncProgress(userId: string, dto: SyncProgressDto) {
    // const userExists = await this.userModel.exists({ _id: userId });
    // if (!userExists) throw new NotFoundException('User not found');

    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    await this.compareNames(user.name, dto.username);

    const transformedMaps = this.transform(dto);
    const results: UserMapDocument[] = [];

    for (const map of transformedMaps) {
      if (map.progress.length === 0) continue;

      const existing = await this.userMapModel.findOne({
        user_id: new Types.ObjectId(userId),
        rank: map.rank,
      });

      if (existing) {
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