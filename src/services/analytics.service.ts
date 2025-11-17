import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据分析服务
 */
export class AnalyticsService {
  /**
   * 获取账号概览数据
   */
  async getAccountOverview(accountId: number) {
    // 获取账号基本信息
    const account = await prisma.platformAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('账号不存在');
    }

    // 获取最新快照
    const latestSnapshot = await prisma.accountSnapshot.findFirst({
      where: { accountId },
      orderBy: { snapshotTime: 'desc' },
    });

    // 获取24小时前的快照
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const snapshot24h = await prisma.accountSnapshot.findFirst({
      where: {
        accountId,
        snapshotTime: { lte: twentyFourHoursAgo },
      },
      orderBy: { snapshotTime: 'desc' },
    });

    // 获取7天前的快照
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot7d = await prisma.accountSnapshot.findFirst({
      where: {
        accountId,
        snapshotTime: { lte: sevenDaysAgo },
      },
      orderBy: { snapshotTime: 'desc' },
    });

    // 计算变化
    const changes = {
      followers24h: latestSnapshot && snapshot24h
        ? latestSnapshot.followersCount - snapshot24h.followersCount
        : 0,
      followers7d: latestSnapshot && snapshot7d
        ? latestSnapshot.followersCount - snapshot7d.followersCount
        : 0,
      favorited24h: latestSnapshot && snapshot24h
        ? latestSnapshot.totalFavorited - snapshot24h.totalFavorited
        : 0,
    };

