---
description: 智能创建 Naimo 插件 - 根据需求自动生成完整的插件代码
---

用户需求描述：

$ARGUMENTS

## ⚠️ 重要提示

**本项目使用 TypeScript + Vite + pnpm 进行开发！**

### 📦 包管理器

- **使用 pnpm** 而不是 npm 或 yarn
- 所有命令使用 `pnpm` 或 `pnpm run`

### 📁 文件位置说明

**必须在以下位置创建和修改文件，不要在根目录创建源码文件！**

- **配置文件**：`manifest.json`（根目录）
- **Preload 脚本**：`src/preload.ts`（TypeScript）
- **前端代码**：`src/main.ts`（TypeScript）
- **样式文件**：`src/style.css`
- **HTML 模板**：`index.html`（根目录）
- **其他文件**：`README.md`、`.gitignore`、`package.json` 等

### 🔨 构建流程

**本项目使用 pnpm 作为包管理器！**

#### 首次安装依赖

```bash
pnpm install                    # 安装项目依赖
pnpm run add-electron-types     # 仅安装 Electron 类型定义（推荐）
```

**重要说明：**

- 插件开发只需要 Electron 的**类型定义**，不需要完整的 Electron 二进制文件
- `add-electron-types` 命令会跳过 Electron 二进制下载，仅安装类型支持
- 这样可以节省大量磁盘空间和安装时间
- **注意：** `add-electron-types` 命令使用的是 Windows PowerShell 语法（`$env:ELECTRON_SKIP_DOWNLOAD=1`）

#### 开发和构建

```bash
pnpm run dev           # 开发模式
pnpm run build         # 构建所有文件
pnpm run build:main    # 仅构建前端
pnpm run build:preload # 仅构建 preload
pnpm run type-check    # TypeScript 类型检查
```

#### 构建产物

构建产物在 `dist/` 目录：

- `dist/manifest.json` - 复制的配置文件
- `dist/index.html` - 打包后的 HTML
- `dist/preload.js` - 编译后的 Preload 脚本
- `dist/js/` - 打包后的前端 JS
- `dist/assets/` - 静态资源

**重要**：manifest.json 会被复制到 dist 目录，所以路径是相对于 dist 目录的：

- `"preload": "./preload.js"`（不是 `./dist/preload.js`）
- `"main": "./index.html"`（不是 `./dist/index.html`）

#### 路径配置说明

构建后的目录结构：

```
dist/
├── manifest.json    ← 从根目录复制
├── index.html       ← 从 Vite 构建产物
├── preload.js       ← 从 TypeScript 编译
├── js/
└── assets/
```

Naimo 会加载 `dist/` 目录作为插件，所以：

- manifest.json 在 `dist/manifest.json`
- 它引用的文件路径是相对于自己的位置
- `./index.html` 指向 `dist/index.html`
- `./preload.js` 指向 `dist/preload.js`

---

## 目标

根据用户的功能需求，自动生成一个完整的 Naimo Tools 插件，包括：

1. `manifest.json` - 插件配置文件（根目录）
2. `src/preload.ts` - 功能处理脚本（TypeScript）
3. `src/main.ts` - 前端逻辑代码（TypeScript）
4. `src/style.css` - 样式文件
5. `index.html` - UI 界面（根目录）
6. `.gitignore` - Git 忽略文件
7. `README.md` - 插件说明文档
8. `package.json` - 项目配置

## 重要文件引用

在生成插件代码前，需要引用以下关键文件：

### 📋 配置规范文件

**路径：** `../schema.json`  
**用途：** 定义 `manifest.json` 的完整规范，包括所有字段的类型、格式、枚举值等

### 📚 API 类型定义文件

**路径：** `../typings/naimo.d.ts`  
**用途：** 定义所有可用的 Naimo API，包括接口、参数、返回值类型等

### 使用规则

