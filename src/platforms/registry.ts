import { Platform, PlatformConfig } from '../types';

// 平台配置注册表
export class PlatformRegistry {
  private static platforms: Map<Platform, PlatformConfig> = new Map();

  // 注册平台
  static register(platform: Platform, config: PlatformConfig): void {
    this.platforms.set(platform, config);
  }

  // 获取平台配置
  static getConfig(platform: Platform): PlatformConfig | undefined {
    return this.platforms.get(platform);
  }

  // 获取所有已注册平台
  static getAllPlatforms(): Platform[] {
    return Array.from(this.platforms.keys());
  }

  // 获取所有启用的平台
  static getEnabledPlatforms(): Platform[] {
    return Array.from(this.platforms.entries())
      .filter(([_, config]) => config.enabled)
      .map(([platform, _]) => platform);
  }

  // 检查平台是否已注册
  static isRegistered(platform: Platform): boolean {
    return this.platforms.has(platform);
  }

  // 检查平台是否启用
  static isEnabled(platform: Platform): boolean {
    const config = this.platforms.get(platform);
    return config?.enabled ?? false;
  }
}

// 只初始化抖音平台配置
PlatformRegistry.register('douyin', {
  name: '抖音',
  loginUrl: 'https://creator.douyin.com/',
  uploadUrl: 'https://creator.douyin.com/creator-micro/content/upload',
  enabled: true,
});

// 其他平台暂时禁用（保留配置，但不启用）
PlatformRegistry.register('bilibili', {
  name: 'B站',
  loginUrl: 'https://www.bilibili.com/',
  uploadUrl: 'https://member.bilibili.com/platform/upload/video/frame',
  enabled: false,
});

PlatformRegistry.register('xiaohongshu', {
  name: '小红书',
  loginUrl: 'https://creator.xiaohongshu.com/',
  uploadUrl: 'https://creator.xiaohongshu.com/publish/publish',
  enabled: false,
});

PlatformRegistry.register('kuaishou', {
  name: '快手',
  loginUrl: 'https://cp.kuaishou.com/',
  uploadUrl: 'https://cp.kuaishou.com/article/publish/video',
  enabled: false,
});

PlatformRegistry.register('tencent', {
  name: '视频号',
  loginUrl: 'https://channels.weixin.qq.com/',
  uploadUrl: 'https://channels.weixin.qq.com/platform/post/create',
  enabled: false,
});

PlatformRegistry.register('tiktok', {
  name: 'TikTok',
  loginUrl: 'https://www.tiktok.com/',
  uploadUrl: 'https://www.tiktok.com/creator-center/upload',
  enabled: false,
});
