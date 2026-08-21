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
          $unwind: '$progress',
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
          $unwind: '$progress',
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
              $avg: '$completed',
            },
          },
        },
      ]),

      /*
       * Recent activity
       */
      this.userMapModel.aggregate([
        {
          $unwind: '$progress',
        },

        {
          $sort: {
            'progress.date_acquired': -1,
          },
        },

        {
          $limit: 10,
        },

        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
          },
        },

        {
          $unwind: '$user',
        },

        {
          $project: {
            _id: 0,

            user_id: 1,

            student_name: '$user.name',

            username: '$user.username',

            gradeLevel: '$user.gradeLevel',

            section: '$user.section',

            map_name: '$name',

            rank: 1,

            type: '$progress.type',

            level: '$progress.level',

            score: '$progress.score',

            date_acquired:
              '$progress.date_acquired',
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
          $unwind: '$user',
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

    const students = await this.userModel
      .find(studentFilter)
      .select('_id name username gradeLevel section')
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
            $addToSet: '$user_id',
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
            $size: '$students',
          },
          completed: 1,
          averageScore: {
            $cond: [
              {
                $gt: ['$scoredItems', 0],
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
        $unwind: '$progress',
      },
      {
        $sort: {
          'progress.date_acquired': -1,
        },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      {
        $unwind: '$student',
      },
      {
        $project: {
          _id: 0,
          user_id: 1,
          rank: 1,
          map_name: '$name',

          student_name: '$student.name',
          username: '$student.username',

          type: '$progress.type',
          level: '$progress.level',
          score: '$progress.score',
          date_acquired:
            '$progress.date_acquired',
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
            $max: '$progress.date_acquired',
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
            $sum: '$completed',
          },

          averageCompleted: {
            $avg: '$completed',
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