1. **生成 manifest.json 时：**
   - 必须先 `read_file('../schema.json')`
   - 根据 schema 的定义生成配置
   - 遵循 schema 中的验证规则

2. **使用 Naimo API 时：**
   - 必须先 `read_file('../typings/naimo.d.ts')`
   - 根据类型定义生成正确的 API 调用
   - 确保参数和返回值类型正确

3. **生成示例代码时：**
   - 参考 naimo.d.ts 中的接口定义
   - 添加正确的类型注释
   - 提供准确的 API 使用示例

---

## 执行步骤

### 1. 需求分析

仔细分析用户的需求描述，确定以下关键信息：

**插件基本信息：**

- 插件 ID（英文，小写字母、数字、短横线）
- 插件名称（中文或英文）
- 插件描述
- 插件分类（从以下选择）：
  - `efficient_office` - 高效办公
  - `ai_artificial_intelligence` - AI人工智能
  - `developer_essentials` - 程序员必备
  - `record_ideas` - 记录想法
  - `image_video` - 图像视频
  - `media_tools` - 媒体工具
  - `system_tools` - 系统工具
  - `study_well` - 好好学习
  - `brainstorming` - 脑洞大开
  - `other` - 其他

**功能分析：**

- 功能数量（一个插件可以包含多个功能）
- 每个功能的：
  - 功能标识（path）
  - 功能名称
  - 功能类型（text/regex/img/files）
  - 触发条件
  - 处理逻辑

**UI 需求：**

- 是否需要 UI 界面
- 界面布局和交互
- 样式风格

**技术栈：**

- 是否需要使用第三方库
- 是否需要网络请求
- 是否需要数据存储

### 2. 确定功能类型

根据需求选择合适的功能类型：

#### type: "text" - 文本搜索

**适用场景：**

- 搜索、查询、转换文本
- 通用文本处理功能
- 匹配用户输入的关键字

**示例：**

- 翻译插件
- 计算器
- 单位转换

**配置：**

```json
{
  "type": "text",
  "anonymousSearchFields": ["关键词1", "关键词2"],
  "minLength": 1,
  "maxLength": 1000
}
```

#### type: "regex" - 正则匹配

**适用场景：**

- 匹配特定格式的内容
- URL、邮箱、电话号码等
- 需要精确模式匹配

**示例：**

- URL 打开器
- 邮箱处理
- 身份证验证

**配置：**

```json
{
  "type": "regex",
  "match": "^https?://",
  "exclude": "^file://",
  "minLength": 10
}
```

#### type: "img" - 图片处理

**适用场景：**

- 图片识别、编辑、转换
- OCR 文字识别
- 图片压缩、美化

**示例：**

- OCR 识别
- 图片压缩
- 图片转 Base64

**配置：**

```json
{
  "type": "img",
  "description": "处理图片"
}
```

**接收参数：**

```javascript
{
  type: "img",
  data: "data:image/png;base64,...",
  originalFile: { name, path, size }
}
```

#### type: "files" - 文件处理

**适用场景：**

- 文件批量处理
- 文件格式转换
- 文件分析统计

**示例：**

- 文件重命名
- 图片批量压缩
- 文件信息提取

**配置：**

```json
{
  "type": "files",
  "fileType": "file",
  "extensions": [".jpg", ".png"],
  "minLength": 1,
  "maxLength": 100
}
```

### 3. 生成 manifest.json

**文件位置：** 根目录 `manifest.json`

根据需求分析生成插件配置文件。

**重要：** 在生成 `manifest.json` 之前，**必须先读取**以下文件以了解完整的配置规范：

📄 **配置规范文件：** `../schema.json`

**操作步骤：**

1. 使用 `read_file` 工具读取 `../schema.json`
2. 根据 schema 中的定义生成符合规范的配置
3. 确保所有必需字段都已填写
4. 参考 schema 中的 examples 和 description

**配置文件结构：**

