import { BrowserContext, Cookie } from 'playwright';
import { IPlatformLogin, Platform } from '../../types';

// B站登录器
export class BilibiliLogin implements IPlatformLogin {
  platform: Platform = 'bilibili';

  async openLoginPage(context: BrowserContext): Promise<void> {
    const page = await context.newPage();
    await page.goto('https://www.bilibili.com/');
    console.log('✅ B站登录页面已打开');
  }

  async checkLoginStatus(context: BrowserContext): Promise<boolean> {
    // TODO: 实现登录状态检查逻辑
    const page = context.pages()[0];
    if (!page) return false;

    try {
      const url = page.url();
      return !url.includes('login');
    } catch (error) {
      return false;
    }
  }

  async getAccountInfo(context: BrowserContext): Promise<{ userId?: string; username?: string }> {
    // TODO: 实现获取账号信息逻辑
    return {
      userId: undefined,
      username: undefined,
    };
  }

  async getCookies(context: BrowserContext): Promise<Cookie[]> {
    // TODO: 实现获取特定 Cookie 的逻辑
    return await context.cookies();
  }
}
