import { Browser, BrowserContext, Page, chromium } from 'playwright';
import * as path from 'path';
import { IUploader } from './uploader.interface';
import { UploadTaskData, UploadResult, UploadProgress } from './uploader.types';
import { ResourceService } from '../../resources/resource.service';

/**
 * 基础上传器抽象类
 * 提供通用的浏览器操作和上传流程
 */
export abstract class BaseUploader implements IUploader {
  protected platform: string;
  protected accountFile: string;
  protected browser?: Browser;
  protected context?: BrowserContext;
  protected page?: Page;
  protected resourceService: ResourceService;
  
  // 上传进度
  protected progress: UploadProgress = {
    status: 'pending',
    percentage: 0,
    message: '等待开始'
  };
  
  // 是否已取消
  protected isCancelled = false;
  
  constructor(platform: string, accountFile: string) {
    this.platform = platform;
    this.accountFile = accountFile;
    this.resourceService = new ResourceService();
  }
  
  /**
   * 抽象方法 - 子类必须实现
   */
  abstract validateCookie(): Promise<boolean>;
  abstract upload(task: UploadTaskData): Promise<UploadResult>;
  
  /**
   * 初始化浏览器
   * @param headless 是否无头模式
   */
  protected async initBrowser(headless: boolean = false): Promise<void> {
    try {
      // 启动浏览器
      this.browser = await chromium.launch({
        headless,
        // 可以配置其他选项,如指定 Chrome 路径等
      });
      
      // 创建浏览器上下文,加载 Cookie
      this.context = await this.browser.newContext({
        storageState: this.accountFile
      });
      
      // 设置初始化脚本(反检测)
      await this.setInitScript();
      
      // 创建新页面
      this.page = await this.context.newPage();
      
      console.log(`✅ 浏览器初始化成功: ${this.platform}`);
    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 关闭浏览器
   */
  protected async closeBrowser(): Promise<void> {
    try {
      if (this.context) {
        // 保存 Cookie 状态
        await this.context.storageState({ path: this.accountFile });
        await this.context.close();
      }
      
      if (this.browser) {
        await this.browser.close();
      }
      
      console.log('✅ 浏览器已关闭');
    } catch (error) {
      console.error('❌ 关闭浏览器失败:', error);
    }
  }
  
  /**
   * 设置初始化脚本(反检测)
   */
  protected async setInitScript(): Promise<void> {
    if (!this.context) return;
    
    // 添加初始化脚本,隐藏 webdriver 特征
    await this.context.addInitScript(() => {
      // 重写 navigator.webdriver
      // @ts-ignore
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // 重写 Chrome 相关属性
      // @ts-ignore
      (window as any).chrome = {
        runtime: {},
      };
      
      // 重写 permissions
      // @ts-ignore
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          // @ts-ignore
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });
  }
  
  /**
   * 获取资源文件的完整路径
   */
  protected async getResourcePath(task: UploadTaskData): Promise<string> {
    return await this.resourceService.getResourceAccessPath(
      task.libraryId,
      task.resourcePath
    );
  }
  
  /**
   * 等待页面跳转
   */
  protected async waitForNavigation(url: string, timeout: number = 30000): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    
    await this.page.waitForURL(url, { timeout });
  }
  
  /**
   * 更新上传进度
   */
  protected updateProgress(
    status: UploadProgress['status'],
    percentage: number,
    message: string
  ): void {
    this.progress = {
      status,
      percentage,
      message,
      uploadedAt: status === 'success' || status === 'failed' ? new Date() : undefined
    };
    
    console.log(`📊 上传进度: ${percentage}% - ${message}`);
  }
  
  /**
   * 获取上传进度
   */
  getProgress(): UploadProgress {
    return { ...this.progress };
  }
  
  /**
   * 取消上传
   */
  async cancel(): Promise<void> {
    this.isCancelled = true;
    this.updateProgress('failed', this.progress.percentage, '上传已取消');
    await this.closeBrowser();
  }
  
  /**
   * 检查是否已取消
   */
  protected checkCancelled(): void {
    if (this.isCancelled) {
      throw new Error('Upload cancelled');
    }
  }
  
  /**
   * 延迟函数
   */
  protected async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
