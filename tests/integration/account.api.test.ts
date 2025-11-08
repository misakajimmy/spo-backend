import request from 'supertest';
import express from 'express';
import cors from 'cors';
import accountRoutes from '../../src/routes/account.routes';
import { resetDatabase, closeDatabase } from '../helpers/db';

// 创建测试应用
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', accountRoutes);

describe('Account API Integration Tests', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/accounts', () => {
    it('应该返回所有账号', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .expect(200);

      expect(response.body).toMatchObject({
        code: 200,
        message: 'Success',
        data: [],
      });
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('应该返回指定 ID 的账号', async () => {
      // 先创建一个账号
      const createRes = await request(app)
        .post('/api/accounts/login/start')
        .send({
          platform: 'douyin',
          accountName: '测试账号',
        });

      // 这里实际上不会真正创建账号，因为需要完成登录流程
      // 所以这个测试需要模拟或者调整实现
    });

    it('查询不存在的账号应该返回 404', async () => {
      const response = await request(app)
        .get('/api/accounts/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        code: 404,
        message: '账号不存在',
      });
    });
  });

  describe('POST /api/accounts/login/start', () => {
    it('应该返回 sessionId', async () => {
      const response = await request(app)
        .post('/api/accounts/login/start')
        .send({
          platform: 'douyin',
          accountName: '测试账号',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.sessionId).toMatch(/^douyin_\d+$/);
    });

    it('缺少参数应该返回 400', async () => {
      const response = await request(app)
        .post('/api/accounts/login/start')
        .send({
          platform: 'douyin',
        })
        .expect(400);

      expect(response.body.code).toBe(400);
    });
  });

  describe('POST /api/accounts/login/cancel', () => {
    it('应该取消登录会话', async () => {
      // 先开始登录
      const startRes = await request(app)
        .post('/api/accounts/login/start')
        .send({
          platform: 'douyin',
          accountName: '测试账号',
        });

      const sessionId = startRes.body.data.sessionId;

      // 取消登录
      const response = await request(app)
        .post('/api/accounts/login/cancel')
        .send({ sessionId })
        .expect(200);

      expect(response.body.message).toBe('登录已取消');
    });

    it('缺少 sessionId 应该返回 400', async () => {
      const response = await request(app)
        .post('/api/accounts/login/cancel')
        .send({})
        .expect(400);

      expect(response.body.code).toBe(400);
    });
  });

  describe('GET /api/accounts/platform/:platform', () => {
    it('应该根据平台筛选账号', async () => {
      const response = await request(app)
        .get('/api/accounts/platform/douyin')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});
