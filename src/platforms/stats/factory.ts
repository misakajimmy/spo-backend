import { IPlatformVideoStatsCollector, Platform } from '../../types';
import { DouyinVideoStatsCollector } from './douyin.stats';

export class PlatformVideoStatsFactory {
  private static collectors: Map<Platform, IPlatformVideoStatsCollector> = new Map();

  static register(platform: Platform, collector: IPlatformVideoStatsCollector): void {
    this.collectors.set(platform, collector);
  }

  static getHandler(platform: Platform): IPlatformVideoStatsCollector {
    const handler = this.collectors.get(platform);
    if (!handler) {
      throw new Error(`未找到平台 ${platform} 的视频统计采集器`);
    }
    return handler;
  }

  static isSupported(platform: Platform): boolean {
    return this.collectors.has(platform);
  }

  static getSupportedPlatforms(): Platform[] {
    return Array.from(this.collectors.keys());
  }
}

// 注册抖音视频统计采集器
PlatformVideoStatsFactory.register('douyin', new DouyinVideoStatsCollector());

