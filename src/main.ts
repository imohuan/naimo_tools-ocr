/// <reference path="../typings/naimo.d.ts" />

import './style.css';

// ==================== 类型定义 ====================

// ==================== 热重载 ====================
if (import.meta.hot) {
  // 监听 preload 文件变化事件
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data);
    // 触发 preload 构建
    console.log('🔨 正在触发 preload 构建...');
    try {
      const response = await fetch('/__preload_build');
      const result = await response.json();
      if (result.success) {
        console.log('✅ Preload 构建完成');
        // 构建成功后，触发热重载
        await window.naimo.hot()
        console.log('🔄 Preload 热重载完成');
        location.reload()
      } else {
        console.error('❌ Preload 构建失败');
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error);
    }
  })
}

// =======================================================

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log('应用初始化...');

  // 设置按钮点击事件
  const testBtn = document.getElementById('testBtn');
  const output = document.getElementById('output');

  if (testBtn && output) {
    testBtn.addEventListener('click', async () => {
      try {
        // 使用 Naimo API
        naimo.log.info('按钮被点击了！');

        // 使用自定义 API
        const time = customApi.getCurrentTime();
        const formatted = customApi.formatText('hello world');

        // 显示结果
        output.innerHTML = `
          <div class="result">
            <p><strong>当前时间：</strong>${time}</p>
            <p><strong>格式化文本：</strong>${formatted}</p>
          </div>
        `;

        // 发送通知
        await naimo.system.notify('测试完成！', '我的插件');
      } catch (error) {
        console.error('操作失败:', error);
        naimo.log.error('操作失败', error);
      }
    });
  }

  // 记录初始化完成
  naimo.log.info('应用初始化完成');
}

// ==================== 入口 ====================

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