    return {
      account: {
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        username: account.username,
        avatar: account.avatar,
      },
      current: {
        followers: account.followersCount || 0,
        totalFavorited: account.totalFavorited || 0,
        videoCount: latestSnapshot?.videoCount || 0,
      },
      changes,
    };
  }

  /**
   * 获取账号增长趋势
   */
  async getAccountGrowth(
    accountId: number,
    options: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'hour' | 'day' | 'week';
    } = {}
  ) {
    const { startDate, endDate, granularity = 'day' } = options;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天
    const end = endDate || new Date();

    // 获取时间范围内的快照
    const snapshots = await prisma.accountSnapshot.findMany({
      where: {
        accountId,
        snapshotTime: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { snapshotTime: 'asc' },
    });

    // 根据粒度聚合数据
    const aggregated = this.aggregateByGranularity(snapshots, granularity);

    return {
      followers: aggregated.map(item => ({
        time: item.time,
        count: item.followersCount,
        delta: item.followersDelta,
      })),
      favorited: aggregated.map(item => ({
        time: item.time,
        count: item.totalFavorited,
        delta: item.favoritedDelta,
      })),
      videos: aggregated.map(item => ({
        time: item.time,
        count: item.videoCount,
        delta: item.videoCountDelta,
      })),
    };
  }

  /**
   * 多账号对比
   */
  async compareAccounts(accountIds: number[]) {
    const accounts = await prisma.platformAccount.findMany({
      where: {
        id: { in: accountIds },
      },
    });

    const results = [];

    for (const account of accounts) {
      // 获取最新快照
      const latestSnapshot = await prisma.accountSnapshot.findFirst({
        where: { accountId: account.id },
        orderBy: { snapshotTime: 'desc' },
      });

      // 获取7天前快照计算增长率
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snapshot7d = await prisma.accountSnapshot.findFirst({
        where: {
          accountId: account.id,
          snapshotTime: { lte: sevenDaysAgo },
        },
        orderBy: { snapshotTime: 'desc' },
      });

      const followers7dGrowth = latestSnapshot && snapshot7d && snapshot7d.followersCount > 0
        ? ((latestSnapshot.followersCount - snapshot7d.followersCount) / snapshot7d.followersCount * 100).toFixed(2)
        : '0.00';

      results.push({
        id: account.id,
        name: account.accountName,
        platform: account.platform,
        followers: account.followersCount || 0,
        totalFavorited: account.totalFavorited || 0,
        videoCount: latestSnapshot?.videoCount || 0,
        growth7d: `${followers7dGrowth}%`,
      });
    }

    return { accounts: results };
  }

  /**
   * 获取视频表现数据
   */
  async getVideoPerformance(videoId: number) {
    const video = await prisma.accountVideo.findUnique({
      where: { id: videoId },
      include: { account: true },
    });

    if (!video) {
      throw new Error('视频不存在');
    }

    // 获取视频快照（时间线）
    const snapshots = await prisma.videoSnapshot.findMany({
      where: { videoId },
      orderBy: { snapshotTime: 'asc' },
    });

    // 计算峰值
    const playPeak = Math.max(...snapshots.map(s => s.playCount), video.playCount || 0);
    const diggPeak = Math.max(...snapshots.map(s => s.diggCount), video.diggCount || 0);

    // 计算趋势
    const playTrend = this.calculateTrend(snapshots.map(s => s.playCount));
    const diggTrend = this.calculateTrend(snapshots.map(s => s.diggCount));

    return {
      video: {
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        coverUrl: video.coverUrl,
        publishTime: video.publishTime,
        account: {
          id: video.account.id,
          name: video.account.accountName,
          platform: video.account.platform,
        },
      },
      metrics: {
        play: {
          current: video.playCount || 0,
          peak: playPeak,
          trend: playTrend,
        },
        digg: {
          current: video.diggCount || 0,
          peak: diggPeak,
          trend: diggTrend,
        },
        comment: {
          current: video.commentCount || 0,
        },
        share: {
          current: video.shareCount || 0,
        },
      },
      timeline: snapshots.map(s => ({
        time: s.snapshotTime,
        play: s.playCount,
        digg: s.diggCount,
        comment: s.commentCount,
        share: s.shareCount,
      })),
    };
  }

  /**
   * 获取视频排行榜
   */
  async getVideoRanking(options: {
    sortBy?: 'play' | 'digg' | 'comment' | 'share';
    period?: '7d' | '30d' | 'all';
    accountId?: number;
    limit?: number;
  } = {}) {
    const {
      sortBy = 'play',
      period = '30d',
      accountId,
      limit = 20,
    } = options;

    // 计算时间范围
    let publishTimeFilter: any = {};
    if (period !== 'all') {
      const days = period === '7d' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      publishTimeFilter = { gte: startDate };
    }

    // 构建查询条件
    const where: any = {
      publishTime: publishTimeFilter,
    };

    if (accountId) {
      where.platformAccountId = accountId;
    }

    // 排序字段映射
    const orderByField = {
      play: 'playCount',
      digg: 'diggCount',
      comment: 'commentCount',
      share: 'shareCount',
    }[sortBy];

    // 查询视频
    const videos = await prisma.accountVideo.findMany({
      where,
      orderBy: { [orderByField]: 'desc' },
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            accountName: true,
            platform: true,
          },
        },
      },
    });

    // 计算互动率
    const ranking = videos.map((video, index) => {
      const totalEngagement = (video.diggCount || 0) + (video.commentCount || 0) + (video.shareCount || 0);
      const engagement = video.playCount && video.playCount > 0
        ? totalEngagement / video.playCount
        : 0;

      return {
        rank: index + 1,
        video: {
          id: video.id,
          videoId: video.videoId,
          title: video.title,
          coverUrl: video.coverUrl,
          publishTime: video.publishTime,
          account: video.account,
        },
        play: video.playCount || 0,
        digg: video.diggCount || 0,
        comment: video.commentCount || 0,
        share: video.shareCount || 0,
        engagement: parseFloat(engagement.toFixed(4)),
      };
    });

    return { ranking };
  }

  /**
   * 获取发布时段热力图数据
   */
  async getPublishHeatmap(accountId?: number) {
    // 获取所有视频
    const where: any = {};
    if (accountId) {
      where.platformAccountId = accountId;
    }

    const videos = await prisma.accountVideo.findMany({
      where,
      select: {
        publishTime: true,
        playCount: true,
        diggCount: true,
      },
    });

    // 按小时和星期几分组统计
    const heatmap: { [key: string]: { count: number; totalPlay: number; totalDigg: number } } = {};

    for (const video of videos) {
      if (!video.publishTime) continue;

      const hour = video.publishTime.getHours();
      const day = video.publishTime.getDay(); // 0-6 (周日-周六)

      const key = `${day}-${hour}`;
      if (!heatmap[key]) {
        heatmap[key] = { count: 0, totalPlay: 0, totalDigg: 0 };
      }

      heatmap[key].count++;
      heatmap[key].totalPlay += video.playCount || 0;
      heatmap[key].totalDigg += video.diggCount || 0;
    }

    // 转换为数组格式
    const result = Object.keys(heatmap).map(key => {
      const [day, hour] = key.split('-').map(Number);
      const data = heatmap[key];

      return {
        hour,
        day,
        videoCount: data.count,
        avgPlay: data.count > 0 ? Math.round(data.totalPlay / data.count) : 0,
        avgDigg: data.count > 0 ? Math.round(data.totalDigg / data.count) : 0,
      };
    });

    return { heatmap: result };
  }

  /**
   * 获取最佳发布时间建议
   */
  async getBestPublishTime(accountId?: number) {
    const heatmapData = await this.getPublishHeatmap(accountId);

    // 按平均播放量排序
    const sorted = heatmapData.heatmap
      .filter(item => item.videoCount >= 3) // 至少3个视频
      .sort((a, b) => b.avgPlay - a.avgPlay)
      .slice(0, 5);

    const recommendations = sorted.map((item, index) => ({
      rank: index + 1,
      hour: item.hour,
      day: item.day,
      score: item.avgPlay > 0 ? Math.min(item.avgPlay / sorted[0].avgPlay, 1) : 0,
      avgPlay: item.avgPlay,
      avgDigg: item.avgDigg,
      videoCount: item.videoCount,
    }));

    return { recommendations };
  }

  /**
   * 获取仪表盘总览数据
   */
  async getDashboardSummary() {
    // 总账号数
    const totalAccounts = await prisma.platformAccount.count({
      where: { isActive: true },
    });

    // 总视频数
    const totalVideos = await prisma.accountVideo.count();

    // 总播放量
    const videosWithPlay = await prisma.accountVideo.findMany({
      select: { playCount: true, diggCount: true, commentCount: true },
    });

    const totalPlays = videosWithPlay.reduce((sum, v) => sum + (v.playCount || 0), 0);
    const totalDiggs = videosWithPlay.reduce((sum, v) => sum + (v.diggCount || 0), 0);
    const totalComments = videosWithPlay.reduce((sum, v) => sum + (v.commentCount || 0), 0);

    // 平均互动率
    const avgEngagement = totalPlays > 0
      ? (totalDiggs + totalComments) / totalPlays
      : 0;

    // 获取表现最好的视频（前5）
    const topPerformers = await prisma.accountVideo.findMany({
      orderBy: { playCount: 'desc' },
      take: 5,
      include: {
        account: {
          select: {
            accountName: true,
            platform: true,
          },
        },
      },
    });

    return {
      overview: {
        totalAccounts,
        totalVideos,
        totalPlays,
        avgEngagement: parseFloat(avgEngagement.toFixed(4)),
      },
      topPerformers: topPerformers.map(v => ({
        id: v.id,
        title: v.title,
        playCount: v.playCount || 0,
        diggCount: v.diggCount || 0,
        account: v.account,
      })),
    };
  }

  /**
   * 按粒度聚合数据
   */
  private aggregateByGranularity(snapshots: any[], granularity: 'hour' | 'day' | 'week') {
    if (granularity === 'hour') {
      return snapshots; // 小时级别不需要聚合
    }

    const grouped: { [key: string]: any[] } = {};

    for (const snapshot of snapshots) {
      const date = new Date(snapshot.snapshotTime);
      let key: string;

      if (granularity === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        // week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(snapshot);
    }

    // 每组取最新的快照
    return Object.keys(grouped).map(key => {
      const group = grouped[key];
      const latest = group[group.length - 1];
      return {
        time: key,
        ...latest,
      };
    });
  }

  /**
   * 计算趋势（上升/下降/持平）
   */
  private calculateTrend(values: number[]): '↗' | '↘' | '→' {
    if (values.length < 2) return '→';

    const recent = values.slice(-5); // 最近5个数据点
    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) increasing++;
      else if (recent[i] < recent[i - 1]) decreasing++;
    }

    if (increasing > decreasing) return '↗';
    if (decreasing > increasing) return '↘';
    return '→';
  }

  // ===== 用户数据分析 API =====

  /**
   * 获取账号的用户数据分析
   */
  async getUserAnalytics(accountId: number) {
    return await prisma.userAnalytics.findFirst({
      where: { accountId },
      orderBy: { updatedAt: 'desc' },
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            accountName: true,
            username: true,
            avatar: true,
            followersCount: true,
            followingCount: true,
            totalFavorited: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * 分析单个账号的用户数据
   */
  async analyzeUserData(accountId: number) {
    try {
      // 获取账号信息
      const account = await prisma.platformAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('未找到该账号');
      }

      // 获取该账号的视频数量
      const videoCount = await prisma.accountVideo.count({
        where: { platformAccountId: accountId },
      });

      // 获取该账号视频的平均播放量
      const videos = await prisma.accountVideo.findMany({
        where: { platformAccountId: accountId },
        select: { playCount: true, diggCount: true, commentCount: true, shareCount: true, collectCount: true },
      });

      // 安全计算总播放量和平均值
      let totalViews = 0;
      let validViewCount = 0;
      
      videos.forEach(v => {
        if (v.playCount !== null && v.playCount !== undefined) {
          totalViews += v.playCount;
          validViewCount++;
        }
      });
      
      const averageViews = validViewCount > 0 ? Math.round(totalViews / validViewCount) : 0;

      // 安全计算互动率
      let totalEngagement = 0;
      let validEngagementCount = 0;
      
      videos.forEach(v => {
        const digg = v.diggCount ?? 0;
        const comment = v.commentCount ?? 0;
        const share = v.shareCount ?? 0;
        const collect = v.collectCount ?? 0;
        
        if (v.playCount !== null && v.playCount !== undefined && v.playCount > 0) {
          totalEngagement += digg + comment + share + collect;
          validEngagementCount++;
        }
      });
      
      const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;

      // 安全获取历史数据计算增长率
      const previousAnalytics = await prisma.userAnalytics.findFirst({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      });

      let growthRate = 0;
      if (previousAnalytics && previousAnalytics.followerCount > 0) {
        const currentFollowers = account.followersCount ?? 0;
        const previousFollowers = previousAnalytics.followerCount;
        if (previousFollowers > 0) {
          growthRate = ((currentFollowers - previousFollowers) / previousFollowers) * 100;
        }
      }

      // 保存分析结果
      const analytics = await prisma.userAnalytics.create({
        data: {
          accountId,
          followerCount: account.followersCount ?? 0,
          followingCount: account.followingCount ?? 0,
          totalLikes: account.totalFavorited ?? 0,
          videoCount,
          averageViews,
          engagementRate: parseFloat(engagementRate.toFixed(4)),
          growthRate: parseFloat(growthRate.toFixed(2)),
        },
      });

      return analytics;
    } catch (error: any) {
      console.error(`[Analytics] 分析账号 ${accountId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量分析所有账号的用户数据
   */
  async analyzeUsersBatch() {
    const accounts = await prisma.platformAccount.findMany({
      where: { isActive: true },
    });

    const results = {
      total: accounts.length,
      success: 0,
      failed: 0,
      results: [] as any[],
    };

    for (const account of accounts) {
      try {
        await this.analyzeUserData(account.id);
        results.success++;
        results.results.push({
          accountId: account.id,
          accountName: account.accountName,
          platform: account.platform,
          success: true,
        });
      } catch (error: any) {
        console.warn(`[Analytics] 账号 ${account.accountName}(${account.id}) 分析失败:`, error.message);
        results.failed++;
        results.results.push({
          accountId: account.id,
          accountName: account.accountName,
          platform: account.platform,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 获取账号的用户数据历史记录
   */
  async getUserAnalyticsHistory(accountId: number, limit: number = 30) {
    return await prisma.userAnalytics.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            accountName: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  // ===== 视频数据分析 API =====

  /**
   * 获取视频的数据分析
   */
  async getVideoAnalytics(videoId: number) {
    return await prisma.videoAnalytics.findFirst({
      where: { videoId },
      orderBy: { updatedAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            videoId: true,
            title: true,
            coverUrl: true,
            duration: true,
            publishTime: true,
            status: true,
            account: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 分析单个视频的数据
   */
  async analyzeVideoData(videoId: number) {
    try {
      // 获取视频信息
      const video = await prisma.accountVideo.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new Error('未找到该视频');
      }

      // 安全获取视频数据
      const viewCount = video.playCount ?? 0;
      const likeCount = video.diggCount ?? 0;
      const commentCount = video.commentCount ?? 0;
      const shareCount = video.shareCount ?? 0;
      const collectCount = video.collectCount ?? 0;

      // 安全计算互动率
      const totalEngagement = likeCount + commentCount + shareCount + collectCount;
      const engagementRate = viewCount > 0 ? totalEngagement / viewCount : 0;

      // 计算完成率（如果有播放时长数据的话）
      // 这里暂时用一个默认值，实际需要根据平台API提供的数据计算
      // 不同平台可能不提供此数据，所以这里用默认值
      const completionRate = 0.75; // 假设完成率75%

      // 平均观看时长（秒）
      // 如果有 duration 字段使用真实时长，否则使用默认值
      const videoDuration = video.duration ?? 30; // 默认30秒
      const avgWatchTime = viewCount > 0
        ? Math.round(videoDuration * completionRate)
        : 0;

      // 保存分析结果
      const analytics = await prisma.videoAnalytics.create({
        data: {
          videoId,
          viewCount,
          likeCount,
          commentCount,
          shareCount,
          collectCount,
          engagementRate: parseFloat(engagementRate.toFixed(4)),
          completionRate: parseFloat(completionRate.toFixed(2)),
          avgWatchTime,
        },
      });

      return analytics;
    } catch (error: any) {
      console.error(`[Analytics] 分析视频 ${videoId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量分析指定账号的所有视频
   */
  async analyzeVideosByAccount(accountId: number) {
    const videos = await prisma.accountVideo.findMany({
      where: { platformAccountId: accountId },
    });

    if (videos.length === 0) {
      console.warn(`[Analytics] 账号 ${accountId} 没有视频数据`);
    }

    const results = {
      total: videos.length,
      success: 0,
      failed: 0,
      results: [] as any[],
    };

    for (const video of videos) {
      try {
        await this.analyzeVideoData(video.id);
        results.success++;
        results.results.push({
          videoId: video.id,
          title: video.title,
          success: true,
        });
      } catch (error: any) {
        console.warn(`[Analytics] 视频 ${video.title}(${video.id}) 分析失败:`, error.message);
        results.failed++;
        results.results.push({
          videoId: video.id,
          title: video.title,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 批量分析所有视频的数据
   */
  async analyzeVideosBatch() {
    const videos = await prisma.accountVideo.findMany();

    if (videos.length === 0) {
      console.warn('[Analytics] 系统中没有视频数据');
    }

    const results = {
      total: videos.length,
      success: 0,
      failed: 0,
      results: [] as any[],
    };

    for (const video of videos) {
      try {
        await this.analyzeVideoData(video.id);
        results.success++;
        results.results.push({
          videoId: video.id,
          title: video.title,
          success: true,
        });
      } catch (error: any) {
        console.warn(`[Analytics] 视频 ${video.title}(${video.id}) 分析失败:`, error.message);
        results.failed++;
        results.results.push({
          videoId: video.id,
          title: video.title,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 获取视频的数据历史记录
   */
  async getVideoAnalyticsHistory(videoId: number, limit: number = 30) {
    return await prisma.videoAnalytics.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        video: {
          select: {
            id: true,
            videoId: true,
            title: true,
            coverUrl: true,
            account: {
              select: {
                id: true,
                platform: true,
                accountName: true,
              },
            },
          },
        },
      },
    });
  }

  // ===== 系统概览 =====

  /**
   * 获取系统整体数据概览
   */
  async getSystemSummary() {
    try {
      // 获取账号统计
      const totalAccounts = await prisma.platformAccount.count({
        where: { isActive: true },
      });

      const accounts = await prisma.platformAccount.findMany({
        where: { isActive: true },
        select: { followersCount: true },
      });

      // 安全计算总粉丝数
      const totalFollowers = accounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0);

      // 获取视频统计
      const totalVideos = await prisma.accountVideo.count();

      const videos = await prisma.accountVideo.findMany({
        select: { playCount: true, diggCount: true, commentCount: true, shareCount: true, collectCount: true },
      });

      // 安全计算总播放量和总点赞数
      let totalViews = 0;
      let totalLikes = 0;
      let totalEngagement = 0;
      let validVideoCount = 0;

      videos.forEach(v => {
        const views = v.playCount ?? 0;
        const likes = v.diggCount ?? 0;
        const comments = v.commentCount ?? 0;
        const shares = v.shareCount ?? 0;
        const collects = v.collectCount ?? 0;

        if (views > 0) {
          totalViews += views;
          validVideoCount++;
        }
        
        totalLikes += likes;
        totalEngagement += likes + comments + shares + collects;
      });

      // 计算平均互动率
      const avgEngagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;

      return {
        totalAccounts,
        totalVideos,
        totalFollowers,
        totalViews,
        totalLikes,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(4)),
      };
    } catch (error: any) {
      console.error('[Analytics] 获取系统概览失败:', error.message);
      throw error;
    }
  }
}
