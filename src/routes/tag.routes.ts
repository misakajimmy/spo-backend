import { Router, Request, Response } from 'express';
import { TagService } from '../services/tag.service';
import { success, error } from '../utils/response';

const router = Router();
const tagService = new TagService();

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: 创建关键词
 *     tags: [Tag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 关键词名称（不需要带#前缀）
 *                 example: 跑步
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json(error('缺少关键词名称'));
    }
    
    const tag = await tagService.createTag(name);
    res.json(success(tag, '关键词创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags/batch:
 *   post:
 *     summary: 批量创建关键词
 *     tags: [Tag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - names
 *             properties:
 *               names:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关键词名称列表
 *                 example: ["跑步", "健身", "减肥"]
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { names } = req.body;
    
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json(error('缺少关键词列表'));
    }
    
    const tags = await tagService.createTags(names);
    res.json(success(tags, '关键词批量创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: 获取所有关键词
 *     tags: [Tag]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    
    let tags;
    if (keyword && typeof keyword === 'string') {
      tags = await tagService.searchTags(keyword);
    } else {
      tags = await tagService.getAllTags();
    }
    
    res.json(success(tags));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: 获取单个关键词
 *     tags: [Tag]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 关键词ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tag = await tagService.getTag(id);
    
    if (!tag) {
      return res.status(404).json(error('关键词不存在', 404));
    }
    
    res.json(success(tag));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: 更新关键词
 *     tags: [Tag]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 关键词ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 新的关键词名称
 *                 example: 夜跑
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json(error('缺少关键词名称'));
    }
    
    const tag = await tagService.updateTag(id, name);
    res.json(success(tag, '关键词更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: 删除关键词
 *     tags: [Tag]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 关键词ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await tagService.deleteTag(id);
    res.json(success(null, '关键词删除成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/tags/batch/delete:
 *   post:
 *     summary: 批量删除关键词
 *     tags: [Tag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 关键词ID列表
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.post('/batch/delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(error('缺少关键词ID列表'));
    }
    
    await tagService.deleteTags(ids);
    res.json(success(null, '关键词批量删除成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
