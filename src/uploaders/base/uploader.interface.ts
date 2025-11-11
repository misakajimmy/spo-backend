import { UploadTaskData, UploadResult, UploadProgress } from './uploader.types';

/**
 * 上传器接口
 * 所有平台的上传器都必须实现这个接口
 */
export interface IUploader {
  /**
   * 验证 Cookie 是否有效
   */
  validateCookie(): Promise<boolean>;
  
  /**
   * 上传视频
   * @param task 上传任务数据
   */
  upload(task: UploadTaskData): Promise<UploadResult>;
  
  /**
   * 取消上传
   */
  cancel(): Promise<void>;
  
  /**
   * 获取上传进度
   */
  getProgress(): UploadProgress;
}
