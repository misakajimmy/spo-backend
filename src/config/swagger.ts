import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SPO (Social Platform Operations) API',
      version: '1.0.0',
      description: `
        社交平台运营系统后端API文档
        
        ## 功能模块
        - **平台账号管理**: 多平台账号的登录、Cookie管理、信息同步
        - **资源库管理**: 素材资源的存储配置、浏览、搜索（只读）
        - **上传任务**: 视频上传任务的创建和管理（开发中）
        
        ## 支持平台
        - 抖音 (douyin)
        - Bilibili (bilibili) 
        - 小红书 (xiaohongshu)
        - 快手 (kuaishou)
        - 视频号 (tencent)
        - TikTok (tiktok)
      `,
      contact: {
        name: 'API Support',
        email: 'support@spo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5409',
        description: '开发服务器'
      },
      {
        url: 'http://localhost:3001',
        description: '生产服务器'
      }
    ],
    components: {
      schemas: {
        // 通用响应格式
        ApiResponse: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: '状态码'
            },
            message: {
              type: 'string',
              description: '响应消息'
            },
            data: {
              type: 'object',
              description: '响应数据'
            }
          }
        },
        
        // 平台账号
        PlatformAccount: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            platform: { 
              type: 'string',
              enum: ['douyin', 'bilibili', 'xiaohongshu', 'kuaishou', 'tencent', 'tiktok']
            },
            accountName: { type: 'string' },
            accountId: { type: 'string', nullable: true },
            cookiePath: { type: 'string' },
            userId: { type: 'string', nullable: true },
            username: { type: 'string', nullable: true },
            avatar: { type: 'string', nullable: true },
            followersCount: { type: 'integer', nullable: true },
            totalFavorited: { type: 'integer', nullable: true },
            description: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // 资源库配置
        ResourceLibrary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: '资源库名称' },
            type: { 
              type: 'string',
              enum: ['local', 'webdav', 'smb', 'ftp'],
              description: '资源库类型'
            },
            config: { 
              type: 'object',
              description: '资源库配置（根据类型不同有不同的配置）'
            },
            isActive: { type: 'boolean' },
            isDefault: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // 资源信息
        ResourceInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '文件/文件夹名称' },
            path: { type: 'string', description: '完整路径' },
            type: { 
              type: 'string',
              enum: ['video', 'image', 'audio', 'folder'],
              description: '资源类型'
            },
            size: { type: 'integer', description: '文件大小（字节）' },
            modifiedTime: { type: 'string', format: 'date-time' },
            extension: { type: 'string', description: '文件扩展名' },
            duration: { type: 'integer', description: '媒体时长（秒）' },
            resolution: {
              type: 'object',
              properties: {
                width: { type: 'integer' },
                height: { type: 'integer' }
              }
            }
          }
        },
        
        // 本地资源库配置
        LocalResourceConfig: {
          type: 'object',
          required: ['basePath'],
          properties: {
            basePath: { 
              type: 'string',
              description: '资源库根目录路径',
              example: 'D:\\Videos'
            },
            allowedExtensions: {
              type: 'array',
              items: { type: 'string' },
              description: '允许的文件扩展名',
              example: ['.mp4', '.avi', '.mov', '.mkv']
            },
            thumbnailCache: {
              type: 'string',
              description: '缩略图缓存目录'
            }
          }
        },
        
        // WebDAV资源库配置
        WebDAVResourceConfig: {
          type: 'object',
          required: ['url', 'username', 'password'],
          properties: {
            url: { 
              type: 'string',
              description: 'WebDAV服务器URL',
              example: 'https://dav.jianguoyun.com/dav/'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            password: {
              type: 'string',
              description: '密码'
            },
            basePath: {
              type: 'string',
              description: '基础路径',
              default: '/'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Platform',
        description: '平台管理'
      },
      {
        name: 'Account',
        description: '账号管理'
      },
      {
        name: 'Resource Library',
        description: '资源库管理'
      },
      {
        name: 'Resource Browse',
        description: '资源浏览'
      },
      {
        name: 'Config',
        description: '全局配置'
      },
      {
        name: 'Health',
        description: '健康检查'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/app.ts'
  ]
};

export default swaggerOptions;