- 根据 schema.json 中的 `required` 字段确定必需字段
- 根据 schema.json 中的 `properties` 确定可用字段
- 根据 schema.json 中的 `definitions.feature` 生成 feature 配置
- 遵循 schema.json 中的格式验证规则（pattern、enum 等）

**重要配置项：**

```json
{
  "main": "./index.html", // manifest.json 在 dist/ 目录，所以是相对路径
  "preload": "./preload.js" // 同样是相对于 dist/ 目录的路径
}
```

**注意**：manifest.json 在构建后会被复制到 dist/ 目录，所以 main 和 preload 路径都是相对于 dist/ 目录的。

### 4. 生成 src/preload.ts

**文件位置：** `src/preload.ts`（TypeScript）

根据功能类型和处理逻辑生成 Preload 脚本。

**基本结构：**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";

// ==================== 类型定义 ====================

/**
 * 自定义插件 API 接口
 */
interface MyPluginAPI {
  // 定义你的 API 接口
}

// ==================== 工具函数 ====================

/**
 * 示例工具函数
 */
function myUtilityFunction(): void {
  // 实现逻辑
}

// ==================== 暴露 API（可选） ====================

const myPluginAPI: MyPluginAPI = {
  // 实现 API
};

contextBridge.exposeInMainWorld("myPluginAPI", myPluginAPI);

// ==================== 功能处理器导出 ====================

/**
 * 导出功能处理器
 * 类型定义来自 naimo.d.ts
 */
