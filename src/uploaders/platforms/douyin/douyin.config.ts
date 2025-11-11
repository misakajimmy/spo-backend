/**
 * 抖音页面选择器配置
 * 统一管理所有的 CSS 选择器,方便维护和更新
 */
export const DouyinSelectors = {
  // 登录相关
  login: {
    phoneLoginText: 'text=手机号登录',
    qrcodeLoginText: 'text=扫码登录',
  },
  
  // 上传页面
  upload: {
    // 上传视频输入框
    fileInput: "div[class^='container'] input[type='file']",
    
    // 重新上传按钮
    reuploadButton: '[class^="long-card"] div:has-text("重新上传")',
    
    // 上传失败提示
    uploadFailedText: 'div.progress-div > div:has-text("上传失败")',
  },
  
  // 发布页面
  publish: {
    // 作品标题输入框 (两种可能的定位方式)
    titleInputV1: 'text=作品标题 >> .. >> xpath=following-sibling::div[1] >> input',
    titleInputV2: '.notranslate',
    
    // 话题/标签容器
    tagsContainer: '.zone-container',
    
    // 定时发布
    scheduleLabel: "[class^='radio']:has-text('定时发布')",
    scheduleInput: '.semi-input[placeholder="日期和时间"]',
    
    // 封面设置
    coverButton: 'text="选择封面"',
    setCoverButton: 'text="设置竖封面"',
    coverUploadInput: "div[class^='semi-upload upload'] >> input.semi-upload-hidden-input",
    coverConfirmButton: "div#tooltip-container button:visible:has-text('完成')",
    
    // 地理位置
    locationSelect: 'div.semi-select span:has-text("输入地理位置")',
    locationOptions: 'div[role="listbox"] [role="option"]',
    
    // 第三方平台同步
    thirdPartSwitch: '[class^="info"] > [class^="first-part"] div div.semi-switch',
    
    // 发布按钮
    publishButton: 'button:has-text("发布")',
  },
  
  // URL
  urls: {
    home: 'https://creator.douyin.com/',
    upload: 'https://creator.douyin.com/creator-micro/content/upload',
    publishV1: 'https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page',
    publishV2: 'https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page',
    manage: 'https://creator.douyin.com/creator-micro/content/manage**',
  }
};

/**
 * 抖音配置
 */
export const DouyinConfig = {
  // 标题最大长度
  maxTitleLength: 30,
  
  // 上传超时时间(毫秒)
  uploadTimeout: 300000, // 5分钟
  
  // 页面加载超时时间
  pageTimeout: 30000,
  
  // 等待上传完成的轮询间隔
  uploadCheckInterval: 2000,
};
