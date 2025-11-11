# 视频上传功能架构文档

## 📁 目录结构

```
src/uploaders/
├── base/                          # 基础类和接口
│   ├── uploader.types.ts         # 类型定义
│   ├── uploader.interface.ts     # 上传器接口
│   └── base.uploader.ts          # 基础上传器抽象类
│
├── platforms/                     # 平台实现
│   └── douyin/                   # 抖音平台
│       ├── douyin.config.ts      # 配置和选择器
│       └── douyin.uploader.ts    # 抖音上传器实现
│
├── upload.service.ts             # 上传服务(业务逻辑层)
│
src/routes/
└── upload.routes.ts              # 上传API路由
```

## 🏗️ 架构设计

### 1. 分层架构

```
API层 (upload.routes.ts)
    ↓
服务层 (upload.service.ts)
    ↓
上传器层 (douyin.uploader.ts)
    ↓
基础层 (base.uploader.ts)
    ↓
Playwright 浏览器自动化
```

### 2. 核心类说明

#### IUploader 接口
定义所有上传器必须实现的方法:
- `validateCookie()` - 验证Cookie有效性
- `upload()` - 执行上传
- `cancel()` - 取消上传
- `getProgress()` - 获取进度

#### BaseUploader 基类
提供通用功能:
- 浏览器初始化和管理
- Cookie管理
- 反检测脚本注入
- 进度追踪
- 资源路径获取

#### DouyinUploader 抖音实现
实现抖音平台的具体上传逻辑:
- 打开上传页面
- 上传视频文件
- 填写标题和标签
- 设置封面(可选)
- 设置定时发布(可选)
- 发布视频

#### UploadService 服务层
管理上传任务的生命周期:
- 创建/查询/删除任务
- 执行上传任务
- 取消上传
- 查询上传进度

## 📡 API 接口

### 1. 创建上传任务
```
POST /api/upload/tasks
Body: {
  platformId: 1,
  libraryId: 1,
  resourcePath: "/videos/demo.mp4",
  title: "我的视频",
  description: "视频描述",
  tags: "生活,日常,vlog",
  scheduledAt: "2025-01-15T10:00:00Z"  // 可选
}
```

### 2. 获取任务列表
```
GET /api/upload/tasks?platformId=1&status=pending
```

### 3. 获取任务详情
```
GET /api/upload/tasks/1
```

### 4. 执行上传任务
```
POST /api/upload/tasks/1/execute
```

### 5. 取消上传任务
```
POST /api/upload/tasks/1/cancel
```

### 6. 获取上传进度
```
GET /api/upload/tasks/1/progress
Response: {
  status: "uploading",
  percentage: 45,
  message: "正在上传视频..."
}
```

### 7. 删除任务
```
DELETE /api/upload/tasks/1
```

## 🔄 上传流程

### 完整流程
1. **创建任务** - 通过API创建上传任务,保存到数据库
2. **执行任务** - 调用执行接口,异步开始上传
3. **初始化浏览器** - 启动Playwright浏览器
4. **打开上传页面** - 访问平台上传页面
5. **上传视频文件** - 选择并上传视频
6. **等待页面跳转** - 等待进入发布页面
7. **填写信息** - 填写标题、描述、标签
8. **等待处理** - 等待视频处理完成
9. **设置封面** - (可选)上传封面图片
10. **设置定时** - (可选)设置定时发布
11. **发布视频** - 点击发布按钮
12. **等待完成** - 等待发布成功
13. **更新状态** - 更新任务状态到数据库

### 状态流转
```
pending → processing → success
                    ↘ failed
```

## 🎯 核心特性

### 1. 进度追踪
实时追踪上传进度,支持以下状态:
- `pending` - 等待开始
- `uploading` - 上传中
- `processing` - 处理中
- `success` - 成功
- `failed` - 失败

### 2. 错误处理
- 自动检测上传失败
- 支持重试机制
- 详细的错误信息

### 3. 取消机制
- 可随时取消正在进行的上传
- 自动清理浏览器资源

### 4. Cookie管理
- 自动加载和保存Cookie
- Cookie有效性验证
- 支持多账号

### 5. 反检测
- 注入反检测脚本
- 隐藏webdriver特征
- 模拟真实用户行为

