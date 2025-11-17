import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 统计计算服务
 * 负责计算和汇总统计数据
 */
export class StatisticsService {
  /**
   * 计算每日汇总（针对所有账号）
   */
  async calculateDailySummary(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const periodStart = new Date(targetDate);
    const periodEnd = new Date(targetDate);
    periodEnd.setDate(periodEnd.getDate() + 1);
    
    console.log(`📊 计算每日汇总: ${periodStart.toISOString().split('T')[0]}`);
    
    try {
      // 获取所有活跃账号
      const accounts = await prisma.platformAccount.findMany({
        where: { isActive: true },
      });
      
      for (const account of accounts) {
        await this.calculateAccountSummary(
          account.id,
          'daily',
          periodStart,
          periodEnd
        );
      }
      
      // 计算全局汇总
      await this.calculateAccountSummary(
        null,
        'daily',
        periodStart,
        periodEnd
      );
      
      console.log('✅ 每日汇总计算完成');
    } catch (error) {
      console.error('❌ 计算每日汇总失败:', error);
      throw error;
    }
  }
  
  /**
   * 计算账号汇总（支持 daily/weekly/monthly）
   */
  private async calculateAccountSummary(
    accountId: number | null,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    try {
      // 获取时间范围内的所有视频快照
      const videoWhereClause: any = {
        snapshotTime: {
          gte: periodStart,
          lt: periodEnd,
        },
      };
      
      if (accountId) {
        videoWhereClause.video = {
          platformAccountId: accountId,
        };
      }
      
      // 聚合视频数据
      const videoSnapshots = await prisma.videoSnapshot.findMany({
        where: videoWhereClause,
        include: {
          video: true,
        },
      });
      
      // 计算汇总
      let totalPlays = BigInt(0);
      let totalDiggs = BigInt(0);
      let totalComments = BigInt(0);
      let totalShares = BigInt(0);
      let totalCollects = BigInt(0);
      
      for (const snapshot of videoSnapshots) {
        totalPlays += BigInt(snapshot.playDelta);
        totalDiggs += BigInt(snapshot.diggDelta);
        totalComments += BigInt(snapshot.commentDelta);
        totalShares += BigInt(snapshot.shareDelta);
        totalCollects += BigInt(snapshot.collectDelta);
      }
      
      // 获取新增粉丝数
      let newFollowers = 0;
      if (accountId) {
        const accountSnapshots = await prisma.accountSnapshot.findMany({
          where: {
            accountId,
            snapshotTime: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        });
        newFollowers = accountSnapshots.reduce((sum, s) => sum + s.followersDelta, 0);
      } else {
        const allAccountSnapshots = await prisma.accountSnapshot.findMany({
          where: {
            snapshotTime: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        });
        newFollowers = allAccountSnapshots.reduce((sum, s) => sum + s.followersDelta, 0);
      }
      
      // 获取新发布视频数
      const newVideos = await prisma.accountVideo.count({
        where: {
          ...(accountId ? { platformAccountId: accountId } : {}),
          publishTime: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      });
      
      // 计算平均值
      const videoCount = accountId
        ? await prisma.accountVideo.count({ where: { platformAccountId: accountId } })
        : await prisma.accountVideo.count();
      
      const avgPlayPerVideo = videoCount > 0 ? Number(totalPlays) / videoCount : 0;
      const avgDiggPerVideo = videoCount > 0 ? Number(totalDiggs) / videoCount : 0;
      
      // 保存或更新汇总数据
      // 检查是否已存在
      const existing = await prisma.statisticsSummary.findFirst({
        where: {
          accountId: accountId || null,
          periodType,
          periodStart,
        },
      });
      
      if (existing) {
        // 更新
        await prisma.statisticsSummary.update({
          where: { id: existing.id },
          data: {
            totalPlays,
            totalDiggs,
            totalComments,
            totalShares,
            totalCollects,
            newFollowers,
            newVideos,
            avgPlayPerVideo,
            avgDiggPerVideo,
          },
        });
      } else {
        // 创建
        await prisma.statisticsSummary.create({
          data: {
            accountId,
            periodType,
            periodStart,
            periodEnd,
            totalPlays,
            totalDiggs,
            totalComments,
            totalShares,
            totalCollects,
            newFollowers,
            newVideos,
            avgPlayPerVideo,
            avgDiggPerVideo,
          },
        });
      }
      
      const accountName = accountId
        ? (await prisma.platformAccount.findUnique({ where: { id: accountId } }))?.accountName
        : '全局';
      
      console.log(`  ✅ ${accountName}: 播放+${totalPlays}, 点赞+${totalDiggs}, 新增粉丝+${newFollowers}`);
    } catch (error) {
      console.error(`❌ 计算汇总失败 (账号ID: ${accountId}):`, error);
    }
  }
  
  /**
   * 计算每周汇总
   */
  async calculateWeeklySummary(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    
    // 计算本周的开始和结束
    const periodStart = new Date(targetDate);
    periodStart.setDate(periodStart.getDate() - periodStart.getDay()); // 周日
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    
    console.log(`📊 计算每周汇总: ${periodStart.toISOString().split('T')[0]} ~ ${periodEnd.toISOString().split('T')[0]}`);
    
    try {
      const accounts = await prisma.platformAccount.findMany({
        where: { isActive: true },
      });
      
      for (const account of accounts) {
        await this.calculateAccountSummary(
          account.id,
          'weekly',
          periodStart,
          periodEnd
        );
      }
      
      // 全局汇总
      await this.calculateAccountSummary(
        null,
        'weekly',
        periodStart,
        periodEnd
      );
      
      console.log('✅ 每周汇总计算完成');
    } catch (error) {
      console.error('❌ 计算每周汇总失败:', error);
      throw error;
    }
  }
  
  /**
   * 计算每月汇总
   */
  async calculateMonthlySummary(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    
    // 计算本月的开始和结束
    const periodStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const periodEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
    
    console.log(`📊 计算每月汇总: ${periodStart.toISOString().split('T')[0]} ~ ${periodEnd.toISOString().split('T')[0]}`);
    
    try {
      const accounts = await prisma.platformAccount.findMany({
        where: { isActive: true },
      });
      
      for (const account of accounts) {
        await this.calculateAccountSummary(
          account.id,
          'monthly',
          periodStart,
          periodEnd
        );
      }
      
      // 全局汇总
      await this.calculateAccountSummary(
        null,
        'monthly',
        periodStart,
        periodEnd
      );
      
      console.log('✅ 每月汇总计算完成');
    } catch (error) {
      console.error('❌ 计算每月汇总失败:', error);
      throw error;
    }
  }
}