const handlers: import("../typings/naimo").PluginExports = {
  // 功能标识对应 manifest.json 中的 path
  "feature-path": {
    onEnter: async (params: any) => {
      try {
        // 获取参数
        console.log("功能被触发，参数:", params);

        // 处理逻辑
        // ...

        // 发送日志（注意：preload 中不能直接访问 window.naimo）
        // 应该在渲染进程中处理或通过 contextBridge 暴露
      } catch (error) {
        console.error("错误:", error);
      }
    },
  },
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    myPluginAPI: MyPluginAPI;
  }
}
```

**根据功能类型生成代码：**

**text 类型：**

```typescript
"text-handler": {
  onEnter: async (params: any) => {
    const text = params.text; // 用户输入的文本
    // 处理文本...
  }
}
```

**img 类型：**

```typescript
"img-handler": {
  onEnter: async (params: any) => {
    const imageData = params.data; // base64 图片数据
    const file = params.originalFile; // 原始文件信息
    // 处理图片...
  }
}
```

**files 类型：**

```typescript
"files-handler": {
  onEnter: async (params: any) => {
    const files = params.data; // 文件列表
    files.forEach((file: any) => {
      console.log(file.name, file.path, file.size);
    });
    // 处理文件...
  }
}
```

### 5. 生成前端文件

#### 5.1 生成 index.html

**文件位置：** 根目录 `index.html`

**基本模板：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>插件名称</title>
  </head>
  <body>
    <div id="app">
      <div class="container">
        <h1>🎯 插件名称</h1>
        <!-- 你的 UI 内容 -->
      </div>
    </div>
    <!-- TypeScript 入口文件 -->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**注意：**

- 使用 `<script type="module" src="/src/main.ts"></script>` 引入 TypeScript 文件
- Vite 会自动处理 TypeScript 编译
- 样式在 `src/style.css` 中定义，由 `main.ts` 导入

#### 5.2 生成 src/main.ts

**文件位置：** `src/main.ts`（TypeScript）

**基本模板：**

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

// ==================== 类型定义 ====================

type NaimoAPI = typeof window.naimo;
type MyPluginAPI = typeof window.myPluginAPI;

// ==================== 主逻辑 ====================

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log("应用初始化...");

  // 获取 Naimo API
  const naimo: NaimoAPI = window.naimo;

  // 获取自定义插件 API（如果在 preload 中暴露了）
  const myAPI: MyPluginAPI = window.myPluginAPI;

  // 你的业务逻辑
  // ...

  // 记录初始化完成
  naimo.log.info("应用初始化完成");
}

// ==================== 入口 ====================

// 等待 DOM 加载完成
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

#### 5.3 生成 src/style.css

**文件位置：** `src/style.css`

样式文件会被 Vite 自动处理。参考模板中的 `src/style.css`，包含：

- CSS 变量定义
- 基础样式
- 组件样式
- 响应式设计
- 工具类

### 6. 生成其他文件

#### 6.1 .gitignore

```
node_modules/
dist/
*.log
.DS_Store
Thumbs.db
```

#### 6.2 README.md

````markdown
# 插件名称

> 插件描述

## 功能特性

- ✅ 功能1
- ✅ 功能2
- ✅ 功能3

## 使用方法

1. 将插件文件夹复制到 Naimo Tools 的 `plugins` 目录
2. 重启 Naimo Tools
3. 在搜索框中输入关键词触发插件

## 开发说明

### 技术栈

- TypeScript
- Vite
- Naimo Tools Plugin API

### 目录结构

\`\`\`
plugin-name/
├── manifest.json # 插件配置
├── index.html # HTML 模板
├── package.json # 项目配置
├── vite.config.ts # Vite 配置
├── tsconfig.json # TypeScript 配置
├── src/
│ ├── main.ts # 前端入口
│ ├── preload.ts # Preload 脚本
│ └── style.css # 样式文件
├── dist/ # 构建产物
│ ├── index.html
│ ├── preload.js
│ ├── js/
│ └── assets/
├── typings/
│ └── naimo.d.ts # 类型定义
├── README.md # 说明文档
└── .gitignore # Git 忽略文件
\`\`\`

### 开发指南

1. 安装依赖：
   ```bash
   pnpm install                    # 安装项目依赖
   pnpm run add-electron-types     # 安装 Electron 类型定义（仅需类型，不下载二进制）
   ```
````

2. 开发模式：`pnpm run dev`
3. 构建插件：`pnpm run build`
4. 类型检查：`pnpm run type-check`

## 版本历史

### v1.0.0

- 初始版本

## 许可证

MIT

````

#### 6.3 package.json

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "插件描述",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "pnpm run type-check && pnpm run build:main && pnpm run build:preload",
    "build:main": "vite build",
    "build:preload": "node scripts/build-preload.js",
    "preview": "vite preview",
    "add-electron-types": "$env:ELECTRON_SKIP_DOWNLOAD=1; pnpm install electron --save-dev",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["naimo", "plugin", "electron"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/naimo_tools-plugin-name.git"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.5"
  },
  "dependencies": {}
}
```

**说明：**
- `add-electron-types` 命令用于安装 Electron 类型定义（不下载完整的 Electron 二进制文件）
- 该命令使用 Windows PowerShell 语法，如果在其他系统上，请手动设置 `ELECTRON_SKIP_DOWNLOAD=1` 环境变量`

### 7. TypeScript 类型支持说明

本项目默认使用 TypeScript，类型支持已经内置。

#### 在 src/preload.ts 中

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";

// 完整的类型支持
const handlers: import("../typings/naimo").PluginExports = {
  // ...
};
```

#### 在 src/main.ts 中

```typescript
/// <reference path="../typings/naimo.d.ts" />

// 使用类型推断
const naimo = window.naimo; // 自动获得完整类型

// 或显式声明类型
type NaimoAPI = typeof window.naimo;
const naimo: NaimoAPI = window.naimo;
```

#### 自定义类型扩展

在代码中可以扩展全局类型：

```typescript
declare global {
  interface Window {
    myPluginAPI: MyPluginAPI;
  }
}
```

## Naimo API 使用指南

**重要：** 在编写代码使用 Naimo API 之前，**必须先读取**以下文件以了解完整的 API 定义：

📄 **API 类型定义文件：** `../typings/naimo.d.ts`

### 使用步骤