## 🔧 配置说明

### 抖音配置 (douyin.config.ts)

```typescript
export const DouyinConfig = {
  maxTitleLength: 30,          // 标题最大长度
  uploadTimeout: 300000,       // 上传超时(5分钟)
  pageTimeout: 30000,          // 页面加载超时
  uploadCheckInterval: 2000,   // 上传检查间隔
};
```

### 选择器配置
所有页面选择器统一在 `DouyinSelectors` 中管理,便于维护。

## 🚀 使用示例

### 1. 创建并执行上传任务

```typescript
// 1. 创建任务
const response = await fetch('/api/upload/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platformId: 1,
    libraryId: 1,
    resourcePath: '/videos/demo.mp4',
    title: '我的第一个视频',
    tags: '生活,日常'
  })
});

const { data: task } = await response.json();

// 2. 执行任务
await fetch(`/api/upload/tasks/${task.id}/execute`, {
  method: 'POST'
});

// 3. 轮询进度
const checkProgress = setInterval(async () => {
  const progress = await fetch(`/api/upload/tasks/${task.id}/progress`);
  const { data } = await progress.json();
  
  console.log(`${data.percentage}% - ${data.message}`);
  
  if (data.status === 'success' || data.status === 'failed') {
    clearInterval(checkProgress);
  }
}, 2000);
```

### 2. 定时发布

```typescript
const scheduledDate = new Date('2025-01-15T10:00:00Z');

await fetch('/api/upload/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platformId: 1,
    libraryId: 1,
    resourcePath: '/videos/demo.mp4',
    title: '定时发布的视频',
    scheduledAt: scheduledDate.toISOString()
  })
});
```

## 🔐 数据库集成

### UploadTask 模型

```prisma
model UploadTask {
  id            Int      @id @default(autoincrement())
  platformId    Int      // 平台账号ID
  
  // 资源信息
  resourcePath  String   // 资源路径
  resourceType  String   // 资源类型
  libraryId     Int      // 资源库ID
  
  // 发布信息
  title         String   // 标题
  description   String?  // 描述
  tags          String   // 标签
  
  // 状态
  status        String   @default("pending")
  scheduledAt   DateTime?
  uploadedAt    DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 📝 扩展指南

### 添加新平台

1. **创建平台目录**
```
src/uploaders/platforms/bilibili/
├── bilibili.config.ts
└── bilibili.uploader.ts
```

2. **实现 Uploader 类**
```typescript
export class BilibiliUploader extends BaseUploader {
  async validateCookie(): Promise<boolean> {
    // 实现B站的Cookie验证
  }
  
  async upload(task: UploadTaskData): Promise<UploadResult> {
    // 实现B站的上传逻辑
  }
}
```

3. **注册到服务**
```typescript
// upload.service.ts
private createUploader(platform: string, cookiePath: string): IUploader {
  switch (platform.toLowerCase()) {
    case 'douyin':
      return new DouyinUploader(cookiePath);
    case 'bilibili':
      return new BilibiliUploader(cookiePath);  // 新增
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }
}
```

## ⚠️ 注意事项

1. **浏览器资源**: 上传时会启动浏览器,占用系统资源
2. **并发限制**: 建议控制同时上传的任务数量
3. **Cookie有效期**: 需要定期验证和更新Cookie
4. **网络稳定性**: 上传需要稳定的网络连接
5. **平台规则**: 注意遵守各平台的使用规则和限制

## 🐛 故障排查

### 常见问题

1. **上传失败**
   - 检查Cookie是否有效
   - 检查视频文件是否存在
   - 检查网络连接

2. **页面选择器失效**
   - 平台页面更新时需要更新选择器配置
   - 查看浏览器截图定位问题

3. **进度不更新**
   - 检查任务是否正在执行
   - 查看服务器日志

## 📊 未来优化

- [ ] 支持批量上传
- [ ] 添加上传队列管理
- [ ] 支持断点续传
- [ ] 添加上传统计分析
- [ ] 优化浏览器资源使用
- [ ] 添加更多平台支持

---

**当前版本**: v1.0.0  
**支持平台**: 抖音  
**最后更新**: 2025-01-11
