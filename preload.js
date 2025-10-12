"use strict";
const electron = require("electron");
const crypto = require("crypto");
const https = require("https");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const https__namespace = /* @__PURE__ */ _interopNamespaceDefault(https);
function getMimeType(filePath) {
  const ext = filePath.toLowerCase().split(".").pop() || "";
  const mimeTypes = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "bmp": "image/bmp",
    "webp": "image/webp"
  };
  return mimeTypes[ext] || "image/jpeg";
}
function sha256(message, secret = "", encoding) {
  const hmac = crypto__namespace.createHmac("sha256", secret);
  return hmac.update(message).digest(encoding);
}
function getHash(message, encoding = "hex") {
  const hash = crypto__namespace.createHash("sha256");
  return hash.update(message).digest(encoding);
}
function getDate(timestamp) {
  const date = new Date(timestamp * 1e3);
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}
function createTencentSignature(params) {
  const {
    host,
    timestamp,
    date,
    payload,
    secretId,
    secretKey
  } = params;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = getHash(payload);
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = "content-type:application/json; charset=utf-8\nhost:" + host + "\n";
  const canonicalRequest = httpRequestMethod + "\n" + canonicalUri + "\n" + canonicalQueryString + "\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + hashedRequestPayload;
  const algorithm = "TC3-HMAC-SHA256";
  const hashedCanonicalRequest = getHash(canonicalRequest);
  const credentialScope = date + "/" + params.service + "/tc3_request";
  const stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;
  const kDate = sha256(date, "TC3" + secretKey);
  const kService = sha256(params.service, kDate);
  const kSigning = sha256("tc3_request", kService);
  const signature = sha256(stringToSign, kSigning, "hex");
  return algorithm + " Credential=" + secretId + "/" + credentialScope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
}
async function callTencentOCR(base64Data, secretId, secretKey) {
  return new Promise((resolve, reject) => {
    const host = "ocr.tencentcloudapi.com";
    const service = "ocr";
    const region = "ap-beijing";
    const action = "GeneralBasicOCR";
    const version = "2018-11-19";
    const timestamp = parseInt(String((/* @__PURE__ */ new Date()).getTime() / 1e3));
    const date = getDate(timestamp);
    const payload = JSON.stringify({
      ImageBase64: base64Data,
      LanguageType: "auto"
    });
    const signature = createTencentSignature({
      host,
      service,
      timestamp,
      date,
      payload,
      secretId,
      secretKey
    });
    const headers = {
      "Authorization": signature,
      "Content-Type": "application/json; charset=utf-8",
      "Host": host,
      "X-TC-Action": action,
      "X-TC-Timestamp": timestamp.toString(),
      "X-TC-Version": version,
      "X-TC-Region": region
    };
    const options = {
      hostname: host,
      method: "POST",
      headers
    };
    const req = https__namespace.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
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
    req.on("error", (error) => {
      reject(error);
    });
    req.write(payload);
    req.end();
  });
}
async function callTencentTranslate(text, sourceLang, targetLang, secretId, secretKey) {
  return new Promise((resolve, reject) => {
    const host = "tmt.tencentcloudapi.com";
    const service = "tmt";
    const region = "ap-beijing";
    const action = "TextTranslate";
    const version = "2018-03-21";
    const timestamp = parseInt(String((/* @__PURE__ */ new Date()).getTime() / 1e3));
    const date = getDate(timestamp);
    const payload = JSON.stringify({
      SourceText: text,
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0
    });
    const signature = createTencentSignature({
      host,
      service,
      timestamp,
      date,
      payload,
      secretId,
      secretKey
    });
    const headers = {
      "Authorization": signature,
      "Content-Type": "application/json; charset=utf-8",
      "Host": host,
      "X-TC-Action": action,
      "X-TC-Timestamp": timestamp.toString(),
      "X-TC-Version": version,
      "X-TC-Region": region
    };
    const options = {
      hostname: host,
      method: "POST",
      headers
    };
    const req = https__namespace.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
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
    req.on("error", (error) => {
      reject(error);
    });
    req.write(payload);
    req.end();
  });
}
const ocrPluginAPI = {
  /**
   * 截图功能 - 使用剪切板方式
   */
  async takeScreenshot() {
    try {
      const result = await naimo.screen.capture();
      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const imageData = await naimo.clipboard.readImage();
        if (imageData) {
          if (!imageData.startsWith("data:")) {
            return `data:image/png;base64,${imageData}`;
          }
          return imageData;
        } else {
          throw new Error("无法从剪切板获取截图");
        }
      } else {
        throw new Error(result.error || "截图失败");
      }
    } catch (error) {
      console.error("截图失败:", error.message);
      throw error;
    }
  },
  /**
   * 选择图片文件
   */
  async selectImage() {
    try {
      const filePaths = await naimo.dialog.showOpen({
        properties: ["openFile"],
        filters: [
          { name: "图片文件", extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"] }
        ]
      });
      if (!filePaths || filePaths.length === 0) {
        return null;
      }
      const filePath = filePaths[0];
      const fs = require("fs");
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");
      const mimeType = getMimeType(filePath);
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error("选择图片失败:", error);
      throw error;
    }
  },
  /**
   * 加载本地图片文件
   */
  async loadLocalImage(filePath) {
    try {
      const fs = require("fs");
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");
      const mimeType = getMimeType(filePath);
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error("加载本地图片失败:", error);
      throw error;
    }
  },
  /**
   * 执行 OCR 识别和翻译
   */
  async performOCR(options) {
    try {
      const { imageData, secretId, secretKey, sourceLang = "auto", targetLang = "zh" } = options;
      if (!imageData || !secretId || !secretKey) {
        throw new Error("缺少必要参数");
      }
      let base64Data = imageData;
      if (imageData.startsWith("data:")) {
        base64Data = imageData.split(",")[1];
      }
      const ocrResult = await callTencentOCR(base64Data, secretId, secretKey);
      if (!ocrResult || !ocrResult.TextDetections) {
        throw new Error("OCR识别失败");
      }
      const results = [];
      for (const detection of ocrResult.TextDetections) {
        const originalText = detection.DetectedText;
        let translatedText = originalText;
        if (sourceLang !== targetLang && originalText.trim()) {
          try {
            translatedText = await callTencentTranslate(
              originalText,
              sourceLang,
              targetLang,
              secretId,
              secretKey
            );
          } catch (translateError) {
            console.warn("翻译失败，使用原文:", translateError);
          }
        }
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
      console.error("OCR处理失败:", error);
      throw error;
    }
  }
};
electron.contextBridge.exposeInMainWorld("ocrPluginAPI", ocrPluginAPI);
const handlers = {
  "ocr-translate": {
    onEnter: async (params) => {
      console.log("OCR翻译功能被触发", params);
    }
  },
  "quick-ocr": {
    onEnter: async (params) => {
      console.log("快速OCR功能被触发", params);
      if (typeof window !== "undefined") {
        window.__metadata = {
          ...window.__metadata || {},
          autoStartScreenshot: true
        };
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
