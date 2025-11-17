import { Browser, BrowserContext, Page, chromium } from 'playwright';
import * as path from 'path';
import { IUploader } from './uploader.interface';
import { UploadTaskData, UploadResult, UploadProgress } from './uploader.types';
import { ResourceService } from '../../resources/resource.service';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

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
   * 上传前的准备工作
   * 获取视频路径并填充元数据
   */
  protected async prepareUpload(task: UploadTaskData): Promise<{
    task: UploadTaskData;
    videoPath: string;
  }> {
    // 1. 获取视频文件路径（可能需要下载）
    const videoPath = await this.getResourcePath(task);
    
    // 2. 填充任务数据（从视频元数据读取标题/描述）
    const enrichedTask = await this.enrichTaskData(task, videoPath);
    
    return {
      task: enrichedTask,
      videoPath,
    };
  }
  
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
   * 清理临时文件
   */
  protected async cleanupTempFile(filePath: string): Promise<void> {
    try {
      // 只清理临时目录中的文件
      if (filePath.includes(path.join('temp', 'uploads'))) {
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
        console.log(`🗑️ 已清理临时文件: ${filePath}`);
      }
    } catch (error) {
      console.warn('⚠️ 清理临时文件失败:', error);
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
   * 对于远程资源（WebDAV等），会下载到临时目录
   */
  protected async getResourcePath(task: UploadTaskData): Promise<string> {
    const library = await ResourceService.getLibraryInstance(task.libraryId);
    const libraryConfig = await this.resourceService.getAllLibraries();
    const currentLib = libraryConfig.find(lib => lib.id === task.libraryId);
    
    // 如果是本地资源库，直接返回路径
    if (currentLib?.type === 'local') {
      return await this.resourceService.getResourceAccessPath(
        task.libraryId,
        task.resourcePath
      );
    }
    
    // 远程资源需要下载到临时目录
    const tmpDir = path.join(process.cwd(), 'temp', 'uploads');
    const fs = await import('fs/promises');
    await fs.mkdir(tmpDir, { recursive: true });
    
    const fileName = path.basename(task.resourcePath);
    const tmpFilePath = path.join(tmpDir, `${Date.now()}_${fileName}`);
    
    console.log(`📥 正在下载远程文件到临时目录: ${fileName}`);
    
    try {
      // 获取文件流
      const stream = await this.resourceService.getResourceStream(
        task.libraryId,
        task.resourcePath
      );
      
      // 写入临时文件
      const fsSync = await import('fs');
      const writeStream = fsSync.createWriteStream(tmpFilePath);
      
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });
      
      console.log(`✅ 文件已下载到: ${tmpFilePath}`);
      return tmpFilePath;
    } catch (error) {
      console.error('❌ 下载文件失败:', error);
      // 清理临时文件
      try {
        await fs.unlink(tmpFilePath);
      } catch {}
      throw error;
    }
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
  
  /**
   * 从视频文件读取元数据
   */
  protected async getVideoMetadata(videoPath: string): Promise<{
    title?: string;
    description?: string;
    artist?: string;
    comment?: string;
  }> {
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }
    
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err || !metadata || !metadata.format || !metadata.format.tags) {
          resolve({});
          return;
        }
        
        const tags = metadata.format.tags;
        
        // 尝试从不同的标签字段读取
        const title  = tags.title || tags.Title || tags.TITLE;
        const description = tags.description || tags.Description || tags.DESCRIPTION ||
                          tags.comment || tags.Comment || tags.COMMENT;
        const artist = tags.artist || tags.Artist || tags.ARTIST;
        const comment = tags.comment || tags.Comment || tags.COMMENT;
        
        resolve({
          title: String(title || '').trim() || undefined,
          description: String(description || '').trim() || String(comment || '').trim() || undefined,
          artist: String(artist || '').trim() || undefined,
          comment: String(comment || '').trim() || undefined,
        });
      });
    });
  }
  
  /**
   * 填充任务的标题和描述
   * 优先级: 用户输入 > 视频元数据 > 文件名
   */
  protected async enrichTaskData(task: UploadTaskData, videoPath: string): Promise<UploadTaskData> {
    const enrichedTask = { ...task };
    
    // 如果标题和描述都已提供，直接返回
    if (enrichedTask.title && enrichedTask.description) {
      return enrichedTask;
    }
    
    try {
      // 读取视频元数据
      const metadata = await this.getVideoMetadata(videoPath);
      
      // 如果没有标题，尝试使用元数据或文件名
      if (!enrichedTask.title || enrichedTask.title.trim() === '') {
        if (metadata.title) {
          enrichedTask.title = metadata.title;
          console.log(`📝 使用视频元数据标题: ${metadata.title}`);
        } else {
          // 使用文件名（去掉扩展名）
          const fileName = path.basename(task.resourcePath, path.extname(task.resourcePath));
          enrichedTask.title = fileName;
          console.log(`📝 使用文件名作为标题: ${fileName}`);
        }
      }
      
      // 如果没有描述，尝试使用元数据
      if (!enrichedTask.description || enrichedTask.description.trim() === '') {
        if (metadata.description) {
          enrichedTask.description = metadata.description;
          console.log(`📝 使用视频元数据描述: ${metadata.description}`);
        }
      }
      
    } catch (error) {
      console.warn('⚠️ 读取视频元数据失败，使用默认值:', error);
      
      // 出错时使用文件名作为标题
      if (!enrichedTask.title || enrichedTask.title.trim() === '') {
        const fileName = path.basename(task.resourcePath, path.extname(task.resourcePath));
        enrichedTask.title = fileName;
      }
    }
    
    return enrichedTask;
  }
}
