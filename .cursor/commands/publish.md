---
description: 智能发布到 GitHub - 自动检查配置并上传代码
---

用户输入（可选的 commit message）:

$ARGUMENTS

## 目标

自动化将当前插件项目发布到 GitHub，包括：

1. 检查 package.json 中的 repository 配置
2. 初始化 Git 仓库（如果需要）
3. 提交并推送代码到 GitHub

## 执行步骤

### 1. 检查 package.json 配置

读取当前目录的 `package.json` 文件，检查以下字段：

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/username/repo-name.git"
  }
}
```

**如果没有配置 repository：**

- ❌ 停止执行
- 📝 提示用户在 `package.json` 中添加 repository 配置
- 💡 提供配置示例：
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR-USERNAME/YOUR-REPO.git"
  }
  ```
- 🔗 提醒用户：
  - 先在 GitHub 上创建仓库：https://github.com/new
  - 复制仓库 URL 并添加到 package.json
  - 再次运行此命令

**如果已配置 repository：**

- ✅ 继续执行下一步
- 📌 显示检测到的仓库地址

### 1.5 检查仓库命名规范

从 repository.url 中提取仓库名称并验证命名规范：

**提取仓库名称：**

- 从 URL 中获取最后一个 `/` 后面的部分
- 移除 `.git` 后缀
- 示例：`git+https://github.com/user/naimo_tools-my-plugin.git` → `naimo_tools-my-plugin`

**验证命名规范：**

检查仓库名是否以 `naimo_tools-` 开头

**如果不符合规范：**

显示警告信息：

```
⚠️  仓库命名规范警告

检测到的仓库名：<repo-name>
推荐的命名格式：naimo_tools-<plugin-name>

为了保持 Naimo 插件生态的命名一致性，建议使用 naimo_tools- 前缀。

推荐示例：
  • naimo_tools-translate-plugin
  • naimo_tools-ocr-plugin
  • naimo_tools-image-tools

💡 您可以：
  1. 在 GitHub 上重命名仓库（Settings → Repository name）
  2. 更新 package.json 中的 repository.url
  3. 或继续使用当前名称（3秒后自动继续上传）

按 Enter 立即继续，或 Ctrl+C 取消...
```

- 等待 3 秒或用户按 Enter 继续
- ⚠️ 记录警告但继续执行

**如果符合规范：**

- ✅ 显示：`仓库命名符合规范 ✓`
- 继续执行

### 2. 检查 Git 状态

运行终端命令检查 Git 状态：

```bash
git status
```

**场景 A - 未初始化 Git：**

- 提示：`检测到项目未初始化 Git 仓库`
- 执行：`git init`
- 从 package.json 的 repository.url 提取仓库地址
- 添加远程仓库：`git remote add origin <repository-url>`

**场景 B - 已初始化但无远程仓库：**

- 提示：`检测到 Git 仓库，但未配置远程仓库`
- 从 package.json 提取仓库地址
- 添加远程仓库：`git remote add origin <repository-url>`

**场景 C - 已完整配置：**

- 提示：`Git 仓库已配置完成`
- 显示当前远程仓库地址
- 继续执行

### 3. 检查是否有未提交的更改

运行：

```bash
git status --porcelain
```

**如果有未提交的更改：**

- 📝 列出变更文件
- ✅ 继续发布流程

**如果没有更改：**

- ℹ️ 提示：`当前没有需要提交的更改`
- ❓ 询问是否继续（可能是要推送已有的提交）

### 4. 准备提交信息

**如果用户提供了 commit message（$ARGUMENTS）：**

- 使用用户提供的消息

**如果没有提供：**

- 从 package.json 读取 name 和 version
- 自动生成 commit message：
  - 格式：`chore: update <plugin-name> v<version>`
  - 示例：`chore: update naimo-plugin-template v1.0.0`

### 5. 执行 Git 操作

按顺序执行以下命令：

```bash
# 1. 添加所有更改
git add .

# 2. 提交更改
git commit -m "<commit-message>"

# 3. 推送到远程仓库
git push -u origin main
```

**处理可能的分支名称：**

- 首先尝试 `main`
- 如果失败，尝试 `master`
- 如果仍然失败，检测当前分支并推送

**处理首次推送：**

- 使用 `-u` 参数设置上游分支
- 如果推送失败（可能需要先 pull），提示用户

### 6. 完成反馈

**成功时：**

```
🎉 发布成功！

📦 项目：<plugin-name>
🔖 版本：v<version>
🌐 仓库：<repository-url>
💬 提交：<commit-message>

✅ 代码已成功推送到 GitHub
🔗 查看仓库：https://github.com/<user>/<repo>
```

**失败时：**

- 显示错误信息
- 提供可能的解决方案：
  - 检查网络连接
  - 确认 GitHub 仓库存在且有写入权限
  - 检查 Git 凭据是否配置正确
  - 如果需要先 pull，提示：`git pull origin main --rebase`

## 安全检查

执行前检查：

1. ✅ `.gitignore` 文件存在
2. ⚠️ 检查是否有敏感文件即将提交（如 `.env`, `*.key`, `config.json` 等）
3. 💡 如果检测到敏感文件，警告用户并询问是否继续

## 行为规则

- ✅ 在执行任何 Git 操作前，先显示即将执行的命令
- ✅ 每个步骤完成后显示结果
- ❌ 如果任何步骤失败，立即停止并显示错误
- 💬 使用清晰的 emoji 和颜色来标识不同类型的消息
- 📊 在最后显示完整的操作摘要

## 仓库命名规范

为了保持 Naimo 插件生态的一致性，建议遵循以下命名规范：

**格式：** `naimo_tools-<plugin-name>`

**推荐示例：**

- `naimo_tools-translate-plugin` - 翻译插件
- `naimo_tools-ocr-plugin` - OCR 插件
- `naimo_tools-image-tools` - 图像工具插件
- `naimo_tools-code-snippet` - 代码片段插件

**命名建议：**

- ✅ 使用小写字母和连字符
- ✅ 名称清晰描述插件功能
- ❌ 避免使用特殊字符或空格

**package.json 配置示例：**

```json
{
  "name": "my-awesome-plugin",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/naimo_tools-my-awesome-plugin.git"
  }
}
```

⚠️ **注意：** 如果仓库名不符合规范，系统会显示警告但仍允许上传。

## 示例用法

```bash
# 使用自动生成的 commit message
/publish

# 使用自定义 commit message
/publish feat: add new search feature

# 使用多行 commit message
/publish fix: resolve plugin loading issue
- Fix manifest validation
- Update dependencies
```

---

**注意：** 此命令会实际修改 Git 仓库并推送到远程。请确保：

- 代码已经过测试
- 没有包含敏感信息
- 符合项目的提交规范
