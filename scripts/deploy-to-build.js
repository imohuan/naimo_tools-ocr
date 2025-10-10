/**
 * 打包并部署到 build 分支
 * 
 * 功能：
 * 1. 执行项目打包（npm run build）
 * 2. 在 dist 目录初始化 Git 仓库
 * 3. 将 dist 目录内容强制推送到远程 build 分支
 * 4. 自动清理 dist 目录下的 .git 文件夹
 * 
 * 流程：
 * - 删除 dist/.git（如果存在）
 * - 在 dist 目录初始化新的 Git 仓库
 * - 添加所有文件并提交
 * - 强制推送到 build 分支（覆盖远程所有内容）
 * - 清理 dist/.git
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  log(`执行命令: ${command}`, 'cyan');
  try {
    return execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      ...options,
    });
  } catch (error) {
    log(`命令执行失败: ${command}`, 'red');
    throw error;
  }
}

function checkGitStatus() {
  log('\n📊 检查 Git 状态...', 'blue');

  try {
    const status = execSync('git status --porcelain', {
      cwd: rootDir,
      encoding: 'utf-8',
    });

    if (status.trim()) {
      log('⚠️  警告: 工作区有未提交的更改', 'yellow');
      log('建议先提交或暂存更改再部署', 'yellow');

      // 询问是否继续
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        readline.question('是否继续部署? (y/n): ', (answer) => {
          readline.close();
          if (answer.toLowerCase() !== 'y') {
            log('❌ 已取消部署', 'red');
            process.exit(0);
          }
          resolve();
        });
      });
    } else {
      log('✅ 工作区干净', 'green');
    }
  } catch (error) {
    log('⚠️  无法检查 Git 状态，继续部署', 'yellow');
  }
}

async function build() {
  log('\n🔨 开始打包项目...', 'blue');

  try {
    execCommand('npm run build');
    log('✅ 打包完成', 'green');
  } catch (error) {
    log('❌ 打包失败', 'red');
    process.exit(1);
  }

  // 检查 dist 目录是否存在
  if (!fs.existsSync(distDir)) {
    log('❌ dist 目录不存在', 'red');
    process.exit(1);
  }

  log('✅ dist 目录已生成', 'green');
}

async function deployToBuildBranch() {
  log('\n🚀 开始部署到 build 分支...', 'blue');

  const gitDir = path.join(distDir, '.git');

  try {
    // 1. 获取当前分支信息
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: rootDir,
      encoding: 'utf-8',
    }).trim();
    log(`当前分支: ${currentBranch}`, 'cyan');

    // 2. 获取当前提交信息
    const commitMessage = execSync('git log -1 --pretty=%B', {
      cwd: rootDir,
      encoding: 'utf-8',
    }).trim();

    const commitHash = execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      encoding: 'utf-8',
    }).trim();

    // 3. 读取 package.json 获取版本号
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
    );
    const version = packageJson.version;

    // 4. 获取远程仓库地址
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: rootDir,
      encoding: 'utf-8',
    }).trim();
    log(`远程仓库: ${remoteUrl}`, 'cyan');

    // 5. 删除 dist 目录下的 .git 文件夹（如果存在）
    if (fs.existsSync(gitDir)) {
      log('\n🗑️  删除 dist 目录下的旧 .git 文件夹...', 'yellow');
      fs.rmSync(gitDir, { recursive: true, force: true });
      log('✅ 已删除', 'green');
    }

    // 6. 在 dist 目录初始化 git 仓库
    log('\n🔧 在 dist 目录初始化 Git 仓库...', 'cyan');
    execSync('git init', { cwd: distDir, stdio: 'pipe' });
    log('✅ Git 仓库初始化完成', 'green');

    // 7. 配置 Git 用户信息（使用项目的配置）
    try {
      const userName = execSync('git config user.name', {
        cwd: rootDir,
        encoding: 'utf-8',
      }).trim();
      const userEmail = execSync('git config user.email', {
        cwd: rootDir,
        encoding: 'utf-8',
      }).trim();

      execSync(`git config user.name "${userName}"`, {
        cwd: distDir,
        stdio: 'pipe',
      });
      execSync(`git config user.email "${userEmail}"`, {
        cwd: distDir,
        stdio: 'pipe',
      });
      log(`✅ Git 用户配置: ${userName} <${userEmail}>`, 'green');
    } catch (error) {
      log('⚠️  无法获取 Git 用户配置，使用默认配置', 'yellow');
    }

    // 8. 添加远程仓库
    log('\n🔗 添加远程仓库...', 'cyan');
    execSync(`git remote add origin ${remoteUrl}`, {
      cwd: distDir,
      stdio: 'pipe',
    });
    log('✅ 远程仓库已添加', 'green');

    // 9. 添加所有文件
    log('\n➕ 添加所有文件到 Git...', 'cyan');
    execSync('git add -A', { cwd: distDir, stdio: 'pipe' });

    // 检查是否有文件被添加
    const status = execSync('git status --short', {
      cwd: distDir,
      encoding: 'utf-8',
    });

    if (!status.trim()) {
      log('❌ 没有文件需要提交', 'red');
      process.exit(1);
    }

    log('✅ 文件已添加', 'green');
    log(`📋 待提交文件:\n${status}`, 'cyan');

    // 10. 创建提交
    const deployMessage = `🚀 Deploy v${version}\n\nAuto-deployed from commit: ${commitHash}\nOriginal message: ${commitMessage}`;
    log('\n💾 创建提交...', 'cyan');
    execSync(`git commit -m "${deployMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
      cwd: distDir,
      stdio: 'pipe',
    });
    log('✅ 提交已创建', 'green');

    // 11. 强制推送到 build 分支
    log('\n📤 推送到 build 分支...', 'cyan');
    log('⚠️  这将强制覆盖远程 build 分支的所有内容', 'yellow');

    execSync('git push origin HEAD:build --force', {
      cwd: distDir,
      stdio: 'inherit',
    });

    log('\n✅ 成功部署到 build 分支！', 'green');
    log(`📦 版本: ${version}`, 'green');
    log(`🔗 提交: ${commitHash}`, 'green');
    log(`📝 消息: ${commitMessage}`, 'green');
    log(`🌐 仓库: ${remoteUrl}`, 'green');

  } catch (error) {
    log('\n❌ 部署失败', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // 12. 清理 dist 目录下的 .git 文件夹
    if (fs.existsSync(gitDir)) {
      log('\n🧹 清理 dist 目录下的 .git 文件夹...', 'cyan');
      fs.rmSync(gitDir, { recursive: true, force: true });
      log('✅ 清理完成', 'green');
    }
  }
}

async function main() {
  log('═══════════════════════════════════════', 'bright');
  log('     🚀 部署到 Build 分支', 'bright');
  log('═══════════════════════════════════════', 'bright');

  try {
    await checkGitStatus();
    await build();
    await deployToBuildBranch();

    log('\n═══════════════════════════════════════', 'bright');
    log('     ✅ 部署完成！', 'green');
    log('═══════════════════════════════════════', 'bright');
  } catch (error) {
    log('\n═══════════════════════════════════════', 'bright');
    log('     ❌ 部署失败', 'red');
    log('═══════════════════════════════════════', 'bright');
    process.exit(1);
  }
}

main();

