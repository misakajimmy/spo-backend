import { Platform } from '../types';
import { AccountModel } from '../models/account.model';
import { AccountVideoModel } from '../models/account-video.model';
import { PlaywrightService } from './playwright.service';
import { PlatformVideoStatsFactory } from '../platforms';

export class AccountStatsService {
  async updateAccountVideoStats(
    id: number,
    options?: {
      status?: number;
      limit?: number;
    }
  ) {
    const account = await AccountModel.findById(id);

    if (!account) {
      throw new Error('账号不存在');
    }

    const platform = account.platform as Platform;

    if (!PlatformVideoStatsFactory.isSupported(platform)) {
      throw new Error(`平台 ${platform} 暂不支持视频统计更新`);
    }

    const service = new PlaywrightService();

    try {
      await service.launchWithCookie(platform, account.cookiePath);
      const context = service.getContext();

      if (!context) {
        throw new Error('浏览器上下文创建失败');
      }

      const collector = PlatformVideoStatsFactory.getHandler(platform);
      const videos = await collector.fetchVideoStats(context, {
        status: options?.status,
        limit: options?.limit,
      });

      const syncResult = await AccountVideoModel.upsertVideos(account.id, videos);

      return {
        accountId: account.id,
        platform: account.platform,
        accountName: account.accountName,
        total: syncResult.total,
        created: syncResult.created,
        updated: syncResult.updated,
      };
    } finally {
      await service.closeBrowser();
    }
  }

  async updateAllAccountsVideoStats(
    options?: {
      platform?: Platform;
      status?: number;
      limitPerAccount?: number;
    }
  ) {
    const accounts = await AccountModel.findAll();

    const targetAccounts = accounts.filter((account) => {
      if (!account.isActive) {
        return false;
      }
      if (options?.platform && account.platform !== options.platform) {
        return false;
      }
      return PlatformVideoStatsFactory.isSupported(account.platform as Platform);
    });

    const results = [];
    let success = 0;
    let failed = 0;

    for (const account of targetAccounts) {
      try {
        console.log(`📊 正在同步账号视频数据: ${account.accountName} (${account.platform})`);
        const result = await this.updateAccountVideoStats(account.id, {
          status: options?.status,
          limit: options?.limitPerAccount,
        });
        success += 1;
        results.push({
          ...result,
          status: 'success',
        });
      } catch (error: any) {
        failed += 1;
        console.error(`❌ 同步账号 ${account.accountName} 视频数据失败:`, error?.message ?? error);
        results.push({
          accountId: account.id,
          platform: account.platform,
          accountName: account.accountName,
          status: 'failed',
          error: error?.message ?? '未知错误',
        });
      }
    }

    return {
      total: targetAccounts.length,
      success,
      failed,
      results,
    };
  }

  async getAccountVideos(accountId: number) {
    const account = await AccountModel.findById(accountId);

    if (!account) {
      throw new Error('账号不存在');
    }

    const videos = await AccountVideoModel.findVideosByAccount(accountId);

    return {
      accountId: account.id,
      platform: account.platform,
      accountName: account.accountName,
      total: videos.length,
      videos,
    };
  }
}

