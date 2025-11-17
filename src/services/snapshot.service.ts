import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据快照服务
 * 负责创建账号和视频的数据快照
 */
export class SnapshotService {
  /**
   * 创建所有账号的数据快照
   */
  async createAccountSnapshots(): Promise<void> {
    console.log('📸 开始创建账号数据快照...');
    
    try {
      const accounts = await prisma.platformAccount.findMany({
        where: {
          isActive: true,
        },
      });
      
      const snapshotTime = new Date();
      let successCount = 0;
      
      for (const account of accounts) {
        try {
          // 获取上一次快照
          const lastSnapshot = await prisma.accountSnapshot.findFirst({
            where: { accountId: account.id },
            orderBy: { snapshotTime: 'desc' },
          });
          
          // 计算变化量
          const followersDelta = lastSnapshot 
            ? (account.followersCount || 0) - lastSnapshot.followersCount 
            : 0;
          const favoritedDelta = lastSnapshot
            ? (account.totalFavorited || 0) - lastSnapshot.totalFavorited
            : 0;
          
          // 获取当前视频总数
          const videoCount = await prisma.accountVideo.count({
            where: { platformAccountId: account.id },
          });
          const videoCountDelta = lastSnapshot
            ? videoCount - lastSnapshot.videoCount
            : 0;
          
          // 创建新快照
          await prisma.accountSnapshot.create({
            data: {
              accountId: account.id,
              snapshotTime,
              followersCount: account.followersCount || 0,
              totalFavorited: account.totalFavorited || 0,
              videoCount,
              followersDelta,
              favoritedDelta,
              videoCountDelta,
            },
          });
          
          successCount++;
          console.log(`  ✅ 账号: ${account.accountName} (粉丝: ${account.followersCount}, 增量: ${followersDelta > 0 ? '+' : ''}${followersDelta})`);
        } catch (error) {
          console.error(`  ❌ 账号快照失败: ${account.accountName}`, error);
        }
      }
      
      console.log(`✅ 账号快照完成: ${successCount}/${accounts.length}`);
    } catch (error) {
      console.error('❌ 创建账号快照失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建所有视频的数据快照
   */
  async createVideoSnapshots(): Promise<void> {
    console.log('📸 开始创建视频数据快照...');
    
    try {
      // 获取所有有数据的视频（最近30天发布的）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const videos = await prisma.accountVideo.findMany({
        where: {
          publishTime: {
            gte: thirtyDaysAgo,
          },
        },
      });
      
      const snapshotTime = new Date();
      let successCount = 0;
      
      for (const video of videos) {
        try {
          // 获取上一次快照
          const lastSnapshot = await prisma.videoSnapshot.findFirst({
            where: { videoId: video.id },
            orderBy: { snapshotTime: 'desc' },
          });
          
          // 计算变化量
          const playCount = video.playCount || 0;
          const diggCount = video.diggCount || 0;
          const commentCount = video.commentCount || 0;
          const shareCount = video.shareCount || 0;
          const collectCount = video.collectCount || 0;
          
          const playDelta = lastSnapshot ? playCount - lastSnapshot.playCount : 0;
          const diggDelta = lastSnapshot ? diggCount - lastSnapshot.diggCount : 0;
          const commentDelta = lastSnapshot ? commentCount - lastSnapshot.commentCount : 0;
          const shareDelta = lastSnapshot ? shareCount - lastSnapshot.shareCount : 0;
          const collectDelta = lastSnapshot ? collectCount - lastSnapshot.collectCount : 0;
          
          // 创建新快照
          await prisma.videoSnapshot.create({
            data: {
              videoId: video.id,
              snapshotTime,
              playCount,
              diggCount,
              commentCount,
              shareCount,
              collectCount,
              playDelta,
              diggDelta,
              commentDelta,
              shareDelta,
              collectDelta,
            },
          });
          
          successCount++;
          
          if (playDelta > 0 || diggDelta > 0) {
            console.log(`  ✅ 视频: ${video.title.slice(0, 20)}... (播放: +${playDelta}, 点赞: +${diggDelta})`);
          }
        } catch (error) {
          console.error(`  ❌ 视频快照失败: ${video.title}`, error);
        }
      }
      
      console.log(`✅ 视频快照完成: ${successCount}/${videos.length}`);
    } catch (error) {
      console.error('❌ 创建视频快照失败:', error);
      throw error;
    }
  }
  
  /**
   * 清理旧快照（保留近3个月）
   */
  async cleanupOldSnapshots(): Promise<void> {
    console.log('🧹 清理旧快照数据...');
    
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // 删除旧的账号快照
      const deletedAccounts = await prisma.accountSnapshot.deleteMany({
        where: {
          snapshotTime: {
            lt: threeMonthsAgo,
          },
        },
      });
      
      // 删除旧的视频快照
      const deletedVideos = await prisma.videoSnapshot.deleteMany({
        where: {
          snapshotTime: {
            lt: threeMonthsAgo,
          },
        },
      });
      
      console.log(`✅ 已清理: 账号快照 ${deletedAccounts.count} 条, 视频快照 ${deletedVideos.count} 条`);
    } catch (error) {
      console.error('❌ 清理旧快照失败:', error);
      throw error;
    }
  }
}
