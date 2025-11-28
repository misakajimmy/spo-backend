import { Router, Request, Response } from 'express';
import { ResourceService } from '../resources/resource.service';
import { success, error } from '../utils/response';
import { LibraryType, ResourceType } from '../resources/types';

const router = Router();
const resourceService = new ResourceService();

// ===== 资源库配置管理 =====

/**
 * @swagger
 * /api/resources/libraries:
 *   get:
 *     summary: 获取所有资源库配置
 *     tags: [Resource Library]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceLibrary'
 */
router.get('/libraries', async (req: Request, res: Response) => {
  try {
    const libraries = await resourceService.getAllLibraries();
    res.json(success(libraries));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/libraries/active:
 *   get:
 *     summary: 获取激活的资源库
 *     tags: [Resource Library]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/libraries/active', async (req: Request, res: Response) => {
  try {
    const libraries = await resourceService.getActiveLibraries();
    res.json(success(libraries));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/libraries:
 *   post:
 *     summary: 创建资源库配置
 *     tags: [Resource Library]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - config
 *             properties:
 *               name:
 *                 type: string
 *                 description: 资源库名称
 *                 example: 本地视频库
 *               type:
 *                 type: string
 *                 enum: [local, webdav, smb, ftp]
 *                 description: 资源库类型
 *                 example: local
 *               config:
 *                 type: object
 *                 description: 资源库配置（根据类型不同）
 *                 example:
 *                   basePath: D:\Videos
 *                   allowedExtensions: [.mp4, .avi, .mov]
 *               isDefault:
 *                 type: boolean
 *                 description: 是否设为默认
 *                 example: true
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误或配置无效
 */
router.post('/libraries', async (req: Request, res: Response) => {
  try {
    const { name, type, config, isDefault } = req.body;
    
    if (!name || !type || !config) {
      return res.status(400).json(error('缺少必要参数: name, type, config'));
    }
    
    const library = await resourceService.createLibrary({
      name,
      type: type as LibraryType,
      config,
      isDefault
    });
    
    res.json(success(library, '资源库创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/libraries/{id}:
 *   put:
 *     summary: 更新资源库配置
 *     tags: [Resource Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               config:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/libraries/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const library = await resourceService.updateLibrary(id, req.body);
    res.json(success(library, '资源库更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/libraries/{id}:
 *   delete:
 *     summary: 删除资源库配置
 *     tags: [Resource Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/libraries/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await resourceService.deleteLibrary(id);
    res.json(success(null, '资源库删除成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/libraries/{id}/test:
 *   post:
 *     summary: 测试资源库连接
 *     tags: [Resource Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     responses:
 *       200:
 *         description: 连接成功
 *       400:
 *         description: 连接失败
 */
router.post('/libraries/:id/test', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const isValid = await resourceService.testLibrary(id);
    
    if (isValid) {
      res.json(success({ valid: true }, '连接成功'));
    } else {
      res.json(error('连接失败', 400));
    }
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 资源浏览和搜索 =====

/**
 * @swagger
 * /api/resources/browse/{libraryId}:
 *   get:
 *     summary: 浏览资源库
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: 目录路径
 *         example: /2024/videos
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [video, image, audio, folder]
 *         description: 资源类型筛选
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, size, date]
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 排序方向
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含视频元数据（title, description, duration, width, height, 等）
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceInfo'
 */
router.get('/browse/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path = '', type, sortBy, sortOrder, includeMetadata } = req.query;
    
    const resources = await resourceService.browseLibrary(
      libraryId,
      path as string,
      {
        type: type as ResourceType,
        sortBy: sortBy as 'name' | 'size' | 'date',
        sortOrder: sortOrder as 'asc' | 'desc',
        includeMetadata: includeMetadata === 'true' || includeMetadata === '1',
      }
    );
    
    res.json(success(resources));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/browse:
 *   get:
 *     summary: 浏览默认资源库
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: 目录路径
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { path = '' } = req.query;
    const resources = await resourceService.browseDefaultLibrary(path as string);
    res.json(success(resources));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/search/{libraryId}:
 *   get:
 *     summary: 搜索资源
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *         example: 产品介绍
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [video, image, audio]
 *         description: 资源类型
 *     responses:
 *       200:
 *         description: 成功
 *       400:
 *         description: 缺少搜索关键词
 */
router.get('/search/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { keyword, type } = req.query;
    
    if (!keyword) {
      return res.status(400).json(error('缺少搜索关键词'));
    }
    
    const resources = await resourceService.searchLibrary(
      libraryId,
      keyword as string,
      type as ResourceType
    );
    
    res.json(success(resources));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/info/{libraryId}:
 *   get:
 *     summary: 获取资源信息
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源路径
 *     responses:
 *       200:
 *         description: 成功
 *       400:
 *         description: 缺少资源路径
 */
router.get('/info/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json(error('缺少资源路径'));
    }
    
    const info = await resourceService.getResourceInfo(
      libraryId,
      path as string
    );
    
    res.json(success(info));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/access-path/{libraryId}:
 *   get:
 *     summary: 获取资源访问路径
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源路径
 *     responses:
 *       200:
 *         description: 成功，返回完整访问路径
 *       400:
 *         description: 缺少资源路径
 */
router.get('/access-path/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json(error('缺少资源路径'));
    }
    
    const accessPath = await resourceService.getResourceAccessPath(
      libraryId,
      path as string
    );
    
    res.json(success({ path: accessPath }));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/batch-info/{libraryId}:
 *   post:
 *     summary: 批量获取资源信息
 *     tags: [Resource Browse]
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paths
 *             properties:
 *               paths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 资源路径数组
 *                 example: ["/video1.mp4", "/images/cover.jpg"]
 *     responses:
 *       200:
 *         description: 成功
 *       400:
 *         description: 缺少资源路径数组
 */
router.post('/batch-info/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { paths } = req.body;
    
    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json(error('缺少资源路径数组'));
    }
    
    const resources = await resourceService.getMultipleResourceInfo(
      libraryId,
      paths
    );
    
    res.json(success(resources));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 资源预览和下载 =====

/**
 * @swagger
 * /api/resources/preview/{libraryId}:
 *   get:
 *     summary: 预览资源（流式传输）
 *     tags: [Resource Preview]
 *     description: |
 *       通过流式传输预览资源文件，支持 HTTP Range 请求。
 *       适用于视频、音频和图片的在线预览。
 *       视频可直接在浏览器 <video> 标签中使用此URL播放。
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源路径
 *         example: /videos/demo.mp4
 *       - in: query
 *         name: thumbnail
 *         required: false
 *         schema:
 *           type: string
 *         description: 是否生成缩略图（仅视频有效）
 *         example: true
 *       - in: query
 *         name: time
 *         required: false
 *         schema:
 *           type: number
 *         description: 缩略图时间点（秒，默认视频中间位置）
 *         example: 2.5
 *       - in: query
 *         name: width
 *         required: false
 *         schema:
 *           type: number
 *         description: 缩略图宽度（像素，保持比例缩放）
 *         example: 320
 *       - in: header
 *         name: Range
 *         schema:
 *           type: string
 *         description: Range 请求头（可选，浏览器自动添加）
 *         example: bytes=0-1023
 *     responses:
 *       200:
 *         description: 完整资源内容
 *       206:
 *         description: 部分资源内容（Range 请求）
 *         headers:
 *           Content-Range:
 *             schema:
 *               type: string
 *           Accept-Ranges:
 *             schema:
 *               type: string
 *       400:
 *         description: 缺少资源路径
 *       404:
 *         description: 资源不存在
 */
router.get('/preview/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path, thumbnail, time, width } = req.query;
    
    if (!path) {
      return res.status(400).json(error('缺少资源路径'));
    }
    
    // 获取资源信息
    const info = await resourceService.getResourceInfo(libraryId, path as string);
    const mimeType = await resourceService.getResourceMimeType(libraryId, path as string);
    const range = req.headers.range;

    // 如果请求缩略图，并且是视频类型，则生成并返回缩略图
    if ((thumbnail === '1' || thumbnail === 'true') && mimeType.startsWith('video/')) {
      try {
        const timeSeconds = time ? parseFloat(String(time)) : undefined;
        const thumbWidth = width ? parseInt(String(width), 10) : undefined;
        const buffer = await resourceService.getVideoThumbnail(
          libraryId,
          path as string,
          { timeSeconds, width: thumbWidth }
        );
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', buffer.length);
        return res.status(200).end(buffer);
      } catch (e: any) {
        return res.status(500).json(error(e.message || '生成缩略图失败', 500));
      }
    }
    
    // 支持 Range 请求（视频/音频播放必需）
    if (range && info.size) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : info.size - 1;
      const chunksize = (end - start) + 1;
      
      const stream = await resourceService.getResourceStream(
        libraryId,
        path as string,
        { start, end }
      );
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });
      
      stream.pipe(res);
    } else {
      // 完整文件
      const stream = await resourceService.getResourceStream(libraryId, path as string);
      
      res.writeHead(200, {
        'Content-Length': info.size || 0,
        'Content-Type': mimeType,
      });
      
      stream.pipe(res);
    }
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/download/{libraryId}:
 *   get:
 *     summary: 下载资源
 *     tags: [Resource Preview]
 *     description: 下载指定的资源文件
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源路径
 *         example: /videos/demo.mp4
 *     responses:
 *       200:
 *         description: 文件下载
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *           Content-Type:
 *             schema:
 *               type: string
 *       400:
 *         description: 缺少资源路径
 *       404:
 *         description: 资源不存在
 */
router.get('/download/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json(error('缺少资源路径'));
    }
    
    // 获取资源信息
    const info = await resourceService.getResourceInfo(libraryId, path as string);
    const mimeType = await resourceService.getResourceMimeType(libraryId, path as string);
    const stream = await resourceService.getResourceStream(libraryId, path as string);
    
    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(info.name)}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', info.size || 0);
    
    // 传输文件流
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 资源管理 =====

/**
 * @swagger
 * /api/resources/rename/{libraryId}:
 *   put:
 *     summary: 重命名资源文件
 *     tags: [Resource Management]
 *     description: |
 *       重命名指定资源文件，返回新的路径
 *       
 *       **支持的资源库类型:**
 *       - local: 本地文件系统 ✅
 *       - webdav: WebDAV 远程存储 ✅
 *       - smb: SMB/CIFS 网络共享 ❌ (暂不支持)
 *       - ftp: FTP 服务器 ❌ (暂不支持)
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPath
 *               - newName
 *             properties:
 *               oldPath:
 *                 type: string
 *                 description: 旧路径
 *                 example: /videos/old-name.mp4
 *               newName:
 *                 type: string
 *                 description: 新文件名(只需文件名，不需路径)
 *                 example: new-name.mp4
 *     responses:
 *       200:
 *         description: 重命名成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 文件重命名成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     newPath:
 *                       type: string
 *                       description: 新的完整路径
 *                       example: /videos/new-name.mp4
 *       400:
 *         description: 参数错误或文件已存在
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 重命名失败
 */
router.put('/rename/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { oldPath, newName } = req.body;
    
    if (!oldPath || !newName) {
      return res.status(400).json(error('缺少必要参数: oldPath, newName'));
    }
    
    const newPath = await resourceService.renameResource(libraryId, oldPath, newName);
    res.json(success({ newPath }, '文件重命名成功'));
  } catch (err: any) {
    if (err.message.includes('已存在')) {
      return res.status(400).json(error(err.message, 400));
    }
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/resources/metadata/{libraryId}:
 *   put:
 *     summary: 更新视频元数据
 *     tags: [Resource Management]
 *     description: |
 *       更新视频文件的元数据(标题、描述、作者等)
 *       
 *       **重要说明:**
 *       - 只支持 **local(本地)** 类型的资源库
 *       - WebDAV/SMB/FTP 等远程资源库不支持此操作
 *       - 原因: 需要直接修改文件，远程存储需要下载->修改->上传，开销较大
 *       - 使用 ffmpeg 直接修改元数据，**不重新编码视频**，保持原始质量
 *       - 处理过程中会生成临时文件，需要足够的磁盘空间
 *       
 *       **支持的资源库类型:**
 *       - local: 本地文件系统 ✅
 *       - webdav: WebDAV 远程存储 ❌
 *       - smb: SMB/CIFS 网络共享 ❌
 *       - ftp: FTP 服务器 ❌
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *                 description: 视频路径
 *                 example: /videos/demo.mp4
 *               title:
 *                 type: string
 *                 description: 视频标题
 *                 example: 我的演示视频
 *               description:
 *                 type: string
 *                 description: 视频描述
 *                 example: 这是一个演示视频
 *               artist:
 *                 type: string
 *                 description: 作者/创作者
 *                 example: 张三
 *               comment:
 *                 type: string
 *                 description: 备注/评论
 *                 example: 使用手机拍摄
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 元数据更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: 缺少必要参数或不是视频文件
 *       500:
 *         description: 更新失败
 */
router.put('/metadata/:libraryId', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { path, title, description, artist, comment } = req.body;
    
    if (!path) {
      return res.status(400).json(error('缺少必要参数: path'));
    }
    
    // 检查是否为视频文件
    const info = await resourceService.getResourceInfo(libraryId, path);
    if (info.type !== 'video') {
      return res.status(400).json(error('只能更新视频文件的元数据'));
    }
    
    // 检查是否至少提供了一个元数据字段
    if (!title && !description && !artist && !comment) {
      return res.status(400).json(error('至少需要提供一个元数据字段'));
    }
    
    const metadata: any = {};
    if (title) metadata.title = title;
    if (description) metadata.description = description;
    if (artist) metadata.artist = artist;
    if (comment) metadata.comment = comment;
    
    const success_result = await resourceService.updateVideoMetadata(libraryId, path, metadata);
    res.json(success({ success: success_result }, '元数据更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
