import { AccountModel } from '../models/account.model';
import { PlaywrightService } from './playwright.service';
import { CookieValidator } from './cookie.validator';
import { CookieStorageService } from './cookie.storage';
import { Platform } from '../types';
import { PlatformAccount } from '@prisma/client';

export class AccountService {
  private static activeSessions: Map<string, PlaywrightService> = new Map();

  // 获取所有账号
  async getAllAccounts(): Promise<PlatformAccount[]> {
    return await AccountModel.findAll();
  }

  // 根据 ID 获取账号
  async getAccountById(id: number): Promise<PlatformAccount | null> {
    return await AccountModel.findById(id);
  }

  // 根据平台获取账号
  async getAccountsByPlatform(platform: Platform): Promise<PlatformAccount[]> {
    return await AccountModel.findByPlatform(platform);
  }

  // 创建新账号（第一步：打开浏览器）
  async startLogin(platform: Platform, accountName: string): Promise<string> {
    const sessionId = `${platform}_${Date.now()}`;
    const service = new PlaywrightService();
    
    await service.launchForLogin(platform);
    
    // 保存会话
    AccountService.activeSessions.set(sessionId, service);
    
    return sessionId;
  }

  // 完成登录并保存账号（第二步：保存 Cookie）
  async finishLogin(sessionId: string, platform: Platform, accountName: string): Promise<number> {
    const service = AccountService.activeSessions.get(sessionId);
    
    if (!service) {
      throw new Error('登录会话不存在或已过期');
    }

    try {
      // 保存登录数据（使用 UUID 文件名）
      const cookiePath = await service.saveLoginData(platform);

      // 关闭浏览器
      await service.closeBrowser();

      // 创建账号记录
      const account = await AccountModel.create({
        platform,
        accountName,
        cookiePath,
        isActive: true,
      });

      // 清理会话
      AccountService.activeSessions.delete(sessionId);

      return account.id;
    } catch (error) {
      // 清理会话
      await service.closeBrowser();
      AccountService.activeSessions.delete(sessionId);
      throw error;
    }
  }

  // 取消登录
  async cancelLogin(sessionId: string): Promise<void> {
    const service = AccountService.activeSessions.get(sessionId);
    
    if (service) {
      await service.closeBrowser();
      AccountService.activeSessions.delete(sessionId);
    }
  }

  // 更新账号
  async updateAccount(id: number, updates: Partial<PlatformAccount>): Promise<PlatformAccount> {
    return await AccountModel.update(id, updates);
  }

  // 删除账号（同时删除 Cookie 文件）
  async deleteAccount(id: number): Promise<boolean> {
    const account = await AccountModel.findById(id);
    
    if (!account) {
      return false;
    }

    // 删除 Cookie 文件
    CookieStorageService.deleteCookieFile(account.cookiePath);

    // 删除数据库记录
    await AccountModel.delete(id);
    return true;
  }

  // 验证账号 Cookie
  async validateAccount(id: number) {
    const account = await AccountModel.findById(id);
    
    if (!account) {
      throw new Error('账号不存在');
    }

    return await CookieValidator.validate(account.platform as Platform, account.cookiePath);
  }

  // 刷新账号 Cookie（重新登录）
  async refreshAccount(id: number): Promise<string> {
    const account = await AccountModel.findById(id);
    
    if (!account) {
      throw new Error('账号不存在');
    }

    // 返回 sessionId，让前端引导用户重新登录
    return await this.startLogin(account.platform as Platform, account.accountName);
  }

  // 获取账号的 Cookie 文件详情
  async getAccountCookieDetails(id: number) {
    const account = await AccountModel.findById(id);
    
    if (!account) {
      throw new Error('账号不存在');
    }

    const cookieData = CookieStorageService.readCookieFile(account.cookiePath);
    
    if (!cookieData) {
      throw new Error('Cookie 文件读取失败');
    }

    return {
      platform: cookieData.platform,
      accountId: cookieData.id,
      cookiesCount: cookieData.cookies.length,
      originsCount: cookieData.origins.length,
      filePath: account.cookiePath,
    };
  }

  // 更新单个账号的信息
  async updateAccountInfo(id: number) {
    const account = await AccountModel.findById(id);
    
    if (!account) {
      throw new Error('账号不存在');
    }

    const service = new PlaywrightService();
    
    try {
      // 使用已保存的 Cookie 启动浏览器
      await service.launchWithCookie(account.platform as Platform, account.cookiePath);
      
      // 获取账号信息
      const accountInfo = await service.getAccountInfo(account.platform as Platform);
      
      // 更新数据库
      const updated = await AccountModel.update(id, {
        userId: accountInfo.userId || account.userId,
        username: accountInfo.username || account.username,
        avatar: accountInfo.avatar || account.avatar,
        followersCount: accountInfo.followersCount ?? account.followersCount,
        totalFavorited: accountInfo.totalFavorited ?? account.totalFavorited,
        description: accountInfo.description || account.description,
      });
      
      await service.closeBrowser();
      
      return {
        account: updated,
        info: accountInfo,
        message: `更新成功: ${accountInfo.username || account.accountName}`,
      };
    } catch (error) {
      await service.closeBrowser();
      throw error;
    }
  }

  // 更新所有账号的信息
  async updateAllAccountsInfo() {
    const accounts = await AccountModel.findAll();
    const results = [];
    
    for (const account of accounts) {
      try {
        console.log(`🔄 正在更新账号: ${account.accountName} (${account.platform})`);
        const result = await this.updateAccountInfo(account.id);
        results.push({
          id: account.id,
          accountName: account.accountName,
          platform: account.platform,
          status: 'success',
          ...result,
        });
      } catch (error: any) {
        console.error(`❌ 更新账号 ${account.accountName} 失败:`, error.message);
        results.push({
          id: account.id,
          accountName: account.accountName,
          platform: account.platform,
          status: 'failed',
          error: error.message,
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    return {
      total: accounts.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }
}
