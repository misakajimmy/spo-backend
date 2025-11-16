/**
 * 主题库发布与归档功能测试
 * 
 * 测试步骤:
 * 1. 创建主题库
 * 2. 添加资源路径
 * 3. 获取视频列表(包含 isPublished 状态)
 * 4. 测试批量归档
 * 5. 测试批量取消归档
 * 6. 测试批量发布
 * 7. 测试统计信息
 */

const BASE_URL = 'http://localhost:3000/api';

// 辅助函数
async function request(method: string, path: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  return await response.json();
}

async function testThemePublishArchive() {
  console.log('🧪 开始测试主题库发布与归档功能\n');

  try {
    // 1. 创建主题库
    console.log('1️⃣ 创建主题库...');
    const createThemeRes = await request('POST', '/themes', {
      name: '测试主题库',
      description: '用于测试发布和归档功能',
      archiveFolderName: 'published', // 使用默认值
      accountIds: [1],
      resourcePaths: [
        {
          libraryId: 1,
          folderPath: '/test-videos',
        },
      ],
    });
    console.log('✅ 主题库创建成功:', createThemeRes.data.name);
    const themeId = createThemeRes.data.id;

    // 2. 获取视频列表
    console.log('\n2️⃣ 获取视频列表...');
    const videosRes = await request('GET', `/themes/${themeId}/videos`);
    console.log('✅ 找到视频:', videosRes.data.length);
    videosRes.data.forEach((video: any) => {
      console.log(`  - ${video.name} [${video.isPublished ? '已发布' : '未发布'}]`);
    });

    // 3. 获取统计信息
    console.log('\n3️⃣ 获取统计信息...');
    const statsRes = await request('GET', `/themes/${themeId}/statistics`);
    console.log('✅ 统计信息:', statsRes.data);
    console.log(`  - 未发布: ${statsRes.data.unpublished}`);
    console.log(`  - 已发布: ${statsRes.data.published}`);

    // 4. 测试批量归档(选择未发布的视频)
    const unpublishedVideos = videosRes.data.filter((v: any) => !v.isPublished);
    if (unpublishedVideos.length > 0) {
      console.log('\n4️⃣ 测试批量归档...');
      const archiveRes = await request('POST', `/themes/${themeId}/videos/archive`, {
        videoPaths: [unpublishedVideos[0].fullPath],
      });
      console.log('✅ 归档结果:', archiveRes.message);
      console.log(`  - 成功: ${archiveRes.data.archived}/${archiveRes.data.total}`);
    }

    // 5. 再次获取视频列表(验证归档效果)
    console.log('\n5️⃣ 验证归档效果...');
    const videosAfterArchive = await request('GET', `/themes/${themeId}/videos`);
    console.log('✅ 归档后视频列表:');
    videosAfterArchive.data.forEach((video: any) => {
      console.log(`  - ${video.name} [${video.isPublished ? '已发布' : '未发布'}]`);
    });

    // 6. 测试批量取消归档
    const publishedVideos = videosAfterArchive.data.filter((v: any) => v.isPublished);
    if (publishedVideos.length > 0) {
      console.log('\n6️⃣ 测试批量取消归档...');
      const unarchiveRes = await request('POST', `/themes/${themeId}/videos/unarchive`, {
        videoPaths: [publishedVideos[0].fullPath],
      });
      console.log('✅ 取消归档结果:', unarchiveRes.message);
      console.log(`  - 成功: ${unarchiveRes.data.unarchived}/${unarchiveRes.data.total}`);
    }

    // 7. 测试批量发布
    console.log('\n7️⃣ 测试批量发布...');
    const finalVideos = await request('GET', `/themes/${themeId}/videos`);
    const videosToPublish = finalVideos.data
      .filter((v: any) => !v.isPublished)
      .slice(0, 2);

    if (videosToPublish.length > 0) {
      const publishRes = await request('POST', `/themes/${themeId}/batch-publish`, {
        accountIds: [1],
        videoPaths: videosToPublish.map((v: any) => v.fullPath),
        autoArchive: true,
        title: '测试发布',
        tags: ['测试'],
      });
      console.log('✅ 批量发布结果:', publishRes.message);
      console.log(`  - 创建任务数: ${publishRes.data.totalTasks}`);
      console.log(`  - 账号数: ${publishRes.data.accountCount}`);
      console.log(`  - 视频数: ${publishRes.data.videoCount}`);
    }

    // 8. 最终统计
    console.log('\n8️⃣ 最终统计信息...');
    const finalStats = await request('GET', `/themes/${themeId}/statistics`);
    console.log('✅ 最终统计:', finalStats.data);

    console.log('\n🎉 测试完成!');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testThemePublishArchive();