#### 1. 读取 API 定义

在开始编写插件代码前，使用 `read_file` 工具读取 `../typings/naimo.d.ts` 文件，了解：

- 所有可用的 API 接口
- 每个 API 的参数类型
- 返回值类型
- API 的详细说明

#### 2. 在 Preload 脚本中的注意事项

**文件位置：** `src/preload.ts`

在 Preload 环境中：

- ✅ 可以使用 Node.js 模块（如 `import`/`require`）
- ✅ 可以通过 `contextBridge` 暴露自定义 API
- ✅ 可以在 `onEnter` 等钩子中执行逻辑
- ❌ **不能直接访问** `window.naimo` API（仅在渲染进程可用）
- ❌ **不能直接操作** DOM 元素

**正确示例：**

```typescript
// src/preload.ts
const handlers: import("../typings/naimo").PluginExports = {
  "my-feature": {
    onEnter: async (params: any) => {
      // ✅ 可以执行逻辑
      console.log("参数:", params);

      // ✅ 可以处理数据
      const result = processData(params.text);

      // ❌ 不能访问 window.naimo（这在渲染进程中）
      // window.naimo.log.info('...');  // 错误！
    },
  },
};
```

#### 3. 在渲染进程中使用 API

**文件位置：** `src/main.ts`

在渲染进程中：

- ✅ 通过 `window.naimo` 访问所有 API
- ✅ 所有 API 调用都是异步的（返回 Promise）
- ✅ 可以操作 DOM 元素
- ✅ 参考 `naimo.d.ts` 中的接口定义使用正确的参数

**正确示例：**

```typescript
// src/main.ts
async function initApp(): Promise<void> {
  const naimo = window.naimo;

  // ✅ 可以使用所有 naimo API
  await naimo.log.info("应用初始化");

  // ✅ 可以操作 DOM
  const button = document.getElementById("myBtn");
  button?.addEventListener("click", async () => {
    await naimo.system.notify("按钮被点击");
  });
}
```

### API 分类

根据 `naimo.d.ts` 文件，Naimo 提供以下 API 模块：

- `window.naimo.log` - 日志系统
- `window.naimo.window` - 窗口管理
- `window.naimo.db` - 文档数据库
- `window.naimo.storage` - 键值存储
- `window.naimo.clipboard` - 剪贴板
- `window.naimo.shell` - Shell 操作
- `window.naimo.system` - 系统信息
- `window.naimo.screen` - 屏幕操作
- `window.naimo.dialog` - 对话框
- `window.naimo.input` - 输入模拟
- `window.naimo.automation` - 网页自动化
- `window.naimo.ubrowser` - 可编程浏览器
- `window.naimo.ibrowser` - 即时浏览器

**生成代码时：**

1. 先读取 `naimo.d.ts` 了解所需 API 的完整定义
2. 根据类型定义生成正确的调用代码
3. 确保参数类型和返回值处理正确
4. 添加必要的错误处理

## 实现建议

### 1. 错误处理

**必须**使用 try-catch 包裹所有可能出错的代码：

```javascript
onEnter: async (params, api) => {
  try {
    // 业务逻辑
  } catch (error) {
    console.error("错误:", error);
    window.naimo?.log?.error("操作失败", error);
  }
};
```

### 2. 参数验证

在处理前验证参数：

```javascript
if (!params || !params.text) {
  window.naimo?.log?.warn("参数无效");
  return;
}
```

### 3. 用户反馈

提供清晰的用户反馈：

```javascript
// 开始处理
window.naimo?.system?.notify("正在处理...");

// 处理完成
window.naimo?.system?.notify("处理完成！", "成功");

// 处理失败
window.naimo?.system?.notify("处理失败", "错误");
```

### 4. 性能优化

- 避免在 `onEnter` 中执行耗时操作
- 使用异步操作（`async/await`）
- 缓存计算结果

### 5. 代码组织

