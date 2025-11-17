import cron from 'node-cron';
import { appConfig } from '../config/loader';
import { PrismaClient } from '@prisma/client';
import { SnapshotService } from './snapshot.service';
import { StatisticsService } from './statistics.service';

const prisma = new PrismaClient();
const snapshotService = new SnapshotService();
const statisticsService = new StatisticsService();

/**
 * 定时任务管理器
 */
export class CronJobManager {
  private static instance: CronJobManager;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  
  private constructor() {}
  
  static getInstance(): CronJobManager {
    if (!CronJobManager.instance) {
      CronJobManager.instance = new CronJobManager();
    }
    return CronJobManager.instance;
  }
  
  /**
   * 初始化所有定时任务
   */
  async initializeJobs(): Promise<void> {
    if (!appConfig.features.enableCronJobs) {
      console.log('⏸️  定时任务功能已禁用');
      return;
    }
    
    console.log('⏰ 初始化定时任务...');
    
    // 更新视频统计
    if (appConfig.accounts.updateVideoStats.enabled) {
      this.scheduleJob(
        'updateVideoStats',
        appConfig.accounts.updateVideoStats.cron,
        () => this.updateVideoStats()
      );
      console.log(`✅ 已启用: ${appConfig.accounts.updateVideoStats.comment}`);
      console.log(`   Cron: ${appConfig.accounts.updateVideoStats.cron}`);
    }
    
    // Cookie刷新
    if (appConfig.accounts.refreshCookies.enabled) {
      this.scheduleJob(
        'refreshCookies',
        appConfig.accounts.refreshCookies.cron,
        () => this.refreshCookies()
      );
      console.log(`✅ 已启用: ${appConfig.accounts.refreshCookies.comment}`);
      console.log(`   Cron: ${appConfig.accounts.refreshCookies.cron}`);
    }
    
    // 创建数据快照
    if (appConfig.accounts.createSnapshots.enabled) {
      this.scheduleJob(
        'createSnapshots',
        appConfig.accounts.createSnapshots.cron,
        () => this.createSnapshots()
      );
      console.log(`✅ 已启用: ${appConfig.accounts.createSnapshots.comment}`);
      console.log(`   Cron: ${appConfig.accounts.createSnapshots.cron}`);
    }
    
    // 计算汇总数据
    if (appConfig.accounts.calculateSummary.enabled) {
      this.scheduleJob(
        'calculateSummary',
        appConfig.accounts.calculateSummary.cron,
        () => this.calculateSummary()
      );
      console.log(`✅ 已启用: ${appConfig.accounts.calculateSummary.comment}`);
      console.log(`   Cron: ${appConfig.accounts.calculateSummary.cron}`);
    }
    
    console.log('');
  }
  
