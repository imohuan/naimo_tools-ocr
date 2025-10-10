const { contextBridge, ipcRenderer } = require('electron');
const crypto = require('crypto');
const https = require('https');

// OCR插件API
const ocrPluginAPI = {
  // 截图功能 - 使用剪切板方式
  async takeScreenshot() {
    try {
      // 调用截图功能，该方法始终会将图片复制到剪切板
      const result = await naimo.router.screenCaptureCaptureAndGetFilePath();

      if (result.success) {
        // 截图完成后，图片已经被复制到剪切板
        // 等待一下确保复制完成
        await new Promise(resolve => setTimeout(resolve, 200));

        // 从剪切板读取图片
        const imageData = await naimo.router.clipboardReadImageAsBase64();

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
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  },


  // 选择图片文件
  async selectImage() {
    try {
      // 在preload中直接使用ipcRenderer调用正确的路由
      const filePaths = await naimo.router.filesystemSelectFile({
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
      const mimeType = ocrPluginAPI.getMimeType(filePath);

      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('选择图片失败:', error);
      throw error;
    }
  },

  // 获取文件MIME类型
  getMimeType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  },

  // 执行OCR识别和翻译
  async performOCR(options) {
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
      const ocrResult = await this.callTencentOCR(base64Data, secretId, secretKey);

      if (!ocrResult || !ocrResult.TextDetections) {
        throw new Error('OCR识别失败');
      }

      // 处理OCR结果并翻译
      const results = [];
      for (const detection of ocrResult.TextDetections) {
        const originalText = detection.DetectedText;

        // 如果需要翻译且源语言不等于目标语言
        let translatedText = originalText;
        if (sourceLang !== targetLang && originalText.trim()) {
          try {
            translatedText = await this.callTencentTranslate(
              originalText, sourceLang, targetLang, secretId, secretKey
            );
          } catch (translateError) {
            console.warn('翻译失败，使用原文:', translateError);
          }
        }

        // 构建结果对象
        const result = {
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
  },

  // 调用腾讯云OCR API
  async callTencentOCR(base64Data, secretId, secretKey) {
    return new Promise((resolve, reject) => {
      const host = 'ocr.tencentcloudapi.com';
      const service = 'ocr';
      const region = 'ap-beijing';
      const action = 'GeneralBasicOCR';
      const version = '2018-11-19';
      const timestamp = parseInt(String(new Date().getTime() / 1000));
      const date = this.getDate(timestamp);

      const payload = JSON.stringify({
        ImageBase64: base64Data,
        LanguageType: 'auto'
      });

      // 构建签名
      const signature = this.createTencentSignature({
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
        'X-TC-Timestamp': timestamp,
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
  },

  // 调用腾讯云翻译API
  async callTencentTranslate(text, sourceLang, targetLang, secretId, secretKey) {
    return new Promise((resolve, reject) => {
      const host = 'tmt.tencentcloudapi.com';
      const service = 'tmt';
      const region = 'ap-beijing';
      const action = 'TextTranslate';
      const version = '2018-03-21';
      const timestamp = parseInt(String(new Date().getTime() / 1000));
      const date = this.getDate(timestamp);

      const payload = JSON.stringify({
        SourceText: text,
        Source: sourceLang,
        Target: targetLang,
        ProjectId: 0
      });

      // 构建签名
      const signature = this.createTencentSignature({
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
        'X-TC-Timestamp': timestamp,
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
  },

  // 创建腾讯云API签名
  createTencentSignature(params) {
    const {
      host, service, region, action, version, timestamp, date, payload,
      secretId, secretKey
    } = params;

    // 步骤1：拼接规范请求串
    const signedHeaders = 'content-type;host';
    const hashedRequestPayload = this.getHash(payload);
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
    const hashedCanonicalRequest = this.getHash(canonicalRequest);
    const credentialScope = date + '/' + service + '/' + 'tc3_request';
    const stringToSign =
      algorithm + '\n' +
      timestamp + '\n' +
      credentialScope + '\n' +
      hashedCanonicalRequest;

    // 步骤3：计算签名
    const kDate = this.sha256(date, 'TC3' + secretKey);
    const kService = this.sha256(service, kDate);
    const kSigning = this.sha256('tc3_request', kService);
    const signature = this.sha256(stringToSign, kSigning, 'hex');

    // 步骤4：拼接Authorization
    return algorithm + ' ' +
      'Credential=' + secretId + '/' + credentialScope + ', ' +
      'SignedHeaders=' + signedHeaders + ', ' +
      'Signature=' + signature;
  },

  // SHA256 HMAC
  sha256(message, secret = '', encoding) {
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(message).digest(encoding);
  },

  // SHA256 Hash
  getHash(message, encoding = 'hex') {
    const hash = crypto.createHash('sha256');
    return hash.update(message).digest(encoding);
  },

  // 获取日期字符串
  getDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getUTCFullYear();
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + date.getUTCDate()).slice(-2);
    return `${year}-${month}-${day}`;
  },

  // 监听自动截图事件
  onAutoScreenshot(callback) {
    ipcRenderer.on('auto-start-screenshot', callback);
  },

  // 保存设置到本地存储
  async saveSettings(settings) {
    try {
      localStorage.setItem('ocrPluginSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  },

  // 加载本地设置
  async loadSettings() {
    try {
      const settings = localStorage.getItem('ocrPluginSettings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('加载设置失败:', error);
      return null;
    }
  },

  // 获取全局插件设置（API密钥）
  async getGlobalSettings() {
    try {
      // 在preload中直接使用ipcRenderer调用正确的路由
      const allSettings = await naimo.router.storeGet('pluginSettings') || {};
      return allSettings['ocr-trans-plugin'] || {};
    } catch (error) {
      console.error('获取全局设置失败:', error);
      return {};
    }
  },

  // 保存全局插件设置（API密钥）
  async saveGlobalSettings(settings) {
    try {
      // 在preload中直接使用ipcRenderer调用正确的路由
      return await naimo.router.storeSet('pluginSettings.ocr-trans-plugin', settings);
    } catch (error) {
      console.error('保存全局设置失败:', error);
      return false;
    }
  }
};

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('ocrPluginAPI', ocrPluginAPI);
