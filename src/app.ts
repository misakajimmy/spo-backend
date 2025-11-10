import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';
import swaggerOptions from './config/swagger';
import accountRoutes from './routes/account.routes';
import configRoutes from './routes/config.routes';
import resourceRoutes from './routes/resource.routes';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger 文档
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve as unknown as express.RequestHandler, swaggerUi.setup(swaggerSpec) as any);

// 路由
app.use('/api', accountRoutes);
app.use('/api', configRoutes);
app.use('/api/resources', resourceRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 健康检查
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: SPO Backend is running
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPO Backend is running' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
  });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`\n🚀 Server is running on http://localhost:${config.port}`);
  console.log(`📄 API Docs: http://localhost:${config.port}/api-docs`);
  console.log(`🍪 Cookies: ${config.cookiesDir}\n`);
});

export default app;