- 将复杂逻辑拆分为独立函数
- 使用清晰的命名
- 添加注释说明

## 命名规范

### 插件 ID

- 格式：`功能描述-plugin`
- 示例：`translate-plugin`, `ocr-plugin`, `image-compress-plugin`
- 规则：小写字母、数字、短横线

### 功能 path

- 格式：`功能描述`
- 示例：`translate-text`, `compress-image`, `extract-text`
- 规则：小写字母、数字、短横线

### 仓库命名

- 格式：`naimo_tools-功能描述-plugin`
- 示例：`naimo_tools-translate-plugin`

## 输出要求

生成代码时：

1. **完整性**：生成所有必需的文件
2. **可用性**：代码可以直接使用，无需修改
3. **规范性**：遵循 Naimo 插件开发规范
4. **注释**：关键代码添加注释
5. **美观**：代码格式整洁，易于阅读

## 示例输出

**先显示文件结构：**

```
example-plugin/
├── manifest.json        # 插件配置
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── src/
│   ├── main.ts          # 前端入口（TypeScript）
│   ├── preload.ts       # Preload 脚本（TypeScript）
│   └── style.css        # 样式文件
├── scripts/
│   └── build-preload.js # Preload 构建脚本
├── typings/
│   └── naimo.d.ts       # 类型定义（从模板复制）
├── .gitignore
└── README.md
```

**然后逐个显示文件内容：**

### manifest.json（根目录，构建后会复制到 dist/）

```json
{
  "$schema": "./schema.json",
  "id": "example-plugin",
  "name": "示例插件",
  "version": "1.0.0",
  "author": "你的名字",
  "icon": "🎯",
  "description": "这是一个示例插件",
  "category": "other",
  "enabled": true,
  "main": "./index.html",
  "preload": "./preload.js",
  "feature": [
    {
      "path": "example",
      "name": "示例功能",
      "icon": "✨",
      "description": "示例功能描述",
      "type": "text",
      "weight": 100,
      "lifecycleType": "reuse",
      "singleton": true,
      "anonymousSearchFields": ["示例", "example"]
    }
  ]
}
```

**重要**：路径 `./index.html` 和 `./preload.js` 是相对于 manifest.json 所在目录（dist/）的路径。

### src/preload.ts

```typescript
/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";

// 功能处理器
const handlers: import("../typings/naimo").PluginExports = {
  example: {
    onEnter: async (params: any) => {
      console.log("示例功能被触发", params);
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
```

### src/main.ts

```typescript
/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

async function initApp(): Promise<void> {
  const naimo = window.naimo;
  naimo.log.info("插件初始化完成");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
```

**最后提供使用说明：**

```
## 开发流程

1. 安装依赖
   ```bash
   pnpm install                    # 安装项目依赖
   pnpm run add-electron-types     # 安装 Electron 类型定义（推荐）
   ```

2. 开发模式
   ```bash
   pnpm run dev
   ```

3. 构建插件
   ```bash
   pnpm run build
   ```

4. 测试插件
   - 将整个插件文件夹复制到 Naimo Tools 的 plugins 目录
   - 重启 Naimo Tools
   - 在搜索框中输入关键词测试

## 测试建议

- 测试正常输入
- 测试边界情况
- 测试错误处理
- 使用 TypeScript 类型检查：`pnpm run type-check`

## 开发建议

- 使用 VSCode 获得完整的 TypeScript 类型提示
- **在 src/ 目录下编写代码，不要在根目录创建 .ts/.js 文件**
- 参考 ../typings/naimo.d.ts 了解完整的 API
- 参考 ../schema.json 了解配置规范
- 构建后检查 dist/ 目录确保文件正确生成
- **首次开发时记得运行** `pnpm run add-electron-types` 安装 Electron 类型定义
```

---

## 生成流程总结

### 第 1 步：读取规范文件

