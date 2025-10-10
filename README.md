# Naimo Plugin Template

> 使用 TypeScript + Vite 开发 Naimo Tools 插件的官方模板

## 特性

- ✅ **TypeScript** - 完整的类型支持和智能提示
- ✅ **Vite** - 快速的开发服务器和优化的构建
- ✅ **现代化开发** - ESNext、模块化、热更新
- ✅ **完整类型定义** - 包含 Naimo API 和 Electron 类型声明
- ✅ **开箱即用** - 预配置好的开发环境

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
# 或
yarn installzz
```

### 2. 开发模式

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动，支持热更新。

### 3. 构建

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 4. 类型检查

```bash
npm run type-check
```

## 项目结构

```
my-plugin/
├── src/
│   ├── main.ts          # 主入口文件（用于 index.html）
│   ├── preload.ts       # Preload 脚本
│   └── style.css        # 样式文件
├── dist/                # 构建输出目录
├── index.html           # HTML 入口
├── manifest.json        # 插件配置文件
├── naimo.d.ts          # Naimo API 类型声明
├── schema.json         # manifest.json JSON Schema
├── package.json        # 包管理配置
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 配置
└── README.md           # 说明文档
```

## 开发指南

### TypeScript 支持

项目已配置好 TypeScript，可以直接使用类型：

```typescript
// src/main.ts
import type { Naimo } from "../naimo";

const naimo: Naimo = window.naimo;
naimo.log.info("Hello World!");
```

### Electron 类型声明

在 `preload.ts` 中可以使用 Electron API：

```typescript
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("myAPI", {
  // 你的 API
});
```

**注意**: Electron 只需要类型声明，不需要实际安装。如果需要，可以安装为 devDependencies：

```bash
npm install -D electron
```

### Vite 配置

`vite.config.ts` 已经配置好了：

- 路径别名 `@/` 指向 `src/`
- 自动分割代码
- 优化构建输出
- 支持热更新

### 样式开发

可以在 `src/style.css` 中编写样式，也支持导入其他 CSS 文件：

```typescript
// src/main.ts
import "./style.css";
import "./components/Button.css";
```

## 构建和部署

### 本地测试

1. 运行 `npm run build` 构建插件
2. 将整个项目文件夹复制到 Naimo Tools 的 `plugins/` 目录
3. 重启 Naimo Tools

### 生产构建

```bash
npm run build
```

构建后的文件：

- `dist/index.html` - 主页面
- `dist/preload.js` - Preload 脚本
- `dist/js/` - JavaScript 代码
- `dist/assets/` - 静态资源

### 打包发布

建议将以下文件打包成 `.zip` 发布：

```
my-plugin.zip
├── dist/
├── manifest.json
├── naimo.d.ts
├── schema.json
└── README.md
```

## 配置说明

### manifest.json

插件配置文件，包含插件的元信息和功能定义。详见 [插件开发指南](./插件开发指南.md)。

### tsconfig.json

TypeScript 配置，已启用严格模式和完整的类型检查。

### vite.config.ts

Vite 构建配置，支持：

- 路径别名
- 代码分割
- 资源优化
- 开发服务器

## API 使用

### Naimo API

在页面中使用：

```typescript
// src/main.ts
const naimo = window.naimo;

// 日志
naimo.log.info("信息");
naimo.log.error("错误");

// 窗口
await naimo.window.hide();
await naimo.window.show();

// 数据库
await naimo.db.put({ _id: "test", data: "hello" });
const doc = await naimo.db.get("test");

// 更多 API 请参考 naimo.d.ts
```

### 自定义 API

在 `preload.ts` 中定义：

```typescript
// src/preload.ts
const myAPI = {
  doSomething: () => {
    return "Hello!";
  },
};

contextBridge.exposeInMainWorld("myAPI", myAPI);
```

在页面中使用：

```typescript
// src/main.ts
window.myAPI.doSomething();
```

## 常见问题

### Q: 如何添加第三方库？

```bash
npm install lodash
npm install -D @types/lodash  # 如果需要类型定义
```

### Q: 如何使用 Vue/React？

可以安装相应的框架和 Vite 插件：

```bash
# Vue
npm install vue
npm install -D @vitejs/plugin-vue

# React
npm install react react-dom
npm install -D @vitejs/plugin-react
```

然后在 `vite.config.ts` 中添加插件。

### Q: 为什么 Electron 不需要安装？

模板已经包含了 Electron 的类型声明（`@types/node`），足够开发使用。实际运行时，插件会在 Naimo Tools（已包含 Electron）中运行。

### Q: 如何调试？

1. 在 Naimo Tools 中打开插件
2. 按 F12 打开开发者工具
3. 在 Sources 标签中查看源码并设置断点

## 相关文档

- [插件开发指南](./插件开发指南.md)
- [Naimo API 类型声明](./naimo.d.ts)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)

## 许可证

MIT License
