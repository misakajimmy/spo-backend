import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { success, error } from '../utils/response';

const router = Router();
const analyticsService = new AnalyticsService();

// ===== 用户数据分析 =====

/**
 * @swagger
 * /api/analytics/users/{accountId}:
 *   get:
 *     summary: 获取单个账号的用户数据分析
 *     description: 返回指定账号的用户数据分析结果，包括粉丝数、关注数、获赞数等统计信息
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 成功获取分析数据
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     accountId:
 *                       type: integer
 *                     followerCount:
 *                       type: integer
 *                     followingCount:
 *                       type: integer
 *                     totalLikes:
 *                       type: integer
 *                     videoCount:
 *                       type: integer
 *                     averageViews:
 *                       type: number
 *                     engagementRate:
 *                       type: number
 *                     growthRate:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     account:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         platform:
 *                           type: string
 *                         accountName:
 *                           type: string
 *                         username:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         followersCount:
 *                           type: integer
 *                         followingCount:
 *                           type: integer
 *                         totalFavorited:
 *                           type: integer
 *                         isActive:
 *                           type: boolean
 *       404:
 *         description: 账号不存在或无分析数据
 *       500:
 *         description: 服务器错误
 */
router.get('/users/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json(error('无效的账号ID', 400));
    }
    
    const data = await analyticsService.getUserAnalytics(accountId);
    
    if (!data) {
      return res.status(404).json(error('未找到该账号的分析数据', 404));
    }
    
    res.json(success(data));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/users/{accountId}/analyze:
 *   post:
 *     summary: 分析单个账号的用户数据
 *     description: 执行用户数据分析并保存结果，自动从账号信息中提取数据进行计算
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 分析成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: 账号不存在
 *       500:
 *         description: 分析失败
 */
