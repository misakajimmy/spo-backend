// 上传任务数据
export interface UploadTaskData {
  // 任务信息
  taskId: number;
  accountId: number;
  
  // 资源信息
  libraryId: number;
  resourcePath: string;
  
  // 发布信息
  title: string;
  description?: string;
  tags: string[];
  coverPath?: string;  // 封面路径(可选)
  
  // 定时发布
  scheduledAt?: Date;
  
  // 平台特定配置
  config?: Record<string, any>;
}

// 上传结果
export interface UploadResult {
  success: boolean;
  videoId?: string;      // 平台返回的视频ID
  videoUrl?: string;     // 视频链接
  message?: string;
  error?: Error;
}

// 上传进度
export interface UploadProgress {
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'failed';
  percentage: number;    // 0-100
  message: string;
  uploadedAt?: Date;     // 完成时间
}

// 上传状态
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'failed';
