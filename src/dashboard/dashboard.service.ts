import { Injectable } from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../users/entities/user.entity';

import {
  UserMap,
  UserMapDocument,
} from '../user-maps/entities/user-map.entity/user-map.entity';

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

  async getAnalytics() {
    const [
      studentsByGrade,
      studentsBySection,
      progressByMap,
      progressByType,
      activityByDay,
    ] = await Promise.all([
      /*
       * Students by grade
       */
      this.userModel.aggregate([
        {
          $match: {
            role: 'user',
          },
        },

        {
          $group: {
            _id: '$gradeLevel',

            students: {
              $sum: 1,
            },
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

            students: 1,
          },
        },
      ]),

      /*
       * Students by section
       */
      this.userModel.aggregate([
        {
          $match: {
            role: 'user',
          },
        },

        {
          $group: {
            _id: '$section',

            students: {
              $sum: 1,
            },
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

            students: 1,
          },
        },
      ]),

      /*
       * Progress by map
       */
      this.userMapModel.aggregate([
        {
          $unwind: '$progress',
        },

        {
          $group: {
            _id: {
              rank: '$rank',
              name: '$name',
            },

            completed: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            '_id.rank': 1,
          },
        },

        {
          $project: {
            _id: 0,

            rank: '$_id.rank',

            name: '$_id.name',

            completed: 1,
          },
        },
      ]),

      /*
       * Progress by type
       */
      this.userMapModel.aggregate([
        {
          $unwind: '$progress',
        },

        {
          $group: {
            _id: '$progress.type',

            completed: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            completed: -1,
          },
        },

        {
          $project: {
            _id: 0,

            type: '$_id',

            completed: 1,
          },
        },
      ]),

      /*
       * Activity by day
       */
      this.userMapModel.aggregate([
        {
          $unwind: '$progress',
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$progress.date_acquired',
              },
            },

            activity: {
              $sum: 1,
            },
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

            date: '$_id',

            activity: 1,
          },
        },
      ]),
    ]);

    return {
      studentsByGrade,

      studentsBySection,

      progressByMap,

      progressByType,

      activityByDay,
    };
  }
}