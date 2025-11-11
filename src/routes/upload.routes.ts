import { Router, Request, Response } from 'express';
import { UploadService } from '../uploaders/upload.service';
import { success, error } from '../utils/response';

const router = Router();
const uploadService = new UploadService();

/**
 * @swagger
 * /api/upload/tasks:
 *   post:
 *     summary: 创建上传任务
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platformId
 *               - libraryId
 *               - resourcePath
 *               - title
 *             properties:
 *               platformId:
 *                 type: integer
 *                 description: 平台账号ID
 *                 example: 1
 *               libraryId:
 *                 type: integer
 *                 description: 资源库ID
 *                 example: 1
 *               resourcePath:
 *                 type: string
 *                 description: 资源路径
 *                 example: /videos/demo.mp4
 *               title:
 *                 type: string
 *                 description: 视频标题
 *                 example: 我的第一个视频
 *               description:
 *                 type: string
 *                 description: 视频描述
 *               tags:
 *                 type: string
 *                 description: 标签（逗号分隔）
 *                 example: 生活,日常,vlog
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: 定时发布时间
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { platformId, libraryId, resourcePath, title, description, tags, scheduledAt } = req.body;
    
    if (!platformId || !libraryId || !resourcePath || !title) {
      return res.status(400).json(error('缺少必要参数'));
    }
    
    const task = await uploadService.createTask({
      platformId: parseInt(platformId),
      libraryId: parseInt(libraryId),
      resourcePath,
      title,
      description,
      tags,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });
    
    res.json(success(task, '上传任务创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/upload/tasks:
 *   get:
 *     summary: 获取上传任务列表
 *     tags: [Upload]
 *     parameters:
 *       - in: query
 *         name: platformId
 *         schema:
 *           type: integer
 *         description: 过滤平台账号ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed]
 *         description: 过滤任务状态
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { platformId, status } = req.query;
    
    const tasks = await uploadService.getAllTasks({
      platformId: platformId ? parseInt(platformId as string) : undefined,
      status: status as string,
    });
    
    res.json(success(tasks));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/upload/tasks/{id}:
 *   get:
 *     summary: 获取单个上传任务
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 成功
 *       404:
 *         description: 任务不存在
 */
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await uploadService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json(error('任务不存在', 404));
    }
    
    res.json(success(task));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/upload/tasks/{id}/execute:
 *   post:
 *     summary: 执行上传任务
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 执行成功
 *       400:
 *         description: 任务状态不允许执行
 */
router.post('/tasks/:id/execute', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // 异步执行上传任务,不阻塞请求
    uploadService.executeTask(taskId).then((result) => {
      console.log(`任务 #${taskId} 执行完成:`, result);
    }).catch((err) => {
      console.error(`任务 #${taskId} 执行失败:`, err);
    });
    
    res.json(success({ taskId }, '上传任务已开始执行'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/upload/tasks/{id}/cancel:
 *   post:
 *     summary: 取消上传任务
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 取消成功
 *       400:
 *         description: 任务未在执行中
 */
router.post('/tasks/:id/cancel', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    await uploadService.cancelTask(taskId);
    
    res.json(success(null, '上传任务已取消'));
  } catch (err: any) {
    res.status(400).json(error(err.message, 400));
  }
});

/**
 * @swagger
 * /api/upload/tasks/{id}/progress:
 *   get:
 *     summary: 获取上传进度
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 成功
 *       404:
 *         description: 任务未在执行中
 */
router.get('/tasks/:id/progress', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const progress = uploadService.getTaskProgress(taskId);
    
    if (!progress) {
      return res.status(404).json(error('任务未在执行中', 404));
    }
    
    res.json(success(progress));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/upload/tasks/{id}:
 *   delete:
 *     summary: 删除上传任务
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    await uploadService.deleteTask(taskId);
    
    res.json(success(null, '任务已删除'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
