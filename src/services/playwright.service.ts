import { chromium, Browser, BrowserContext } from 'playwright';
import { Platform, OriginData } from '../types';
import { PlatformRegistry, PlatformLoginFactory } from '../platforms';
import { CookieStorageService } from './cookie.storage';

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  // 启动浏览器供用户登录（使用工厂模式）
  async launchForLogin(platform: Platform): Promise<BrowserContext> {
    // 检查平台是否已注册
    if (!PlatformRegistry.isRegistered(platform)) {
      throw new Error(`平台 ${platform} 未注册`);
    }

    // 检查平台是否启用
    if (!PlatformRegistry.isEnabled(platform)) {
      throw new Error(`平台 ${platform} 未启用`);
    }

    // 检查是否支持该平台的登录
    if (!PlatformLoginFactory.isSupported(platform)) {
      throw new Error(`平台 ${platform} 暂不支持登录功能`);
    }

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    this.context = await this.browser.newContext({
      viewport: null,
    });

    // 获取平台登录器
    const loginHandler = PlatformLoginFactory.getHandler(platform);
    
    // 打开登录页面
    await loginHandler.openLoginPage(this.context);

    const config = PlatformRegistry.getConfig(platform);
    console.log(`\n⏸️  浏览器已打开，请在浏览器中完成登录`);
    console.log(`   平台: ${config?.name || platform}`);

    return this.context;
  }

  // 保存登录信息（使用新的存储结构）
  async saveLoginData(platform: Platform, accountId?: string): Promise<string> {
    if (!this.context) {
      throw new Error('浏览器上下文不存在');
    }

    // 获取登录器
    const loginHandler = PlatformLoginFactory.getHandler(platform);
    
    // 获取 Cookies
    const cookies = await loginHandler.getCookies(this.context);
    
    // 获取 localStorage（如果登录器支持）
    let origins: OriginData[] = [];
    if (loginHandler.getLocalStorage) {
      try {
        origins = await loginHandler.getLocalStorage(this.context);
      } catch (error) {
        console.warn('⚠️ 获取 localStorage 失败:', error);
      }
    }

    // 保存到文件
    const filePath = CookieStorageService.saveCookieFile(
      platform,
      accountId,
      cookies,
      origins
    );

    return filePath;
  }

  // 关闭浏览器
  async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // 获取当前上下文
  getContext(): BrowserContext | null {
    return this.context;
  }

  // 使用已保存的 Cookie 启动浏览器
  async launchWithCookie(platform: Platform, cookiePath: string): Promise<BrowserContext> {
    // 读取 Cookie 文件
    const cookieData = CookieStorageService.readCookieFile(cookiePath);
    if (!cookieData) {
      throw new Error('Cookie 文件读取失败');
    }

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: true,  // 无头模式
    });

    this.context = await this.browser.newContext();

    // 设置 Cookies
    if (cookieData.cookies && cookieData.cookies.length > 0) {
      await this.context.addCookies(cookieData.cookies);
    }

    // 设置 localStorage
    if (cookieData.origins && cookieData.origins.length > 0) {
      for (const originData of cookieData.origins) {
        const page = await this.context.newPage();
        await page.goto(originData.origin);
        
        // 注入 localStorage
        for (const item of originData.localStorage) {
          await page.evaluate(({key, value}) => {
            // @ts-ignore
            localStorage.setItem(key, value);
          }, { key: item.name, value: item.value });
        }
        
        await page.close();
      }
    }

    return this.context;
  }

  // 获取账号信息
  async getAccountInfo(platform: Platform) {
    if (!this.context) {
      throw new Error('浏览器上下文不存在');
    }

    // 获取登录器
    const loginHandler = PlatformLoginFactory.getHandler(platform);
    
    // 获取账号信息
    return await loginHandler.getAccountInfo(this.context);
  }
}
