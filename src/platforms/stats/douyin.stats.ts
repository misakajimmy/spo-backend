import { BrowserContext } from 'playwright';
import { IPlatformVideoStatsCollector, Platform, PlatformVideoData, PlatformVideoMetrics } from '../../types';

const DOUYIN_CREATOR_MANAGE_URL = 'https://creator.douyin.com/creator-micro/content/manage';
const DOUYIN_WORK_LIST_API = 'https://creator.douyin.com/janus/douyin/creator/pc/work_list';

interface DouyinWorkListResponse {
  status_code?: number;
  statusCode?: number;
  message?: string;
  has_more?: number | boolean;
  data?: {
    has_more?: number | boolean;
    max_cursor?: number;
    aweme_list?: any[];
  };
  max_cursor?: number;
  aweme_list?: any[];
}

// 抖音视频统计采集器
export class DouyinVideoStatsCollector implements IPlatformVideoStatsCollector {
  platform: Platform = 'douyin';

  async fetchVideoStats(
    context: BrowserContext,
    options?: {
      status?: number;
      maxCursor?: number;
      limit?: number;
    }
  ): Promise<PlatformVideoData[]> {
    const page = await context.newPage();
    try {
      // 确保页面处于正确的域名下，获取到合法的请求上下文
      await page.goto(DOUYIN_CREATOR_MANAGE_URL, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });

      const status = options?.status ?? 0;
      let cursor = options?.maxCursor ?? 0;
      let hasMore = true;
      const limit = options?.limit ?? Infinity;

      const resultMap: Map<string, PlatformVideoData> = new Map();
      const uniqueLimit = limit === Infinity ? Infinity : Math.max(limit, 0);
      let reachedLimit = false;

      while (hasMore && !reachedLimit) {
        const params = new URLSearchParams({
          status: status.toString(),
          count: '20',
          max_cursor: cursor.toString(),
          scene: 'star_atlas',
          device_platform: 'android',
          aid: '1128',
        });

        const response = await page.request.get(`${DOUYIN_WORK_LIST_API}?${params.toString()}`, {
          headers: {
            referer: DOUYIN_CREATOR_MANAGE_URL,
          },
        });

        if (!response.ok()) {
          throw new Error(`抖音作品列表接口请求失败: ${response.status()} ${response.statusText()}`);
        }

        const data: DouyinWorkListResponse & { items?: any[] } = await response.json();

        const awemeList =
          data?.data?.aweme_list ??
          data?.aweme_list ??
          [];
        const itemsList = Array.isArray(data?.items) ? data.items : [];

        if (!Array.isArray(awemeList)) {
          throw new Error('抖音作品列表接口返回数据异常: aweme_list 不存在或格式错误');
        }

        const mergedList = [...awemeList, ...itemsList];

        for (const item of awemeList) {
          const mapped = this.mapVideoData(item);
          if (mapped && mapped.videoId) {
            if (!resultMap.has(mapped.videoId)) {
              resultMap.set(mapped.videoId, mapped);
            } else {
              const existing = resultMap.get(mapped.videoId)!;
              resultMap.set(mapped.videoId, this.mergeVideoData(existing, mapped));
            }
          }

          if (uniqueLimit !== Infinity && resultMap.size >= uniqueLimit) {
            reachedLimit = true;
            break;
          }
        }

        if (!reachedLimit) {

          console.log(itemsList.length)
          for (const item of itemsList) {
            const mapped = this.mapVideoData(item);
            if (mapped && mapped.videoId) {
              if (!resultMap.has(mapped.videoId)) {
                resultMap.set(mapped.videoId, mapped);
              } else {
                const existing = resultMap.get(mapped.videoId)!;
                resultMap.set(mapped.videoId, this.mergeVideoData(existing, mapped));
              }
            }

            if (uniqueLimit !== Infinity && resultMap.size >= uniqueLimit) {
              reachedLimit = true;
              break;
            }
          }
        }

        const nextCursor = data?.data?.max_cursor ?? data?.max_cursor;
        const nextHasMore = data?.data?.has_more ?? data?.has_more;

        if (typeof nextCursor === 'number') {
          cursor = nextCursor;
        } else {
          cursor = 0;
        }

        if (typeof nextHasMore === 'boolean') {
          hasMore = nextHasMore;
        } else if (typeof nextHasMore === 'number') {
          hasMore = nextHasMore === 1;
        } else {
          hasMore = false;
        }
        console.log(`抖音视频统计采集进度: hasMore=${hasMore}, cursor=${cursor}, collected=${resultMap.size}`);
      }

      const resultArray = Array.from(resultMap.values());
      console.log(resultArray.length);
      resultArray.sort((a, b) => {
        const timeA = a.publishTime ? a.publishTime.getTime() : 0;
        const timeB = b.publishTime ? b.publishTime.getTime() : 0;
        return timeB - timeA;
      });

      if (uniqueLimit !== Infinity) {
        return resultArray.slice(0, uniqueLimit);
      }

      return resultArray;
    } finally {
      await page.close();
    }
  }

  private mapVideoData(item: any): PlatformVideoData | null {
    if (!item) {
      return null;
    }

    const videoId =
      item.item_id ??
      item.id ??
      item.aweme_id ??
      item.video_id ??
      item.group_id;

    if (!videoId) {
      return null;
    }

    const publishTimestamp =
      item.create_time ??
      item.publish_time ??
      item.aweme_publish_time ??
      item.timer?.public_time ??
      item.publish_time_sec ??
      item.create_time_sec;
    const publishDate = this.normalizeTimestamp(publishTimestamp);

    const durationMs =
      item.video?.duration ??
      item.video?.meta?.duration ??
      item.duration ??
      item.video_info?.duration;
    const durationSeconds = this.normalizeDuration(durationMs);

    const coverUrl =
      this.pickFirstUrl(item.video?.cover?.url_list) ??
      this.pickFirstUrl(item.video?.origin_cover?.url_list) ??
      this.pickFirstUrl(item.video?.dynamic_cover?.url_list) ??
      this.pickFirstUrl(item.Cover?.url_list) ??
      this.pickFirstUrl(item.cover?.url_list) ??
      item.video?.cover?.url ??
      item.Cover?.url ??
      item.cover?.url ??
      item?.cover_url;

    const statistics = item.statistics ?? item.aweme_statistics ?? {};
    const metricsData = item.metrics ?? {};

    const metrics: PlatformVideoMetrics = {
      playCount: this.parseNumber(
        statistics.play_count ??
        statistics.playCount ??
        metricsData.view_count ??
        metricsData.play_count ??
        item.play_count
      ),
      diggCount: this.parseNumber(
        statistics.digg_count ??
        statistics.diggCount ??
        metricsData.like_count ??
        metricsData.digg_count ??
        item.like_count ??
        item.digg_count
      ),
      commentCount: this.parseNumber(
        statistics.comment_count ??
        statistics.commentCount ??
        metricsData.comment_count ??
        item.comment_count
      ),
      shareCount: this.parseNumber(
        statistics.share_count ??
        statistics.shareCount ??
        metricsData.share_count ??
        item.share_count
      ),
      collectCount: this.parseNumber(
        statistics.collect_count ??
        statistics.collectCount ??
        metricsData.favorite_count ??
        metricsData.collect_count ??
        item.collect_count ??
        item.favorite_count
      ),
    };

    return {
      videoId: String(videoId),
      title: item.desc ?? item.description ?? item.title ?? item.item_title ?? '',
      coverUrl,
      duration: durationSeconds ?? undefined,
      publishTime: publishDate ?? undefined,
      status:
        item.aweme_status ??
        item.status?.status ??
        item.status ??
        item.review?.status ??
        item.review_status,
      metrics,
      extra: item,
    };
  }

  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private pickFirstUrl(list?: string[]): string | undefined {
    if (Array.isArray(list) && list.length > 0) {
      return list.find((url) => typeof url === 'string' && url.length > 0) ?? list[0];
    }
    return undefined;
  }

  private normalizeTimestamp(value: any): Date | undefined {
    const num = this.parseNumber(value);
    if (num === undefined) {
      return undefined;
    }

    if (num > 1e12) {
      return new Date(num);
    }

    return new Date(num * 1000);
  }

  private normalizeDuration(value: any): number | undefined {
    const num = this.parseNumber(value);
    if (num === undefined) {
      return undefined;
    }

    if (num > 3600 && num > 1000) {
      return Math.round(num / 1000);
    }

    return Math.round(num);
  }

  private mergeVideoData(base: PlatformVideoData, incoming: PlatformVideoData): PlatformVideoData {
    const mergedMetrics: PlatformVideoMetrics = { ...base.metrics };

    for (const key of Object.keys(incoming.metrics)) {
      const metricKey = key as keyof PlatformVideoMetrics;
      const incomingValue = incoming.metrics[metricKey];
      if (incomingValue !== undefined && incomingValue !== null) {
        mergedMetrics[metricKey] = incomingValue;
      }
    }

    return {
      videoId: base.videoId,
      title: incoming.title || base.title,
      coverUrl: incoming.coverUrl || base.coverUrl,
      duration: incoming.duration ?? base.duration,
      publishTime: incoming.publishTime ?? base.publishTime,
      status: incoming.status ?? base.status,
      metrics: mergedMetrics,
      extra: incoming.extra ?? base.extra,
    };
  }
}

