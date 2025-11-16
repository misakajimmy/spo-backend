# 主题库发布与归档功能文档

## 📝 功能概述

本次实现为主题库(Theme)添加了视频发布状态管理、批量发布、自动归档和手动归档功能。通过文件夹结构来标记视频是否已发布,支持手动和自动发布场景。

## 🎯 核心特性

### 1. 视频状态标记
- **未发布**: 位于主文件夹下的视频
- **已发布**: 位于归档文件夹(默认 `published`)下的视频
- 支持自定义归档文件夹名称(通过 `archiveFolderName` 字段)

### 2. 视频列表增强
`GET /api/themes/:id/videos` 现在返回:
```json
{
  "code": 200,
  "data": [
    {
      "name": "video1.mp4",
      "path": "video1.mp4",
      "fullPath": "/videos/food/video1.mp4",
      "isPublished": false,  // 🆕 发布状态标记
      "libraryId": 1,
      "libraryPath": "/videos/food",
      "size": 10485760,
      "type": "video"
    },
    {
      "name": "video2.mp4",
      "path": "video2.mp4",
      "fullPath": "/videos/food/published/video2.mp4",
      "isPublished": true,   // 🆕 已归档视频
      "libraryId": 1,
      "libraryPath": "/videos/food/published",
      "size": 8388608,
      "type": "video"
    }
  ]
}
```

### 3. 统计信息
`GET /api/themes/:id/statistics`

**返回数据:**
```json
{
  "code": 200,
  "data": {
    "published": 10,      // 已发布视频数量
    "unpublished": 25     // 未发布视频数量
  }
}
```

## 🚀 API 接口

### 1. 批量发布视频
```http
POST /api/themes/:id/batch-publish
Content-Type: application/json

{
  "accountIds": [1, 2],           // 要发布到的账号ID列表
  "videoPaths": [                 // 要发布的视频路径列表
    "/videos/food/video1.mp4",
    "/videos/food/video2.mp4"
  ],
  "autoArchive": true,            // 是否自动归档(默认true)
  "title": "美食探店",             // 视频标题(可选)
  "tags": ["美食", "探店"]         // 标签(可选)
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "批量发布任务已创建",
  "data": {
    "tasks": [
      {
        "taskId": 1,
        "accountId": 1,
        "videoName": "video1.mp4",
        "videoPath": "/videos/food/video1.mp4",
        "libraryId": 1,
        "autoArchive": true
      }
    ],
    "totalTasks": 2,
    "accountCount": 2,
    "videoCount": 1
  }
}
```

**说明:**
- 根据 `videoPaths` 和 `accountIds` 创建上传任务
- 如果 `autoArchive` 为 `true`,发布成功后自动归档视频
- 返回创建的任务列表,前端可以用这些任务ID来执行上传

### 2. 批量归档视频
```http
POST /api/themes/:id/videos/archive
Content-Type: application/json

{
  "videoPaths": [
    "/videos/food/video1.mp4",
    "/videos/food/video2.mp4"
  ]
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "归档完成: 2/2 成功",
  "data": {
    "total": 2,
    "archived": 2,
    "failed": 0,
    "results": [
      {
        "path": "/videos/food/video1.mp4",
        "success": true
      },
      {
        "path": "/videos/food/video2.mp4",
        "success": true
      }
    ]
  }
}
```

**说明:**
- 只归档未发布的视频(已发布的会被自动过滤)
- 视频会被移动到 `<主文件夹>/<archiveFolderName>/` 下
- 如果归档文件夹不存在,会自动创建

### 3. 批量取消归档
```http
POST /api/themes/:id/videos/unarchive
Content-Type: application/json

{
  "videoPaths": [
    "/videos/food/published/video1.mp4"
  ]
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "取消归档完成: 1/1 成功",
  "data": {
    "total": 1,
    "unarchived": 1,
    "failed": 0,
    "results": [
      {
        "path": "/videos/food/published/video1.mp4",
        "success": true
      }
    ]
  }
}
```

**说明:**
- 只取消归档已发布的视频(未发布的会被自动过滤)
- 视频会被移回上一级目录(主文件夹)

## 📁 文件夹结构示例

### 默认归档文件夹 (published)
```
/videos/food/
├── video1.mp4        ← 未发布
├── video2.mp4        ← 未发布
└── published/        ← 归档文件夹
    ├── video3.mp4    ← 已发布
    └── video4.mp4    ← 已发布
```

### 自定义归档文件夹 (archived)
通过设置 `archiveFolderName` 字段:
```json
{
  "name": "美食系列",
  "archiveFolderName": "archived"  // 自定义归档文件夹名
}
```

文件夹结构:
```
/videos/food/
├── video1.mp4        ← 未发布
├── video2.mp4        ← 未发布
└── archived/         ← 自定义归档文件夹
    ├── video3.mp4    ← 已发布
    └── video4.mp4    ← 已发布
```

