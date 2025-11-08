import { chromium } from 'playwright';
import { Platform, CookieValidation } from '../types';
import { PlatformRegistry, PlatformLoginFactory } from '../platforms';
import { CookieStorageService } from './cookie.storage';

export class CookieValidator {
  // 验证 Cookie 是否有效
  static async validate(platform: Platform, cookiePath: string): Promise<CookieValidation> {
    // 检查文件是否有效
    if (!CookieStorageService.isCookieFileValid(cookiePath)) {
      return {
        isValid: false,
        message: 'Cookie 文件不存在或无效',
      };
    }

    // 检查平台是否支持
    if (!PlatformLoginFactory.isSupported(platform)) {
      return {
        isValid: false,
        message: `平台 ${platform} 暂不支持 Cookie 验证`,
      };
    }

    try {
      // 读取 Cookie 数据
      const cookieData = CookieStorageService.readCookieFile(cookiePath);
      
      if (!cookieData) {
        return {
          isValid: false,
          message: 'Cookie 数据读取失败',
        };
      }

      // 启动无头浏览器验证
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      await context.addCookies(cookieData.cookies);

      // 如果有 localStorage 数据，也需要注入
      // TODO: 实现 localStorage 注入逻辑

      const config = PlatformRegistry.getConfig(platform);
      const page = await context.newPage();
      const uploadUrl = config?.uploadUrl || config?.loginUrl;

      if (!uploadUrl) {
        await context.close();
        await browser.close();
        return {
          isValid: false,
          message: '平台配置错误',
        };
      }

      await page.goto(uploadUrl, { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // 使用工厂模式获取登录检查器
      const loginHandler = PlatformLoginFactory.getHandler(platform);
      const isLoggedIn = await loginHandler.checkLoginStatus(context);

      if (!isLoggedIn) {
        return {
          isValid: false,
          message: 'Cookie 已失效，需要重新登录',
        };
      }

      // 尝试获取账号信息
      const accountInfo = await loginHandler.getAccountInfo(context);

      await context.close();
      await browser.close();

      return {
        isValid: true,
        message: 'Cookie 有效',
        accountInfo,
      };
    } catch (error: any) {
      return {
        isValid: false,
        message: `验证失败: ${error.message}`,
      };
    }
  }
}
