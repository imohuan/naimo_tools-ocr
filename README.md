# OCR 翻译识别插件

> 智能截图识别文字并翻译，支持多种语言互译

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/naimo-plugin-orange.svg" alt="Naimo Plugin">
</p>

## ✨ 功能特性

- ✅ 智能截图识别文字
- ✅ 多语言翻译支持
- ✅ 实时预览和编辑
- ✅ 文本样式自定义
- ✅ 图片缩放和拖拽
- ✅ 快速复制和保存
- ✅ 使用 Tailwind CSS 现代化界面

## 📸 截图预览

![OCR翻译识别](./screenshot.png)

## 🚀 快速开始

### 前置要求

- Node.js >= 16
- pnpm >= 8
- Naimo Tools 客户端

### 安装依赖

```bash
# 安装项目依赖
pnpm install

# 安装 Electron 类型定义（推荐，不下载完整 Electron）
pnpm run add-electron-types
```

**重要说明：**

- `add-electron-types` 命令会跳过 Electron 二进制文件下载，仅安装类型定义
- 这样可以节省大量磁盘空间（约 200MB+）和安装时间
- 插件开发只需要类型定义即可获得完整的代码提示和类型检查

### 开发模式

```bash
pnpm run dev
```

### 构建插件

```bash
pnpm run build
```

构建产物在 `dist/` 目录：

- `dist/manifest.json` - 插件配置文件
- `dist/index.html` - 前端页面
- `dist/preload.js` - Preload 脚本
- `dist/assets/` - 静态资源

### 部署到 Naimo Tools

```bash
pnpm run deploy
```

或手动将 `dist/` 目录复制到 Naimo Tools 的插件目录。

## 📖 使用方法

### 1. 配置 API 密钥

首次使用需要配置腾讯云 API 密钥：

1. 在 Naimo Tools 中打开插件设置
2. 填写腾讯云 Secret ID 和 Secret Key
3. 保存配置

### 2. 开始使用

#### 方式一：OCR 翻译

1. 在 Naimo 搜索框输入 "OCR" 或 "翻译"
2. 选择 "OCR 翻译" 功能
3. 点击截图按钮或打开图片
4. 等待识别完成
5. 查看和复制识别结果

#### 方式二：快速截图识别

1. 在 Naimo 搜索框输入 "快速 OCR"
2. 选择 "快速截图识别" 功能
3. 自动启动截图工具
4. 截图后自动识别

### 3. 功能说明

#### 控制栏功能

- **📷 截图** - 截取屏幕区域进行 OCR 识别
- **📁 打开图片** - 从本地选择图片进行识别
- **🔄 重置视图** - 重置图片缩放和位置
- **💾 保存图片** - 保存带有识别结果的图片
- **📋 复制文本** - 复制识别的文本到剪贴板
- **⚙️ 设置** - 打开设置面板

#### 设置选项

**语言设置：**

- 源语言：自动检测、中文、英文、日文等
- 目标语言：中文、英文、日文、韩文等

**显示选项：**

- 原图显示
- 原文显示
- 译文显示
- 边框显示

**文本样式：**

- 文字颜色
- 文字大小
- 粗体/下划线/自动换行
- 位置偏移调整

**背景和边框：**

- 背景颜色和透明度
- 边框颜色和宽度

## 🛠️ 开发指南

### 技术栈

- **TypeScript** - 类型安全的开发体验
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 现代化的 CSS 框架
- **Naimo Plugin API** - 插件开发 API

### 目录结构

```
ocr-plugin/
├── manifest.json           # 插件配置（根目录）
├── index.html              # HTML 模板（根目录）
├── package.json            # 项目配置
├── tailwind.config.js      # Tailwind 配置
├── postcss.config.js       # PostCSS 配置
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── src/
│   ├── main.ts             # 前端入口（TypeScript）
│   ├── preload.ts          # Preload 脚本（TypeScript）
│   └── style.css           # 样式文件（Tailwind）
├── dist/                   # 构建产物
│   ├── manifest.json       # 复制的配置文件
│   ├── index.html          # 打包后的页面
│   ├── preload.js          # 编译后的 Preload
│   └── assets/             # 静态资源
├── typings/
│   └── naimo.d.ts          # Naimo API 类型定义
├── scripts/
│   └── deploy-to-build.js  # 部署脚本
├── .gitignore
└── README.md
```

### API 使用

#### 获取设置（使用新 API）

```typescript
// 在 src/main.ts 中
const secretId = await window.naimo.storage.getItem("tencentSecretId");
const secretKey = await window.naimo.storage.getItem("tencentSecretKey");
```

**重要：** 本插件已更新为使用新的 `naimo.storage.getItem()` API，key 为配置中的设置项的 `name` 字段。

#### OCR 和翻译

```typescript
// 在 src/preload.ts 中实现
const results = await ocrPluginAPI.performOCR({
  imageData: base64Image,
  secretId: "your-secret-id",
  secretKey: "your-secret-key",
  sourceLang: "auto",
  targetLang: "zh",
});
```

#### 截图功能

```typescript
// 使用 Naimo API 截图
const imageData = await ocrPluginAPI.takeScreenshot();
```

### 开发建议

1. **使用 TypeScript**

   - 获得完整的类型提示
   - 避免运行时错误
   - 提高代码质量

2. **使用 Tailwind CSS**

   - 快速构建界面
   - 保持样式一致性
   - 响应式设计

3. **参考类型定义**

   - 查看 `typings/naimo.d.ts` 了解完整的 API
   - 查看 `schema.json` 了解配置规范

4. **测试建议**
   - 测试不同图片格式
   - 测试不同语言识别
   - 测试边界情况

## 🔧 常见问题

### 1. 截图失败

**原因：** 权限不足或系统限制  
**解决：** 检查 Naimo Tools 的屏幕录制权限（macOS）或管理员权限（Windows）

### 2. OCR 识别失败

**原因：** API 密钥未配置或无效  
**解决：**

1. 检查 API 密钥是否正确
2. 确认腾讯云账号有足够余额
3. 检查网络连接

### 3. 构建失败

**原因：** 依赖未安装或版本不兼容  
**解决：**

```bash
# 清除依赖重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run add-electron-types
```

### 4. 类型错误

**原因：** TypeScript 配置问题  
**解决：**

```bash
# 运行类型检查
pnpm run type-check
```

## 📝 更新日志

### v1.0.0 (2025-10-10)

- ✨ 初始版本发布
- ✅ 支持 OCR 文字识别
- ✅ 支持多语言翻译
- ✅ 使用 Tailwind CSS 重构界面
- ✅ 更新为新的 Naimo Storage API
- ✅ 添加完整的 TypeScript 类型支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Naimo Tools 官网](https://naimo.tools)
- [插件开发文档](https://docs.naimo.tools/plugin)
- [腾讯云 OCR](https://cloud.tencent.com/product/ocr)
- [腾讯云翻译](https://cloud.tencent.com/product/tmt)

## 💡 致谢

感谢以下项目和工具：

- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [腾讯云](https://cloud.tencent.com/)

---

**Made with ❤️ by Naimo Tools Team**
