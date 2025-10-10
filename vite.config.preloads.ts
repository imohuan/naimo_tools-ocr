/**
 * Preload 构建配置
 * 专门用于配置 preload.ts 的构建选项
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Preload 构建配置
 */
export default defineConfig({
  base: './',
  build: {
    lib: {
      entry: resolve(__dirname, './src/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js'
    },
    outDir: resolve(__dirname, './dist'),
    emptyOutDir: false,
    sourcemap: false,
    minify: false, // 不压缩，便于调试
    rollupOptions: {
      external: [
        'electron',
        'https',
        'crypto',
      ],
      output: {
        format: 'cjs',
        exports: 'auto',
        // 确保 preload 是单个文件，不分块
        inlineDynamicImports: true
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})