## 💡 使用场景

### 场景1: 批量发布并自动归档
```typescript
// 1. 选择要发布的视频
const videoPaths = [
  '/videos/food/video1.mp4',
  '/videos/food/video2.mp4'
];

// 2. 发布到多个账号,并自动归档
const response = await fetch('/api/themes/1/batch-publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountIds: [1, 2],        // 抖音 + B站
    videoPaths: videoPaths,
    autoArchive: true,         // 发布成功后自动归档
    title: '{{filename}}',     // 使用文件名作为标题
    tags: ['美食', '探店']
  })
});

// 3. 获取任务列表
const { data } = await response.json();
console.log('创建了', data.totalTasks, '个上传任务');

// 4. 执行上传(前端需要调用上传接口)
// 上传成功后,视频会自动移动到 /videos/food/published/
```

### 场景2: 手动发布 + 手动归档
```typescript
// 1. 用户手动在平台发布视频

// 2. 手动归档已发布的视频
const response = await fetch('/api/themes/1/videos/archive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoPaths: ['/videos/food/video1.mp4']
  })
});

// 视频移动到: /videos/food/published/video1.mp4
```

### 场景3: 取消归档(重新发布)
```typescript
// 1. 将已归档的视频移回主文件夹
const response = await fetch('/api/themes/1/videos/unarchive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoPaths: ['/videos/food/published/video1.mp4']
  })
});

// 视频移回: /videos/food/video1.mp4

// 2. 现在可以重新发布这个视频
```

## 🔧 技术实现细节

### 1. 视频状态判断
```typescript
// 在 getThemeVideos 方法中
// 主文件夹的视频标记为未发布
const mainVideos = {
  ...video,
  isPublished: false
};

// 归档文件夹的视频标记为已发布
const archivedVideos = {
  ...video,
  isPublished: true
};
```

### 2. 归档逻辑
```typescript
// archiveVideo 方法
const directory = path.dirname(videoPath);        // /videos/food
const filename = path.basename(videoPath);        // video1.mp4
const archivePath = path.join(directory, 'published');  // /videos/food/published
const targetPath = path.join(archivePath, filename);    // /videos/food/published/video1.mp4

// 确保归档文件夹存在
await library.createFolder(archivePath);

// 移动文件
await library.move(videoPath, targetPath);
```

### 3. 取消归档逻辑
```typescript
// unarchiveVideo 方法
const directory = path.dirname(videoPath);        // /videos/food/published
const filename = path.basename(videoPath);        // video1.mp4
const parentDir = path.dirname(directory);        // /videos/food
const targetPath = path.join(parentDir, filename); // /videos/food/video1.mp4

// 移动文件回主文件夹
await library.move(videoPath, targetPath);
```

### 4. 批量操作
```typescript
// 批量归档
const videosToArchive = allVideos.filter(video => 
  videoPaths.includes(video.fullPath) && !video.isPublished  // 只归档未发布的
);

// 批量取消归档
const videosToUnarchive = allVideos.filter(video => 
  videoPaths.includes(video.fullPath) && video.isPublished   // 只取消归档已发布的
);
```

## ⚠️ 注意事项

1. **文件移动是物理移动**: 归档和取消归档会真实移动文件,不是复制
2. **路径唯一性**: 同一文件夹下不能有同名文件
3. **归档文件夹**: 如果不存在会自动创建
4. **批量操作**: 部分失败不影响其他文件,返回详细的成功/失败列表
5. **自动归档**: 只在上传成功后才会执行
6. **状态判断**: 完全基于文件所在位置,无需数据库记录

## 📊 完整工作流

### 典型发布流程
```
1. 上传视频到主文件夹
   /videos/food/video1.mp4  [未发布]

2. 获取主题库视频列表
   GET /api/themes/1/videos
   → 看到 video1.mp4, isPublished: false

3. 批量发布视频
   POST /api/themes/1/batch-publish
   → 创建上传任务

4. 执行上传任务
   → 上传成功

5. 自动归档(如果 autoArchive: true)
   /videos/food/published/video1.mp4  [已发布]

6. 再次获取视频列表
   GET /api/themes/1/videos
   → 看到 video1.mp4, isPublished: true
   
7. 查看统计
   GET /api/themes/1/statistics
   → { published: 1, unpublished: 0 }
```

## 🎉 总结

本次实现的功能:
- ✅ 视频状态标记(通过文件夹位置)
- ✅ 自动归档(发布成功后)
- ✅ 手动归档/取消归档(批量操作)
- ✅ 批量发布(支持多账号、多视频)
- ✅ 统计信息(已发布/未发布数量)
- ✅ 自定义归档文件夹名称

完全兼容手动发布场景! 🚀