```
read_file('../schema.json')          # 读取配置规范
read_file('../typings/naimo.d.ts')   # 读取 API 定义
read_file('src/preload.ts')          # 参考 Preload 模板
read_file('src/main.ts')             # 参考前端模板
read_file('package.json')            # 了解项目配置
```

### 第 2 步：分析需求

根据用户需求确定：

- 插件基本信息（ID、名称、描述、分类）
- 功能类型（text/regex/img/files）
- UI 需求（是否需要界面）
- 技术栈（是否需要第三方库）

### 第 3 步：生成文件

**按照以下顺序生成文件：**

1. **manifest.json**（根目录，构建后会复制到 dist/）
   - 基于 schema.json 生成
   - `preload` 设置为 `./preload.js`（相对于 dist/ 目录）
   - `main` 设置为 `./index.html`（相对于 dist/ 目录）

2. **src/preload.ts**（TypeScript）
   - 基于 naimo.d.ts 使用正确的类型
   - 实现 `onEnter` 等钩子函数
   - 不要访问 `window.naimo`（仅在渲染进程可用）

3. **src/main.ts**（TypeScript）
   - 导入 `./style.css`
   - 使用 `window.naimo` API
   - 实现 UI 逻辑

4. **src/style.css**
   - 定义 CSS 变量
   - 实现组件样式
   - 添加响应式设计

5. **index.html**（根目录）
   - 使用 `<script type="module" src="/src/main.ts"></script>`
   - 定义基本的 HTML 结构

6. **其他文件**
   - package.json（项目配置）
   - .gitignore（Git 忽略）
   - README.md（说明文档）

### 第 4 步：验证和说明

1. **验证文件位置**
   - ✅ `src/preload.ts`（不是根目录的 preload.js）
   - ✅ `src/main.ts`（不是根目录的 main.js）
   - ✅ `src/style.css`
   - ✅ `manifest.json`（根目录）
   - ✅ `index.html`（根目录）

2. **提供构建说明**

   ```bash
   pnpm install                    # 安装依赖
   pnpm run add-electron-types     # 安装 Electron 类型定义（推荐）
   pnpm run build                  # 构建插件
   ```

3. **提供测试说明**
   - 将插件文件夹复制到 Naimo Tools 的 plugins 目录
   - 重启 Naimo Tools
   - 测试功能

---

## ⚠️ 重要提醒

**生成代码时务必注意：**

1. **包管理器**
   - ✅ 使用 `pnpm` 而不是 `npm` 或 `yarn`
   - ✅ 所有命令都使用 `pnpm run`

2. **文件位置**
   - ❌ 不要在根目录创建 `preload.js`
   - ❌ 不要在根目录创建 `main.js` 或 `script.js`
   - ✅ 必须在 `src/` 目录下创建 `.ts` 文件

3. **使用 TypeScript**
   - ✅ 所有代码使用 TypeScript 语法
   - ✅ 添加类型注解
   - ✅ 使用 `import`/`export` 而不是 `require`

4. **Electron 类型安装**
   - ✅ **只需要类型定义，不需要完整的 Electron**
   - ✅ 运行 `pnpm run add-electron-types` 安装类型（跳过二进制下载）
   - ✅ 这样可以节省大量磁盘空间（Electron 完整安装约 200MB+）
   - ⚠️ `add-electron-types` 命令使用 Windows PowerShell 语法

5. **manifest.json 配置**
   - ✅ `"preload": "./preload.js"`（相对于 dist/ 目录，不是 `./dist/preload.js`）
   - ✅ `"main": "./index.html"`（相对于 dist/ 目录，不是 `./dist/index.html`）
   - ⚠️ manifest.json 会被复制到 dist/ 目录，路径是相对于 dist/ 的

6. **构建流程**
   - ✅ 开发在 `src/` 目录
   - ✅ 构建输出到 `dist/` 目录
   - ✅ Naimo 加载 `dist/` 目录的文件

---

**开始实现插件！** 🚀
````