router.post('/users/:accountId/analyze', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json(error('无效的账号ID', 400));
    }
    
    const result = await analyticsService.analyzeUserData(accountId);
    res.json(success(result, '用户数据分析完成'));
  } catch (err: any) {
    if (err.message.includes('未找到')) {
      return res.status(404).json(error(err.message, 404));
    }
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/users/analyze-all:
 *   post:
 *     summary: 批量分析所有账号的用户数据
 *     description: 对系统中所有账号执行用户数据分析
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: 批量分析完成
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
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: 总账号数
 *                     success:
 *                       type: integer
 *                       description: 成功分析数
 *                     failed:
 *                       type: integer
 *                       description: 失败数
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           accountId:
 *                             type: integer
 *                           success:
 *                             type: boolean
 *                           error:
 *                             type: string
 *       500:
 *         description: 批量分析失败
 */
router.post('/users/analyze-all', async (req: Request, res: Response) => {
  try {
    const result = await analyticsService.analyzeUsersBatch();
    res.json(success(result, `批量分析完成: 成功 ${result.success} 个，失败 ${result.failed} 个`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/users/{accountId}/history:
 *   get:
 *     summary: 获取账号的用户数据历史记录
 *     description: 返回指定账号的历史分析数据，用于趋势分析
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 返回记录数量限制
 *     responses:
 *       200:
 *         description: 成功获取历史数据
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
 *                     type: object
 *       404:
 *         description: 账号不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/users/:accountId/history', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const limit = parseInt(req.query.limit as string) || 30;
    
    if (isNaN(accountId)) {
      return res.status(400).json(error('无效的账号ID', 400));
    }
    
    const history = await analyticsService.getUserAnalyticsHistory(accountId, limit);
    res.json(success(history));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 视频数据分析 =====

/**
 * @swagger
 * /api/analytics/videos/{videoId}:
 *   get:
 *     summary: 获取单个视频的数据分析
 *     description: 返回指定视频的数据分析结果，包括播放量、点赞数、评论数等统计信息
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *     responses:
 *       200:
 *         description: 成功获取分析数据
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     videoId:
 *                       type: integer
 *                     viewCount:
 *                       type: integer
 *                     likeCount:
 *                       type: integer
 *                     commentCount:
 *                       type: integer
 *                     shareCount:
 *                       type: integer
 *                     collectCount:
 *                       type: integer
 *                     engagementRate:
 *                       type: number
 *                     completionRate:
 *                       type: number
 *                     avgWatchTime:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     video:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         videoId:
 *                           type: string
 *                         title:
 *                           type: string
 *                         coverUrl:
 *                           type: string
 *                         duration:
 *                           type: integer
 *                         publishTime:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *                         account:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             platform:
 *                               type: string
 *                             accountName:
 *                               type: string
 *                             username:
 *                               type: string
 *                             avatar:
 *                               type: string
 *       404:
 *         description: 视频不存在或无分析数据
 *       500:
 *         description: 服务器错误
 */
router.get('/videos/:videoId', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.videoId);
    
    if (isNaN(videoId)) {
      return res.status(400).json(error('无效的视频ID', 400));
    }
    
    const data = await analyticsService.getVideoAnalytics(videoId);
    
    if (!data) {
      return res.status(404).json(error('未找到该视频的分析数据', 404));
    }
    
    res.json(success(data));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/videos/{videoId}/analyze:
 *   post:
 *     summary: 分析单个视频的数据
 *     description: 执行视频数据分析并保存结果，自动从视频信息中提取数据进行计算
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *     responses:
 *       200:
 *         description: 分析成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: 视频不存在
 *       500:
 *         description: 分析失败
 */
router.post('/videos/:videoId/analyze', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.videoId);
    
    if (isNaN(videoId)) {
      return res.status(400).json(error('无效的视频ID', 400));
    }
    
    const result = await analyticsService.analyzeVideoData(videoId);
    res.json(success(result, '视频数据分析完成'));
  } catch (err: any) {
    if (err.message.includes('未找到')) {
      return res.status(404).json(error(err.message, 404));
    }
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/videos/analyze-by-account/{accountId}:
 *   post:
 *     summary: 分析指定账号的所有视频
 *     description: 对指定账号下的所有视频执行数据分析
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 批量分析完成
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
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     results:
 *                       type: array
 *       404:
 *         description: 账号不存在或无视频
 *       500:
 *         description: 批量分析失败
 */
router.post('/videos/analyze-by-account/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json(error('无效的账号ID', 400));
    }
    
    const result = await analyticsService.analyzeVideosByAccount(accountId);
    res.json(success(result, `批量分析完成: 成功 ${result.success} 个，失败 ${result.failed} 个`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/videos/analyze-all:
 *   post:
 *     summary: 批量分析所有视频的数据
 *     description: 对系统中所有视频执行数据分析
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: 批量分析完成
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
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     results:
 *                       type: array
 *       500:
 *         description: 批量分析失败
 */
router.post('/videos/analyze-all', async (req: Request, res: Response) => {
  try {
    const result = await analyticsService.analyzeVideosBatch();
    res.json(success(result, `批量分析完成: 成功 ${result.success} 个，失败 ${result.failed} 个`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/analytics/videos/{videoId}/history:
 *   get:
 *     summary: 获取视频的数据历史记录
 *     description: 返回指定视频的历史分析数据，用于趋势分析
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 返回记录数量限制
 *     responses:
 *       200:
 *         description: 成功获取历史数据
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
 *       404:
 *         description: 视频不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/videos/:videoId/history', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.videoId);
    const limit = parseInt(req.query.limit as string) || 30;
    
    if (isNaN(videoId)) {
      return res.status(400).json(error('无效的视频ID', 400));
    }
    
    const history = await analyticsService.getVideoAnalyticsHistory(videoId, limit);
    res.json(success(history));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 综合统计 =====

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: 获取系统整体数据概览
 *     description: 返回系统中所有账号和视频的汇总统计数据
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: 成功获取概览数据
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
 *                   type: object
 *                   properties:
 *                     totalAccounts:
 *                       type: integer
 *                     totalVideos:
 *                       type: integer
 *                     totalFollowers:
 *                       type: integer
 *                     totalViews:
 *                       type: integer
 *                     totalLikes:
 *                       type: integer
 *                     avgEngagementRate:
 *                       type: number
 *       500:
 *         description: 服务器错误
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await analyticsService.getSystemSummary();
    res.json(success(summary));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