  /**
   * 调度任务
   */
  private scheduleJob(
    name: string,
    cronExpression: string,
    task: () => void | Promise<void>
  ): void {
    // 验证 cron 表达式
    if (!cron.validate(cronExpression)) {
      console.error(`❌ 无效的 cron 表达式: ${cronExpression} (任务: ${name})`);
      return;
    }
    
    // 停止已存在的任务
    if (this.jobs.has(name)) {
      this.jobs.get(name)?.stop();
    }
    
    // 创建新任务
    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ [${new Date().toISOString()}] 执行定时任务: ${name}`);
      try {
        await task();
        console.log(`✅ 任务完成: ${name}\n`);
      } catch (error) {
        console.error(`❌ 任务失败: ${name}`, error);
        console.log('');
      }
    });
    
    this.jobs.set(name, job);
  }
  
  /**
   * 更新视频统计数据
   */
  private async updateVideoStats(): Promise<void> {
    console.log('📊 开始更新视频统计数据...');
    
    try {
      // 获取所有活跃账号
      const accounts = await prisma.platformAccount.findMany({
        where: {
          isActive: true,
        },
      });
      
      console.log(`找到 ${accounts.length} 个活跃账号`);
      
      // TODO: 实现各平台的视频统计更新逻辑
      // 这里需要根据平台调用对应的API获取视频数据
      
      for (const account of accounts) {
        try {
          console.log(`  更新账号: ${account.accountName} (${account.platform})`);
          
          // 根据平台调用不同的更新逻辑
          switch (account.platform) {
            case 'douyin':
              // await this.updateDouyinStats(account);
              console.log(`    抖音账号暂未实现`);
              break;
            // 其他平台...
          }
        } catch (error) {
          console.error(`  ❌ 账号更新失败: ${account.accountName}`, error);
        }
      }
      
      console.log('✅ 视频统计数据更新完成');
    } catch (error) {
      console.error('❌ 更新视频统计失败:', error);
      throw error;
    }
  }
  
  /**
   * 刷新 Cookie
   */
  private async refreshCookies(): Promise<void> {
    console.log('🍪 开始刷新 Cookie...');
    
    try {
      // 获取所有活跃账号
      const accounts = await prisma.platformAccount.findMany({
        where: {
          isActive: true,
        },
      });
      
      console.log(`找到 ${accounts.length} 个活跃账号`);
      
      // TODO: 实现 Cookie 刷新逻辑
      // 可能需要模拟登录或调用特定接口
      
      for (const account of accounts) {
        try {
          console.log(`  刷新账号: ${account.accountName} (${account.platform})`);
          
          // 根据平台调用不同的刷新逻辑
          // await refreshAccountCookie(account);
          console.log(`    Cookie刷新暂未实现`);
        } catch (error) {
          console.error(`  ❌ 账号Cookie刷新失败: ${account.accountName}`, error);
        }
      }
      
      console.log('✅ Cookie 刷新完成');
    } catch (error) {
      console.error('❌ Cookie 刷新失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建数据快照
   */
  private async createSnapshots(): Promise<void> {
    console.log('📸 开始创建数据快照...');
    
    try {
      // 创建账号快照
      await snapshotService.createAccountSnapshots();
      
      // 创建视频快照
      await snapshotService.createVideoSnapshots();
      
      // 清理旧快照（每天执行一次）
      const now = new Date();
      if (now.getHours() === 1) {
        await snapshotService.cleanupOldSnapshots();
      }
      
      console.log('✅ 数据快照创建完成');
    } catch (error) {
      console.error('❌ 创建数据快照失败:', error);
      throw error;
    }
  }
  
  /**
   * 计算汇总数据
   */
  private async calculateSummary(): Promise<void> {
    console.log('📊 开始计算汇总数据...');
    
    try {
      // 计算昨天的每日汇总
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await statisticsService.calculateDailySummary(yesterday);
      
      // 如果是周一，计算上周的每周汇总
      const now = new Date();
      if (now.getDay() === 1) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        await statisticsService.calculateWeeklySummary(lastWeek);
      }
      
      // 如果是月初，计算上月的每月汇总
      if (now.getDate() === 1) {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        await statisticsService.calculateMonthlySummary(lastMonth);
      }
      
      console.log('✅ 汇总数据计算完成');
    } catch (error) {
      console.error('❌ 计算汇总数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止指定任务
   */
  stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      console.log(`⏹️  已停止任务: ${name}`);
    }
  }
  
  /**
   * 停止所有任务
   */
  stopAll(): void {
    console.log('⏹️  停止所有定时任务...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  已停止: ${name}`);
    });
    this.jobs.clear();
  }
  
  /**
   * 获取所有任务状态
   */
  getJobsStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = [];
    this.jobs.forEach((job, name) => {
      // node-cron 没有直接的 isRunning 方法，所以假设所有在 map 中的都在运行
      status.push({ name, running: true });
    });
    return status;
  }
}

// 导出单例
export const cronJobManager = CronJobManager.getInstance();
