import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { DouyinUploader } from './platforms/douyin/douyin.uploader';
import { UploadTaskData, UploadResult, UploadProgress } from './base/uploader.types';
import { IUploader } from './base/uploader.interface';

const prisma = new PrismaClient();

/**
 * 上传服务
 * 负责管理上传任务和协调上传器
 */
export class UploadService {
  // 存储正在运行的上传器实例
  private static activeUploaders: Map<number, IUploader> = new Map();
  
  /**
   * 创建上传任务
   */
  async createTask(data: {
    platformId: number;
    libraryId: number;
    resourcePath: string;
    title: string;
    description?: string;
    tags?: string;
    scheduledAt?: Date;
  }) {
    try {
      const task = await prisma.uploadTask.create({
        data: {
          platformId: data.platformId,
          libraryId: data.libraryId,
          resourcePath: data.resourcePath,
          resourceType: 'video',
          title: data.title,
          description: data.description || '',
          tags: data.tags || '',
          status: 'pending',
          scheduledAt: data.scheduledAt,
        },
        include: {
          account: true,
        },
      });
      
      return task;
    } catch (error) {
      console.error('创建上传任务失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取所有上传任务
   */
  async getAllTasks(filters?: {
    platformId?: number;
    status?: string;
  }) {
    try {
      const tasks = await prisma.uploadTask.findMany({
        where: {
          platformId: filters?.platformId,
          status: filters?.status,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          account: true,
        },
      });
      
      return tasks;
    } catch (error) {
      console.error('获取上传任务列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取单个任务
   */
  async getTask(taskId: number) {
    try {
      const task = await prisma.uploadTask.findUnique({
        where: { id: taskId },
        include: {
          account: true,
        },
      });
      
      return task;
    } catch (error) {
      console.error('获取任务失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: number,
    status: string,
    uploadedAt?: Date
  ) {
    try {
      const task = await prisma.uploadTask.update({
        where: { id: taskId },
        data: {
          status,
          uploadedAt,
        },
      });
      
      return task;
    } catch (error) {
      console.error('更新任务状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除任务
   */
  async deleteTask(taskId: number) {
    try {
      await prisma.uploadTask.delete({
        where: { id: taskId },
      });
      
      return true;
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行上传任务
   */
  async executeTask(taskId: number): Promise<UploadResult> {
    try {
      // 1. 获取任务信息
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`任务 ${taskId} 不存在`);
      }
      
      // 2. 检查任务状态
      if (task.status === 'processing') {
        throw new Error('任务正在执行中');
      }
      
      if (task.status === 'success') {
        throw new Error('任务已完成');
      }
      
      // 3. 获取平台账号信息
      const account = task.account ?? await prisma.platformAccount.findUnique({
        where: { id: task.platformId },
      });
      
      if (!account) {
        throw new Error(`账号 ${task.platformId} 不存在`);
      }
      
      // 4. 更新任务状态为处理中
      await this.updateTaskStatus(taskId, 'processing');
      
      // 5. 创建上传器
      const uploader = this.createUploader(account.platform, account.cookiePath);
      
      // 6. 存储上传器实例
      UploadService.activeUploaders.set(taskId, uploader);
      
      // 7. 准备上传数据
      const uploadData: UploadTaskData = {
        taskId: task.id,
        accountId: task.platformId,
        libraryId: task.libraryId,
        resourcePath: task.resourcePath,
        title: task.title,
        description: task.description || undefined,
        tags: task.tags ? task.tags.split(',').map(t => t.trim()) : [],
        scheduledAt: task.scheduledAt || undefined,
      };
      
      // 8. 执行上传
      console.log(`🚀 开始执行上传任务 #${taskId}`);
      const result = await uploader.upload(uploadData);
      
      // 9. 更新任务状态
      if (result.success) {
        await this.updateTaskStatus(taskId, 'success', new Date());
        console.log(`✅ 任务 #${taskId} 上传成功`);
      } else {
        await this.updateTaskStatus(taskId, 'failed');
        console.error(`❌ 任务 #${taskId} 上传失败: ${result.message}`);
      }
      
      // 10. 移除上传器实例
      UploadService.activeUploaders.delete(taskId);
      
      return result;
      
    } catch (error) {
      console.error(`执行任务 #${taskId} 失败:`, error);
      
      // 更新任务状态为失败
      await this.updateTaskStatus(taskId, 'failed');
      
      // 移除上传器实例
      UploadService.activeUploaders.delete(taskId);
      
      return {
        success: false,
        error: error as Error,
        message: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
  
  /**
   * 取消上传任务
   */
  async cancelTask(taskId: number): Promise<void> {
    const uploader = UploadService.activeUploaders.get(taskId);
    
    if (uploader) {
      await uploader.cancel();
      UploadService.activeUploaders.delete(taskId);
      await this.updateTaskStatus(taskId, 'failed');
      console.log(`❌ 任务 #${taskId} 已取消`);
    } else {
      throw new Error('任务未在执行中');
    }
  }
  
  /**
   * 获取上传进度
   */
  getTaskProgress(taskId: number): UploadProgress | null {
    const uploader = UploadService.activeUploaders.get(taskId);
    
    if (uploader) {
      return uploader.getProgress();
    }
    
    return null;
  }
  
  /**
   * 创建上传器实例
   */
  private createUploader(platform: string, cookiePath: string): IUploader {
    switch (platform.toLowerCase()) {
      case 'douyin':
        return new DouyinUploader(cookiePath);
      
      // 后续可以添加其他平台
      // case 'bilibili':
      //   return new BilibiliUploader(cookiePath);
      
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }
}
