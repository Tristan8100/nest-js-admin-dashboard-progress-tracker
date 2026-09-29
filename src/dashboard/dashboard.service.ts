import { Injectable } from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../users/entities/user.entity';

import {
  UserMap,
  UserMapDocument,
} from '../user-maps/entities/user-map.entity/user-map.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { LeaderboardQueryDto } from './dto/leaderbord-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(UserMap.name)
    private readonly userMapModel: Model<UserMapDocument>,
  ) {}

  async getDashboard() {
    const now = new Date();

    const sevenDaysAgo = new Date(
      now.getTime() -
        7 * 24 * 60 * 60 * 1000,
    );

    const [
      totalStudents,
      startedStudents,
      activeStudents,
      averageCompleted,
      recentActivity,
      recentStudents,
      studentsNeedingAttention,
    ] = await Promise.all([
      /*
       * Total students
       */
      this.userModel.countDocuments({
        role: 'user',
      }),

      /*
       * Students who have started at least
       * one map
       */
      this.userModel.countDocuments({
        role: 'user',
        _id: {
          $in: await this.userMapModel.distinct(
            'user_id',
          ),
        },
      }),

      /*
       * Students with activity within
       * the last 7 days
       */
      this.userMapModel.aggregate([
        {
          unwind:'progress',
        },

        {
          $match: {
            'progress.date_acquired': {
              $gte: sevenDaysAgo,
            },
          },
        },

        {
          $group: {
            _id: '$user_id',
          },
        },

        {
          $count: 'count',
        },
      ]),

      /*
       * Average completed items per student
       */
      this.userMapModel.aggregate([
        {
          unwind:'progress',
        },

        {
          $group: {
            _id: '$user_id',
            completed: {
              $sum: 1,
            },
          },
        },

        {
          $group: {
            _id: null,
            average: {
              avg:'completed',
            },
          },
        },
      ]),

      /*
       * Recent activity — latest single activity per user, limit 5 users
       */
      this.userMapModel.aggregate([
        {
          unwind:'progress',
        },

        // Sort first so that within each group, $first grabs the latest one
        {
          $sort: {
            'progress.date_acquired': -1,
          },
        },

        {
          $group: {
            _id: '$user_id',
            map_name: { first:'name' },
            rank: { first:'rank' },
            type: { first:'progress.type' },
            level: { first:'progress.level' },
            score: { first:'progress.score' },
            date_acquired: { first:'progress.date_acquired' },
          },
        },

        // Re-sort the grouped (per-user) results by their latest activity
        {
          $sort: {
            date_acquired: -1,
          },
        },

        {
          $limit: 5,
        },

        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },

        {
          unwind:'user',
        },

        {
          $project: {
            _id: 0,
            user_id: '$_id',
            student_name: '$user.name',
            username: '$user.username',
            gradeLevel: '$user.gradeLevel',
            section: '$user.section',
            map_name: 1,
            rank: 1,
            type: 1,
            level: 1,
            score: 1,
            date_acquired: 1,
          },
        },
      ]),

      /*
       * Recently registered students
       */
      this.userModel
        .find({
          role: 'user',
        })
        .select(
          'name username gradeLevel section created_at',
        )
        .sort({
          created_at: -1,
        })
        .limit(5)
        .lean(),

      /*
       * Students with low activity
       */
      this.userMapModel.aggregate([
        {
          $unwind: {
            path: '$progress',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $group: {
            _id: '$user_id',

            completed: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      '$progress',
                      null,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            lastActivity: {
              $max:
                '$progress.date_acquired',
            },
          },
        },

        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },

        {
          unwind:'user',
        },

        {
          $match: {
            'user.role': 'user',
          },
        },

        {
          $project: {
            _id: 0,

            user_id: '$_id',

            name: '$user.name',

            username: '$user.username',

            gradeLevel:
              '$user.gradeLevel',

            section: '$user.section',

            completed: 1,

            lastActivity: 1,
          },
        },

        {
          $sort: {
            completed: 1,
            lastActivity: 1,
          },
        },

        {
          $limit: 10,
        },
      ]),
    ]);

    return {
      summary: {
        totalStudents,

        startedStudents,

        activeStudents:
          activeStudents[0]?.count ?? 0,

        averageCompleted:
          Math.round(
            (averageCompleted[0]?.average ?? 0) *
              100,
          ) / 100,
      },

      recentActivity,

      recentStudents,

      studentsNeedingAttention,
    };
  }

  async getAnalytics(query: AnalyticsQueryDto) {
    const {
      gradeLevel,
      section,
      batch,
      active,
    } = query;

    const studentFilter: Record<string, any> = {
      role: 'user',
    };

    if (gradeLevel !== undefined) {
      studentFilter.gradeLevel = gradeLevel;
    }

    if (section?.trim()) {
      studentFilter.section = section.trim();
    }

    if (batch !== undefined) {
      studentFilter.batch = batch;
    }

    if (active !== undefined) {
      studentFilter.active = active;
    } else {
      // By default only include active students in analytics
      studentFilter.active = true;
    }

    const students = await this.userModel
      .find(studentFilter)
      .select('_id name username gradeLevel section batch active')
      .lean();

    const studentIds = students.map(
      (student) => student._id,
    );

    const [
      overview,
      studentsByGrade,
      studentsBySection,
      mapPerformance,
      activity,
    ] = await Promise.all([
      this.getAnalyticsOverview(
        studentIds,
      ),

      this.getStudentsByGrade(
        studentFilter,
      ),

      this.getStudentsBySection(
        studentFilter,
      ),

      this.getMapPerformance(
        studentIds,
      ),

      this.getActivity(
        studentIds,
      ),
    ]);

    return {
      overview,
      studentsByGrade,
      studentsBySection,
      mapPerformance,
      activity,
    };
  }

  /*
   * Leaderboard — top 10 and bottom 10 students by finalScore.
   * Only 'level' type progress counts toward score/rate/retries, since
   * knowledge_check uses a different scale (correct-count) and
   * tutorials have no score at all.
   *
   * retryCount = attempts with statusRetry === true on 'level' entries.
   * finalScore = totalScore - retryCount (1 point per retry, can be negative).
   */
  async getLeaderboard(query: LeaderboardQueryDto) {
    const dateMatch: Record<string, any> = {};

    if (query.startDate) {
      dateMatch.$gte = new Date(query.startDate);
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }

    const pipeline: any[] = [
      {
        unwind:'progress',
      },
    ];

    if (Object.keys(dateMatch).length > 0) {
      pipeline.push({
        $match: {
          'progress.date_acquired': dateMatch,
        },
      });
    }

    pipeline.push(
      // Sort first so $first below grabs each student's latest activity
      {
        $sort: {
          'progress.date_acquired': -1,
        },
      },

      {
        $group: {
          _id: '$user_id',

          // Last activity overall, regardless of type
          lastMapName: { first:'name' },
          lastRank: { first:'rank' },
          lastType: { first:'progress.type' },
          lastLevel: { first:'progress.level' },
          lastDateAcquired: { first:'progress.date_acquired' },

          // Only 'level' entries count toward score/rate
          totalScore: {
            $sum: {
              $cond: [
                { eq:['progress.type', 'level'] },
                { ifNull:['progress.score', 0] },
                0,
              ],
            },
          },

          levelsCompleted: {
            $sum: {
              $cond: [
                { eq:['progress.type', 'level'] },
                1,
                0,
              ],
            },
          },

          // NEW: number of retry attempts (statusRetry === true) on 'level'
          // entries. Counted inside Mongo only, attempts are never returned.
          // Missing attempts array counts as 0.
          retryCount: {
            $sum: {
              $cond: [
                { eq:['progress.type', 'level'] },
                {
                  $size: {
                    $filter: {
                      input: { ifNull:['progress.attempts', []] },
                      as: 'attempt',
                      cond: { eq:['$attempt.statusRetry', true] },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },

      {
        unwind:'user',
      },

      {
        $match: {
          'user.role': 'user',
        },
      },

      {
        $project: {
          _id: 0,
          user_id: '$_id',
          student_name: '$user.name',
          username: '$user.username',
          gradeLevel: '$user.gradeLevel',
          section: '$user.section',

          totalScore: 1,
          levelsCompleted: 1,

          // NEW
          retryCount: 1,

          // NEW: 1 point deducted per retry
          finalScore: {
            subtract:['totalScore', '$retryCount'],
          },

          // UNCHANGED: still based on totalScore
          scoreRate: {
            $cond: [
              { gt:['levelsCompleted', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$totalScore',
                          { multiply:['levelsCompleted', 3] },
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },

          lastActivity: {
            map_name: '$lastMapName',
            rank: '$lastRank',
            type: '$lastType',
            level: '$lastLevel',
            date_acquired: '$lastDateAcquired',
          },
        },
      },

      // Get top 10 and bottom 10 in a single pass, now by finalScore
      {
        $facet: {
          top: [
            {
              $sort: {
                finalScore: -1,
                student_name: 1,
              },
            },
            {
              $limit: 10,
            },
          ],

          bottom: [
            {
              $sort: {
                finalScore: 1,
                student_name: 1,
              },
            },
            {
              $limit: 10,
            },
          ],
        },
      },
    );

    const [result] = await this.userMapModel.aggregate(pipeline);

    // Assign display rank: students tied on finalScore share the same
    // rank number (e.g. 1, 1, 3, 4...) so the teacher knows there's no
    // real difference between them — only genuinely lower scores rank lower.
    const assignRanks = (list: any[]) => {
      let lastScore: number | null = null;
      let lastRank = 0;

      return list.map((entry, index) => {
        if (entry.finalScore !== lastScore) {
          lastRank = index + 1;
          lastScore = entry.finalScore;
        }

        return {
          rank: lastRank,
          ...entry,
        };
      });
    };

    return {
      top: assignRanks(result?.top ?? []),
      bottom: assignRanks(result?.bottom ?? []),
    };
  }

  //private methods
  private async getStudentsByGrade(
    filter: Record<string, any>,
  ) {
    return this.userModel.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$gradeLevel',
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          gradeLevel: '$_id',
          count: 1,
        },
      },
    ]);
  }

  private async getStudentsBySection(
    filter: Record<string, any>,
  ) {
    return this.userModel.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          section: '$_id',
          count: 1,
        },
      },
    ]);
  }

  private async getMapPerformance(
    studentIds: Types.ObjectId[],
  ) {
    return this.userMapModel.aggregate([
      {
        $match: {
          user_id: {
            $in: studentIds,
          },
        },
      },
      {
        $unwind: {
          path: '$progress',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: {
            rank: '$rank',
            name: '$name',
          },

          students: {
            addToSet:'user_id',
          },

          completed: {
            $sum: 1,
          },

          totalScore: {
            $sum: {
              $ifNull: [
                '$progress.score',
                0,
              ],
            },
          },

          scoredItems: {
            $sum: {
              $cond: [
                {
                  $ne: [
                    '$progress.score',
                    null,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          rank: '$_id.rank',
          name: '$_id.name',
          students: {
            size:'students',
          },
          completed: 1,
          averageScore: {
            $cond: [
              {
                gt:['scoredItems', 0],
              },
              {
                $divide: [
                  '$totalScore',
                  '$scoredItems',
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: {
          rank: 1,
        },
      },
    ]);
  }

  private async getActivity(
    studentIds: Types.ObjectId[],
  ) {
    return this.userMapModel.aggregate([
      {
        $match: {
          user_id: {
            $in: studentIds,
          },
        },
      },

      {
        unwind:'progress',
      },

      // Sort first so that within each group, $first grabs the latest one
      {
        $sort: {
          'progress.date_acquired': -1,
        },
      },

      {
        $group: {
          _id: '$user_id',
          rank: { first:'rank' },
          map_name: { first:'name' },
          type: { first:'progress.type' },
          level: { first:'progress.level' },
          score: { first:'progress.score' },
          date_acquired: { first:'progress.date_acquired' },
        },
      },

      // Re-sort the grouped (per-user) results by their latest activity
      {
        $sort: {
          date_acquired: -1,
        },
      },

      {
        $limit: 50,
      },

      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },

      {
        unwind:'student',
      },

      {
        $project: {
          _id: 0,
          user_id: '$_id',
          rank: 1,
          map_name: 1,

          student_name: '$student.name',
          username: '$student.username',

          type: 1,
          level: 1,
          score: 1,
          date_acquired: 1,
        },
      },
    ]);
  }

  private async getAnalyticsOverview(
    studentIds: Types.ObjectId[],
  ) {
    if (studentIds.length === 0) {
      return {
        totalStudents: 0,
        startedStudents: 0,
        activeStudents: 0,
        totalCompleted: 0,
        averageCompleted: 0,
      };
    }

    const result = await this.userMapModel.aggregate([
      {
        $match: {
          user_id: {
            $in: studentIds,
          },
        },
      },
      {
        $unwind: {
          path: '$progress',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: '$user_id',

          completed: {
            $sum: 1,
          },

          lastActivity: {
            max:'progress.date_acquired',
          },
        },
      },
      {
        $group: {
          _id: null,

          startedStudents: {
            $sum: 1,
          },

          totalCompleted: {
            sum:'completed',
          },

          averageCompleted: {
            avg:'completed',
          },

          activeStudents: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$lastActivity',
                    new Date(
                      Date.now() -
                        7 * 24 * 60 * 60 * 1000,
                    ),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const data = result[0];

    return {
      totalStudents: studentIds.length,
      startedStudents: data?.startedStudents ?? 0,
      activeStudents: data?.activeStudents ?? 0,
      totalCompleted: data?.totalCompleted ?? 0,
      averageCompleted: Math.round(
        (data?.averageCompleted ?? 0) * 100,
      ) / 100,
    };
  }
}

            
