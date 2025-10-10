/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';

// ==================== 类型定义 ====================

/**
 * 获取当前时间
 */
function getCurrentTime(): string {
  return new Date().toLocaleString('zh-CN');
}

/**
 * 格式化文本（转大写）
 */
function formatText(text: string): string {
  return text.toUpperCase();
}

/**
 * 获取数据
 */
async function fetchData(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('数据获取失败:', error);
    throw error;
  }
}

// ==================== 暴露插件 API ====================

const myPluginAPI = {
  getCurrentTime,
  formatText,
  fetchData
};

contextBridge.exposeInMainWorld('myPluginAPI', myPluginAPI);

// ==================== 功能处理器导出 ====================

/**
 * 导出功能处理器
 * 类型定义来自 naimo.d.ts
 */
const handlers = {
  hello: {
    onEnter: async (params: any) => {
      console.log('Hello World 功能被触发');
      console.log('参数:', params);

      // 这里可以做一些初始化工作
      // 例如：加载数据、设置状态等

      // 发送日志
      if (typeof window !== 'undefined' && (window as any).naimo) {
        (window as any).naimo.log.info('插件已加载', { params });
      }
    }
  }
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handlers;
}

// ==================== 初始化 ====================

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload 脚本已初始化');
  console.log('当前时间:', getCurrentTime());
});

// ==================== 类型扩展 ====================

declare global {
  const customApi: typeof myPluginAPI;
}

