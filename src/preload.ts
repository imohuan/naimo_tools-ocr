/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from "electron";
import * as crypto from "crypto";
import * as https from "https";

// ==================== 类型定义 ====================

/**
 * OCR 识别结果接口
 */
interface OCRResult {
  originalText: string;
  translatedText: string;
  confidence: number;
  polygon: Array<{ X: number; Y: number }>;
}

/**
 * OCR 执行选项
 */
interface OCROptions {
  imageData: string;
  secretId: string;
  secretKey: string;
  sourceLang?: string;
  targetLang?: string;
}

/**
 * OCR 插件 API 接口
 */
interface OCRPluginAPI {
  takeScreenshot: () => Promise<string>;
  selectImage: () => Promise<string | null>;
  loadLocalImage: (filePath: string) => Promise<string>;
  performOCR: (options: OCROptions) => Promise<OCRResult[]>;
}

// ==================== 工具函数 ====================

/**
 * 获取文件 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * SHA256 HMAC 签名
 */
function sha256(message: string, secret: string | Buffer = '', encoding?: crypto.BinaryToTextEncoding): string | Buffer {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(message).digest(encoding as crypto.BinaryToTextEncoding);
}

/**
 * SHA256 Hash
 */
function getHash(message: string, encoding: crypto.BinaryToTextEncoding = 'hex'): string {
  const hash = crypto.createHash('sha256');
  return hash.update(message).digest(encoding);
}

/**
 * 获取日期字符串 (UTC)
 */
function getDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const day = ('0' + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * 创建腾讯云 API 签名
 */
function createTencentSignature(params: {
  host: string;
  service: string;
  region: string;
  action: string;
  version: string;
  timestamp: number;
  date: string;
  payload: string;
  secretId: string;
  secretKey: string;
}): string {
  const {
    host, timestamp, date, payload,
    secretId, secretKey
  } = params;

  // 步骤1：拼接规范请求串
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = getHash(payload);
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders =
    'content-type:application/json; charset=utf-8\n' +
    'host:' + host + '\n';

  const canonicalRequest =
    httpRequestMethod + '\n' +
    canonicalUri + '\n' +
    canonicalQueryString + '\n' +
    canonicalHeaders + '\n' +
    signedHeaders + '\n' +
    hashedRequestPayload;

  // 步骤2：拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = getHash(canonicalRequest);
  const credentialScope = date + '/' + params.service + '/' + 'tc3_request';
  const stringToSign =
    algorithm + '\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    hashedCanonicalRequest;

  // 步骤3：计算签名
  const kDate = sha256(date, 'TC3' + secretKey);
  const kService = sha256(params.service, kDate as Buffer);
  const kSigning = sha256('tc3_request', kService as Buffer);
  const signature = sha256(stringToSign, kSigning as Buffer, 'hex') as string;

  // 步骤4：拼接Authorization
  return algorithm + ' ' +
    'Credential=' + secretId + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;
}

/**
 * 调用腾讯云 OCR API
 */
async function callTencentOCR(base64Data: string, secretId: string, secretKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const host = 'ocr.tencentcloudapi.com';
    const service = 'ocr';
    const region = 'ap-beijing';
    const action = 'GeneralBasicOCR';
    const version = '2018-11-19';
    const timestamp = parseInt(String(new Date().getTime() / 1000));
    const date = getDate(timestamp);

    const payload = JSON.stringify({
      ImageBase64: base64Data,
      LanguageType: 'auto'
    });

    // 构建签名
    const signature = createTencentSignature({
      host,
      service,
      region,
      action,
      version,
      timestamp,
      date,
      payload,
      secretId,
      secretKey
    });

    const headers = {
      'Authorization': signature,
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version,
      'X-TC-Region': region
    };

    const options = {
      hostname: host,
      method: 'POST',
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response.Error) {
            reject(new Error(result.Response.Error.Message));
          } else {
            resolve(result.Response);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * 调用腾讯云翻译 API
 */
async function callTencentTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  secretId: string,
  secretKey: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const host = 'tmt.tencentcloudapi.com';
    const service = 'tmt';
    const region = 'ap-beijing';
    const action = 'TextTranslate';
    const version = '2018-03-21';
    const timestamp = parseInt(String(new Date().getTime() / 1000));
    const date = getDate(timestamp);

    const payload = JSON.stringify({
      SourceText: text,
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0
    });

    // 构建签名
    const signature = createTencentSignature({
      host,
      service,
      region,
      action,
      version,
      timestamp,
      date,
      payload,
      secretId,
      secretKey
    });

    const headers = {
      'Authorization': signature,
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version,
      'X-TC-Region': region
    };

    const options = {
      hostname: host,
      method: 'POST',
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response.Error) {
            reject(new Error(result.Response.Error.Message));
          } else {
            resolve(result.Response.TargetText);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// ==================== 暴露 API ====================

const ocrPluginAPI: OCRPluginAPI = {
  /**
   * 截图功能 - 使用剪切板方式
   */
  async takeScreenshot() {
    try {
      // 调用截图功能，该方法会将图片复制到剪切板
      const result = await naimo.screen.capture();
      if (result.success) {
        // 等待一下确保复制完成
        await new Promise(resolve => setTimeout(resolve, 200));
        // 从剪切板读取图片
        const imageData = await naimo.clipboard.readImage();
        if (imageData) {
          // 确保返回完整的data URL格式
          if (!imageData.startsWith('data:')) {
            return `data:image/png;base64,${imageData}`;
          }
          return imageData;
        } else {
          throw new Error('无法从剪切板获取截图');
        }
      } else {
        throw new Error(result.error || '截图失败');
      }
    } catch (error: any) {
      // naimo.log.throw_error('截图失败:', error);
      console.error('截图失败:', error.message);
      throw error;
    }
  },

  /**
   * 选择图片文件
   */
  async selectImage() {
    try {
      // 使用对话框选择文件
      const filePaths = await naimo.dialog.showOpen({
        properties: ['openFile'],
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
        ]
      });

      if (!filePaths || filePaths.length === 0) {
        return null;
      }

      const filePath = filePaths[0];

      // 读取文件并转换为base64
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = getMimeType(filePath);

      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('选择图片失败:', error);
      throw error;
    }
  },

  /**
   * 加载本地图片文件
   */
  async loadLocalImage(filePath: string) {
    try {
      // 读取文件并转换为base64
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = getMimeType(filePath);

      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('加载本地图片失败:', error);
      throw error;
    }
  },

  /**
   * 执行 OCR 识别和翻译
   */
  async performOCR(options: OCROptions) {
    try {
      const { imageData, secretId, secretKey, sourceLang = 'auto', targetLang = 'zh' } = options;

      if (!imageData || !secretId || !secretKey) {
        throw new Error('缺少必要参数');
      }

      // 提取base64数据
      let base64Data = imageData;
      if (imageData.startsWith('data:')) {
        base64Data = imageData.split(',')[1];
      }

      // 调用腾讯云OCR API
      const ocrResult = await callTencentOCR(base64Data, secretId, secretKey);

      if (!ocrResult || !ocrResult.TextDetections) {
        throw new Error('OCR识别失败');
      }

      // 处理OCR结果并翻译
      const results: OCRResult[] = [];
      for (const detection of ocrResult.TextDetections) {
        const originalText = detection.DetectedText;

        // 如果需要翻译且源语言不等于目标语言
        let translatedText = originalText;
        if (sourceLang !== targetLang && originalText.trim()) {
          try {
            translatedText = await callTencentTranslate(
              originalText, sourceLang, targetLang, secretId, secretKey
            );
          } catch (translateError) {
            console.warn('翻译失败，使用原文:', translateError);
          }
        }

        // 构建结果对象
        const result: OCRResult = {
          originalText,
          translatedText,
          confidence: detection.Confidence,
          polygon: detection.Polygon || []
        };

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('OCR处理失败:', error);
      throw error;
    }
  }
};

contextBridge.exposeInMainWorld('ocrPluginAPI', ocrPluginAPI);

// ==================== 功能处理器导出 ====================

const handlers = {
  "ocr-translate": {
    onEnter: async (params: any) => {
      console.log('OCR翻译功能被触发', params);
      // 功能逻辑在渲染进程中处理
    }
  },
  "quick-ocr": {
    onEnter: async (params: any) => {
      console.log('快速OCR功能被触发', params);
      // 设置自动启动截图标志
      if (typeof window !== 'undefined') {
        (window as any).__metadata = {
          ...((window as any).__metadata || {}),
          autoStartScreenshot: true
        };
      }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    ocrPluginAPI: OCRPluginAPI;
    __metadata?: {
      autoStartScreenshot?: boolean;
    };
  }
}
