import { BrowserContext, Cookie } from 'playwright';

// 平台类型
export type Platform = 
  | 'douyin'      // 抖音
  | 'bilibili'    // B站
  | 'xiaohongshu' // 小红书
  | 'kuaishou'    // 快手
  | 'tencent'     // 视频号
  | 'tiktok';     // TikTok

// 平台配置接口
export interface PlatformConfig {
  name: string;
  loginUrl: string;
  uploadUrl?: string;
  enabled: boolean;
}

// localStorage 数据结构
export interface LocalStorageItem {
  name: string;
  value: string;
}

// origin 数据结构
export interface OriginData {
  origin: string;
  localStorage: LocalStorageItem[];
}

// Cookie 文件存储结构
export interface CookieFileData {
  platform: string;
  id: string;  // 平台账号ID
  cookies: Cookie[];
  origins: OriginData[];
}

// 平台账号信息接口
export interface PlatformAccountInfo {
  userId?: string;      // 用户ID
  username?: string;    // 用户名/昵称
  avatar?: string;      // 头像URL
  followersCount?: number;  // 粉丝数
  totalFavorited?: number;  // 获赞数
  description?: string;  // 简介
}

// 平台登录器接口
export interface IPlatformLogin {
  platform: Platform;
  
  // 打开登录页面
  openLoginPage(context: BrowserContext): Promise<void>;
  
  // 检查是否已登录
  checkLoginStatus(context: BrowserContext): Promise<boolean>;
  
  // 获取登录后的账号信息
  getAccountInfo(context: BrowserContext): Promise<PlatformAccountInfo>;
  
  // 获取登录后的所有 Cookies
  getCookies(context: BrowserContext): Promise<Cookie[]>;
  
  // 获取 localStorage 数据（可选实现）
  getLocalStorage?(context: BrowserContext): Promise<OriginData[]>;
}

// 平台上传器接口（未来扩展）
export interface IPlatformUpload {
  platform: Platform;
  
  // 上传视频
  uploadVideo(videoPath: string, options: any): Promise<void>;
}

// Cookie 验证结果
export interface CookieValidation {
  isValid: boolean;
  message: string;
  accountInfo?: PlatformAccountInfo;
}

// API 响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 平台账号接口（基于 Prisma 生成的类型）
export interface PlatformAccount {
  id: number;
  platform: string;
  accountName: string;
  accountId: string | null;
  cookiePath: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 全局配置接口
export interface GlobalConfig {
  cookiesStoragePath: string;  // Cookies 存储根目录
  enableAutoValidation: boolean;  // 是否启用自动验证
  validationInterval: number;  // 验证间隔（分钟）
}
