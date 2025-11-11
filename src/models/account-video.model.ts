import { Prisma, AccountVideo as PrismaAccountVideo } from '@prisma/client';
import prisma from './prisma';
import { PlatformVideoData } from '../types';

export interface SyncResult {
  created: number;
  updated: number;
  total: number;
  videos: PrismaAccountVideo[];
}

export class AccountVideoModel {
  static async upsertVideos(
    platformAccountId: number,
    videos: PlatformVideoData[]
  ): Promise<SyncResult> {
    if (videos.length === 0) {
      return {
        created: 0,
        updated: 0,
        total: 0,
        videos: [],
      };
    }

    const existing = await prisma.accountVideo.findMany({
      where: { platformAccountId },
      select: {
        videoId: true,
      },
    });

    const existingIds = new Set(existing.map((item) => item.videoId));

    let created = 0;
    let updated = 0;
    const saved: PrismaAccountVideo[] = [];

    for (const video of videos) {
      if (!video.videoId) {
        continue;
      }

      const isExisting = existingIds.has(video.videoId);

      const createData = this.mapVideoCreateData(platformAccountId, video);
      const updateData = this.mapVideoUpdateData(video);

      const record = await prisma.accountVideo.upsert({
        where: {
          platformAccountId_videoId: {
            platformAccountId,
            videoId: video.videoId,
          },
        },
        update: updateData,
        create: createData,
      });

      if (isExisting) {
        updated += 1;
      } else {
        created += 1;
      }

      saved.push(record);
    }

    return {
      created,
      updated,
      total: saved.length,
      videos: saved,
    };
  }

  static async findVideosByAccount(
    platformAccountId: number
  ): Promise<PrismaAccountVideo[]> {
    return prisma.accountVideo.findMany({
      where: { platformAccountId },
      orderBy: {
        publishTime: 'desc',
      },
    });
  }

  private static mapVideoCreateData(
    platformAccountId: number,
    video: PlatformVideoData
  ): Prisma.AccountVideoUncheckedCreateInput {
    return {
      platformAccountId,
      videoId: video.videoId,
      title: video.title ?? '',
      coverUrl: video.coverUrl ?? null,
      duration: video.duration ?? null,
      publishTime: video.publishTime ?? null,
      status: this.normalizeStatus(video.status),
      playCount: video.metrics?.playCount ?? null,
      diggCount: video.metrics?.diggCount ?? null,
      commentCount: video.metrics?.commentCount ?? null,
      shareCount: video.metrics?.shareCount ?? null,
      collectCount: video.metrics?.collectCount ?? null,
      extra: this.serializeExtra(video.extra),
    };
  }

  private static mapVideoUpdateData(
    video: PlatformVideoData
  ): Prisma.AccountVideoUncheckedUpdateInput {
    return {
      title: video.title ?? '',
      coverUrl: video.coverUrl,
      duration: video.duration ?? null,
      publishTime: video.publishTime ?? null,
      status: this.normalizeStatus(video.status),
      playCount: video.metrics?.playCount ?? null,
      diggCount: video.metrics?.diggCount ?? null,
      commentCount: video.metrics?.commentCount ?? null,
      shareCount: video.metrics?.shareCount ?? null,
      collectCount: video.metrics?.collectCount ?? null,
      extra: this.serializeExtra(video.extra),
    };
  }

  private static serializeExtra(extra: any): string | null {
    if (extra === null || extra === undefined) {
      return null;
    }

    if (typeof extra === 'string') {
      return extra;
    }

    try {
      return JSON.stringify(extra);
    } catch (error) {
      console.warn('序列化视频额外数据失败:', error);
      return null;
    }
  }

  private static normalizeStatus(status: any): string | null {
    if (status === null || status === undefined) {
      return null;
    }

    if (typeof status === 'string') {
      return status;
    }

    if (typeof status === 'object') {
      try {
        return JSON.stringify(status);
      } catch (error) {
        console.warn('序列化视频状态失败:', error);
        return null;
      }
    }

    return String(status);
  }
}

