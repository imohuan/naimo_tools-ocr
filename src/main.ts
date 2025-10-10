/// <reference path="../typings/naimo.d.ts" />

import "./style.css";


// ==================== 热重载 ====================
if (import.meta.hot) {
  // 监听 preload 文件变化事件
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data);
    // 触发 preload 构建
    console.log('🔨 正在触发 preload 构建...');
    try {
      const response = await fetch('/__preload_build');
      const result = await response.json();
      if (result.success) {
        console.log('✅ Preload 构建完成');
        // 构建成功后，触发热重载
        await window.naimo.hot()
        console.log('🔄 Preload 热重载完成');
        location.reload()
      } else {
        console.error('❌ Preload 构建失败');
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error);
    }
  })
}


// ==================== 类型定义 ====================

type NaimoAPI = typeof window.naimo;
type OCRPluginAPI = typeof window.ocrPluginAPI;

interface OCRResult {
  originalText: string;
  translatedText: string;
  confidence: number;
  polygon: Array<{ X: number; Y: number }>;
}

interface Settings {
  tencentSecretId: string;
  tencentSecretKey: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
  showOriginalImage: boolean;
  showOriginalText: boolean;
  showTranslatedText: boolean;
  showBorder: boolean;
  originalTextColor: string;
  translatedTextColor: string;
  originalTextSize: number;
  translatedTextSize: number;
  originalTextBold: boolean;
  translatedTextBold: boolean;
  originalTextUnderline: boolean;
  translatedTextUnderline: boolean;
  originalTextWrap: boolean;
  originalTextOffsetX: number;
  originalTextOffsetY: number;
  translatedTextWrap: boolean;
  translatedTextOffsetX: number;
  translatedTextOffsetY: number;
  textBackgroundOpacity: number;
  textBackgroundColor: string;
  boxBorderColor: string;
  boxBorderWidth: number;
}

// ==================== OCR 翻译器类 ====================

class OCRTranslator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: Partial<Settings>;
  private ocrResults: OCRResult[];
  private currentImage: HTMLImageElement | null;
  private scale: number;
  private offsetX: number;
  private offsetY: number;
  private isDragging: boolean;
  private lastMouseX: number;
  private lastMouseY: number;
  private naimo: NaimoAPI;
  private ocrAPI: OCRPluginAPI;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.settings = {};
    this.ocrResults = [];
    this.currentImage = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.naimo = window.naimo;
    this.ocrAPI = window.ocrPluginAPI;

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupCanvas();
    this.updateSettingsUI();
    this.showPlaceholder();

    // 检查是否需要自动启动截图
    setTimeout(() => {
      this.checkAutoStartScreenshot();
    }, 500);
  }

  checkAutoStartScreenshot() {
    try {
      if (window.__metadata && window.__metadata.autoStartScreenshot) {
        console.log('检测到自动启动截图标志，将在500ms后开始截图');
        this.takeScreenshot();
      }
    } catch (error) {
      console.error('检查自动启动截图失败:', error);
    }
  }

  async loadSettings() {
    try {
      // 使用新的 API 加载设置
      const tencentSecretId = await this.naimo.storage.getItem('tencentSecretId') || '';
      const tencentSecretKey = await this.naimo.storage.getItem('tencentSecretKey') || '';

      // 加载本地 UI 设置
      const localSettingsStr = localStorage.getItem('ocrPluginSettings');
      const localSettings = localSettingsStr ? JSON.parse(localSettingsStr) : {};

      this.settings = {
        tencentSecretId,
        tencentSecretKey,
        defaultSourceLang: 'auto',
        defaultTargetLang: 'zh',
        showOriginalImage: true,
        showOriginalText: true,
        showTranslatedText: true,
        showBorder: true,
        originalTextColor: '#FF0000',
        translatedTextColor: '#0000FF',
        originalTextSize: 16,
        translatedTextSize: 16,
        originalTextBold: false,
        translatedTextBold: false,
        originalTextUnderline: false,
        translatedTextUnderline: false,
        originalTextWrap: true,
        originalTextOffsetX: 0,
        originalTextOffsetY: 0,
        translatedTextWrap: true,
        translatedTextOffsetX: 0,
        translatedTextOffsetY: 20,
        textBackgroundOpacity: 70,
        textBackgroundColor: '#000000',
        boxBorderColor: '#007AFF',
        boxBorderWidth: 2,
        ...localSettings
      };
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  async saveSettings() {
    try {
      // 保存本地UI设置
      const localSettings = { ...this.settings };
      delete localSettings.tencentSecretId;
      delete localSettings.tencentSecretKey;
      localStorage.setItem('ocrPluginSettings', JSON.stringify(localSettings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  async updateAPIStatus() {
    try {
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');

      if (!statusIndicator || !statusText) return;

      const hasSecretId = this.settings.tencentSecretId && this.settings.tencentSecretId.trim();
      const hasSecretKey = this.settings.tencentSecretKey && this.settings.tencentSecretKey.trim();

      if (hasSecretId && hasSecretKey) {
        statusIndicator.textContent = '🟢';
        statusText.textContent = '已配置';
      } else {
        statusIndicator.textContent = '🔴';
        statusText.textContent = '未配置';
      }
    } catch (error) {
      console.error('更新API状态失败:', error);
    }
  }

  setupEventListeners() {
    // 控制栏按钮
    document.getElementById('screenshotBtn')?.addEventListener('click', () => this.takeScreenshot());
    document.getElementById('openImageBtn')?.addEventListener('click', () => this.openImage());
    document.getElementById('resetViewBtn')?.addEventListener('click', () => this.resetView());
    document.getElementById('saveImageBtn')?.addEventListener('click', () => this.saveImage());
    document.getElementById('copyTextBtn')?.addEventListener('click', () => this.copyText());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettings());

    // 设置面板
    document.getElementById('closeSettingsBtn')?.addEventListener('click', () => this.hideSettings());

    // 设置项监听
    this.setupSettingListeners();

    // Canvas事件
    this.setupCanvasEvents();

    // 粘贴事件
    this.setupPasteEvents();

    // 窗口大小改变
    window.addEventListener('resize', () => this.resizeCanvas());

    // 键盘快捷键
    this.setupKeyboardShortcuts();
  }

  setupSettingListeners() {
    const settingIds = [
      'sourceLang', 'targetLang',
      'showOriginalImage', 'showOriginalText', 'showTranslatedText', 'showBorder',
      'originalTextColor', 'translatedTextColor', 'originalTextSize', 'translatedTextSize',
      'originalTextBold', 'translatedTextBold', 'originalTextUnderline', 'translatedTextUnderline',
      'originalTextWrap', 'translatedTextWrap',
      'originalTextOffsetX', 'originalTextOffsetY', 'translatedTextOffsetX', 'translatedTextOffsetY',
      'textBackgroundOpacity', 'textBackgroundColor', 'boxBorderColor', 'boxBorderWidth'
    ];

    settingIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => this.updateSetting(id, e));
        element.addEventListener('input', (e) => this.updateSetting(id, e));
      }
    });
  }

  updateSetting(id: string, event: Event) {
    const element = event.target as HTMLInputElement;
    let value: any = element.type === 'checkbox' ? element.checked : element.value;

    // 映射设置名称
    const settingMap: Record<string, string> = {
      'sourceLang': 'defaultSourceLang',
      'targetLang': 'defaultTargetLang'
    };

    const settingName = settingMap[id] || id;

    // 转换数值类型
    if (id.includes('Size') || id.includes('Offset') || id === 'textBackgroundOpacity' || id === 'boxBorderWidth') {
      value = parseInt(value);
    }

    (this.settings as any)[settingName] = value;
    this.saveSettings();

    // 更新范围值显示
    if (element.type === 'range') {
      const valueElement = document.getElementById(id + 'Value');
      if (valueElement) {
        const unit = id === 'textBackgroundOpacity' ? '%' : 'px';
        valueElement.textContent = value + unit;
      }
    }

    // 实时更新画布
    if (this.currentImage) {
      this.redrawCanvas();
    }
  }

  updateSettingsUI() {
    // 更新所有设置UI
    const sourceLang = document.getElementById('sourceLang') as HTMLSelectElement;
    const targetLang = document.getElementById('targetLang') as HTMLSelectElement;
    if (sourceLang) sourceLang.value = this.settings.defaultSourceLang || 'auto';
    if (targetLang) targetLang.value = this.settings.defaultTargetLang || 'zh';

    // 更新显示选项
    const displaySettings = ['showOriginalImage', 'showOriginalText', 'showTranslatedText', 'showBorder'];
    displaySettings.forEach(setting => {
      const checkbox = document.getElementById(setting) as HTMLInputElement;
      if (checkbox) checkbox.checked = (this.settings as any)[setting] ?? true;
    });

    // 更新文本样式
    const originalTextColor = document.getElementById('originalTextColor') as HTMLInputElement;
    const translatedTextColor = document.getElementById('translatedTextColor') as HTMLInputElement;
    const originalTextSize = document.getElementById('originalTextSize') as HTMLInputElement;
    const translatedTextSize = document.getElementById('translatedTextSize') as HTMLInputElement;

    if (originalTextColor) originalTextColor.value = this.settings.originalTextColor || '#FF0000';
    if (translatedTextColor) translatedTextColor.value = this.settings.translatedTextColor || '#0000FF';
    if (originalTextSize) originalTextSize.value = String(this.settings.originalTextSize || 16);
    if (translatedTextSize) translatedTextSize.value = String(this.settings.translatedTextSize || 16);

    // 更新偏移设置
    const originalTextOffsetX = document.getElementById('originalTextOffsetX') as HTMLInputElement;
    const originalTextOffsetY = document.getElementById('originalTextOffsetY') as HTMLInputElement;
    const translatedTextOffsetX = document.getElementById('translatedTextOffsetX') as HTMLInputElement;
    const translatedTextOffsetY = document.getElementById('translatedTextOffsetY') as HTMLInputElement;

    if (originalTextOffsetX) originalTextOffsetX.value = String(this.settings.originalTextOffsetX || 0);
    if (originalTextOffsetY) originalTextOffsetY.value = String(this.settings.originalTextOffsetY || 0);
    if (translatedTextOffsetX) translatedTextOffsetX.value = String(this.settings.translatedTextOffsetX || 0);
    if (translatedTextOffsetY) translatedTextOffsetY.value = String(this.settings.translatedTextOffsetY || 20);

    // 更新样式切换
    const styleSettings = [
      'originalTextBold', 'originalTextUnderline', 'originalTextWrap',
      'translatedTextBold', 'translatedTextUnderline', 'translatedTextWrap'
    ];
    styleSettings.forEach(setting => {
      const checkbox = document.getElementById(setting) as HTMLInputElement;
      if (checkbox) checkbox.checked = (this.settings as any)[setting] ?? false;
    });

    // 更新背景和边框设置
    const textBackgroundColor = document.getElementById('textBackgroundColor') as HTMLInputElement;
    const textBackgroundOpacity = document.getElementById('textBackgroundOpacity') as HTMLInputElement;
    const boxBorderColor = document.getElementById('boxBorderColor') as HTMLInputElement;
    const boxBorderWidth = document.getElementById('boxBorderWidth') as HTMLInputElement;

    if (textBackgroundColor) textBackgroundColor.value = this.settings.textBackgroundColor || '#000000';
    if (textBackgroundOpacity) textBackgroundOpacity.value = String(this.settings.textBackgroundOpacity || 70);
    if (boxBorderColor) boxBorderColor.value = this.settings.boxBorderColor || '#007AFF';
    if (boxBorderWidth) boxBorderWidth.value = String(this.settings.boxBorderWidth || 2);

    // 更新范围值显示
    const rangeElements = [
      { id: 'textBackgroundOpacity', unit: '%' },
      { id: 'boxBorderWidth', unit: 'px' }
    ];
    rangeElements.forEach(({ id, unit }) => {
      const valueElement = document.getElementById(id + 'Value');
      if (valueElement) {
        valueElement.textContent = ((this.settings as any)[id] || 0) + unit;
      }
    });

    // 更新API状态显示
    this.updateAPIStatus();
  }

  setupCanvas() {
    this.resizeCanvas();
  }

  showSettings() {
    document.getElementById('settingsDrawer')?.classList.add('open');
  }

  hideSettings() {
    document.getElementById('settingsDrawer')?.classList.remove('open');
  }

  toggleSettings() {
    document.getElementById('settingsDrawer')?.classList.toggle('open');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleSettings();
      } else if (e.key === 'Escape') {
        this.hideSettings();
      }
    });
  }

  showPlaceholder() {
    document.getElementById('placeholder')?.classList.remove('hidden');
  }

  hidePlaceholder() {
    document.getElementById('placeholder')?.classList.add('hidden');
  }

  setupPasteEvents() {
    document.addEventListener('paste', (e) => this.handlePaste(e));
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
    });
  }

  async handlePaste(e: ClipboardEvent) {
    e.preventDefault();

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          try {
            this.showToast('正在处理粘贴的图片...');
            const imageData = await this.fileToBase64(file);
            await this.processImage(imageData);
            this.showToast('图片粘贴成功！', 'success');
          } catch (error) {
            console.error('粘贴图片失败:', error);
            this.showError('粘贴图片失败: ' + (error as Error).message);
          }
        }
        break;
      }
    }
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  setupCanvasEvents() {
    // 鼠标滚轮缩放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.zoomAt(mouseX, mouseY, delta);
    });

    // 鼠标拖拽
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.offsetX += deltaX;
        this.offsetY += deltaY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.redrawCanvas();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.redrawCanvas();
  }

  zoomAt(x: number, y: number, delta: number) {
    const prevScale = this.scale;
    this.scale *= delta;
    this.scale = Math.max(0.1, Math.min(5, this.scale));

    if (this.scale !== prevScale) {
      const scaleChange = this.scale / prevScale;
      this.offsetX = x - scaleChange * (x - this.offsetX);
      this.offsetY = y - scaleChange * (y - this.offsetY);

      this.redrawCanvas();
    }
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.redrawCanvas();
  }

  async takeScreenshot() {
    try {
      this.showStatus('准备截图...', true);
      if (this.ocrAPI && this.ocrAPI.takeScreenshot) {
        const screenshotData = await this.ocrAPI.takeScreenshot();
        if (screenshotData) {
          await this.processImage(screenshotData);
        } else {
          this.showError('截图取消或失败');
        }
      } else {
        this.showError('截图功能不可用，请检查插件配置');
      }
    } catch (error: any) {
      naimo.log.throw_error('截图失败:', error.message);
      this.showError('截图失败: ' + (error as Error).message);
    } finally {
      this.hideStatus();
    }
  }

  async openImage() {
    try {
      if (this.ocrAPI && this.ocrAPI.selectImage) {
        const imageData = await this.ocrAPI.selectImage();
        if (imageData) {
          await this.processImage(imageData);
        }
      } else {
        this.showError('选择图片功能不可用');
      }
    } catch (error) {
      console.error('打开图片失败:', error);
      this.showError('打开图片失败: ' + (error as Error).message);
    }
  }

  async processImage(imageData: string) {
    try {
      this.showStatus('正在加载图片...', true);

      const img = new Image();
      img.onload = async () => {
        this.currentImage = img;
        this.hidePlaceholder();
        this.resetView();
        this.redrawCanvas();

        // 启用按钮
        const resetBtn = document.getElementById('resetViewBtn') as HTMLButtonElement;
        const saveBtn = document.getElementById('saveImageBtn') as HTMLButtonElement;
        if (resetBtn) resetBtn.disabled = false;
        if (saveBtn) saveBtn.disabled = false;

        // 进行OCR识别
        await this.performOCR(imageData);
      };

      img.onerror = () => {
        this.showError('图片加载失败');
      };

      img.src = imageData;

    } catch (error) {
      console.error('处理图片失败:', error);
      this.showError('处理图片失败: ' + (error as Error).message);
    }
  }

  async performOCR(imageData: string) {
    try {
      this.showStatus('正在识别文字...', true);

      if (!this.settings.tencentSecretId || !this.settings.tencentSecretKey) {
        this.showError('请先配置腾讯云API密钥');
        return;
      }

      if (this.ocrAPI && this.ocrAPI.performOCR) {
        const results = await this.ocrAPI.performOCR({
          imageData: imageData,
          secretId: this.settings.tencentSecretId,
          secretKey: this.settings.tencentSecretKey,
          sourceLang: this.settings.defaultSourceLang,
          targetLang: this.settings.defaultTargetLang
        });

        if (results && results.length > 0) {
          this.ocrResults = results;
          this.redrawCanvas();
          const copyBtn = document.getElementById('copyTextBtn') as HTMLButtonElement;
          if (copyBtn) copyBtn.disabled = false;
          this.showSuccess(`成功识别 ${results.length} 个文本区域`);
        } else {
          this.showError('未识别到任何文字');
        }
      } else {
        this.showError('OCR功能不可用，请检查插件配置');
      }

    } catch (error) {
      console.error('OCR识别失败:', error);
      this.showError('OCR识别失败: ' + (error as Error).message);
    } finally {
      this.hideStatus();
    }
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentImage) return;

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    if (this.settings.showOriginalImage) {
      this.ctx.drawImage(this.currentImage, 0, 0);
    }

    this.drawOCRResults();

    this.ctx.restore();
  }

  drawOCRResults() {
    if (!this.ocrResults || this.ocrResults.length === 0) {
      return;
    }

    const showOriginal = this.settings.showOriginalText;
    const showTranslated = this.settings.showTranslatedText;

    if (!showOriginal && !showTranslated) {
      return;
    }

    this.ocrResults.forEach((result) => {
      if (!result.polygon || result.polygon.length === 0) {
        return;
      }

      const minX = Math.min(...result.polygon.map(p => p.X || 0));
      const maxX = Math.max(...result.polygon.map(p => p.X || 0));
      const minY = Math.min(...result.polygon.map(p => p.Y || 0));
      const maxY = Math.max(...result.polygon.map(p => p.Y || 0));

      const width = maxX - minX;
      const height = maxY - minY;

      const showBorder = this.settings.showBorder === true;

      // 绘制文本背景
      const bgOpacity = (this.settings.textBackgroundOpacity || 0) / 100;
      if (showBorder && bgOpacity > 0) {
        const bgColor = this.settings.textBackgroundColor || '#000000';
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        this.ctx.fillRect(minX, minY, width, height);
      }

      // 绘制边框
      const borderWidth = this.settings.boxBorderWidth || 2;
      if (showBorder && borderWidth > 0) {
        this.ctx.strokeStyle = this.settings.boxBorderColor || '#007AFF';
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(minX, minY, width, height);
      }

      const baseX = minX + 5;
      const baseY = minY + Math.max(this.settings.originalTextSize || 16, this.settings.translatedTextSize || 16);

      // 绘制原始文本
      if (showOriginal && result.originalText) {
        const offsetX = parseInt(String(this.settings.originalTextOffsetX)) || 0;
        const offsetY = parseInt(String(this.settings.originalTextOffsetY)) || 0;
        const origX = Math.max(0, baseX + offsetX);
        const origY = Math.max(this.settings.originalTextSize || 16, baseY + offsetY);

        this.drawText(
          result.originalText,
          origX,
          origY,
          Math.max(100, width - 10),
          this.settings.originalTextColor || '#FF0000',
          this.settings.originalTextSize || 16,
          this.settings.originalTextBold || false,
          this.settings.originalTextUnderline || false,
          this.settings.originalTextWrap !== false
        );
      }

      // 绘制翻译文本
      if (showTranslated && result.translatedText) {
        const offsetX = parseInt(String(this.settings.translatedTextOffsetX)) || 0;
        const offsetY = parseInt(String(this.settings.translatedTextOffsetY)) || 0;
        const transX = Math.max(0, baseX + offsetX);
        const transY = Math.max(this.settings.translatedTextSize || 16, baseY + offsetY);

        this.drawText(
          result.translatedText,
          transX,
          transY,
          Math.max(100, width - 10),
          this.settings.translatedTextColor || '#0000FF',
          this.settings.translatedTextSize || 16,
          this.settings.translatedTextBold || false,
          this.settings.translatedTextUnderline || false,
          this.settings.translatedTextWrap !== false
        );
      }
    });
  }

  drawText(text: string, x: number, y: number, maxWidth: number, color: string, size: number, bold: boolean, underline: boolean, wrap: boolean) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    if (!wrap) {
      this.ctx.fillText(text, x, y);

      if (underline) {
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + 2);
        this.ctx.lineTo(x + textWidth, y + 2);
        this.ctx.stroke();
      }
      return;
    }

    const words = text.split('');
    let line = '';
    let lineY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, lineY);

        if (underline) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, lineY + 2);
          this.ctx.lineTo(x + this.ctx.measureText(line).width, lineY + 2);
          this.ctx.strokeStyle = color;
          this.ctx.stroke();
        }

        line = words[i];
        lineY += size + 4;
      } else {
        line = testLine;
      }
    }

    if (line) {
      this.ctx.fillText(line, x, lineY);

      if (underline) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, lineY + 2);
        this.ctx.lineTo(x + this.ctx.measureText(line).width, lineY + 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
      }
    }
  }

  async saveImage() {
    try {
      if (!this.currentImage) {
        this.showError('没有可保存的图片');
        return;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.currentImage.width;
      exportCanvas.height = this.currentImage.height;
      const exportCtx = exportCanvas.getContext('2d')!;

      exportCtx.drawImage(this.currentImage, 0, 0);

      const originalScale = this.scale;
      const originalOffsetX = this.offsetX;
      const originalOffsetY = this.offsetY;

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      const originalCtx = this.ctx;
      this.ctx = exportCtx;
      this.drawOCRResults();
      this.ctx = originalCtx;

      this.scale = originalScale;
      this.offsetX = originalOffsetX;
      this.offsetY = originalOffsetY;

      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ocr_result_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          this.showSuccess('图片已保存');
        }
      });

    } catch (error) {
      console.error('保存图片失败:', error);
      this.showError('保存图片失败: ' + (error as Error).message);
    }
  }

  async copyText() {
    try {
      if (!this.ocrResults || this.ocrResults.length === 0) {
        this.showError('没有可复制的文本');
        return;
      }

      const showOriginal = this.settings.showOriginalText;
      const showTranslated = this.settings.showTranslatedText;

      let textToCopy = '';

      this.ocrResults.forEach((result, index) => {
        if (index > 0) textToCopy += '\n\n';

        if (showOriginal && result.originalText) {
          textToCopy += `原文: ${result.originalText}`;
        }

        if (showTranslated && result.translatedText) {
          if (showOriginal) textToCopy += '\n';
          textToCopy += `译文: ${result.translatedText}`;
        }
      });

      await this.naimo.clipboard.writeText(textToCopy);
      this.showSuccess('文本已复制到剪贴板');

    } catch (error) {
      console.error('复制文本失败:', error);
      this.showError('复制文本失败: ' + (error as Error).message);
    }
  }

  showStatus(message: string, showProgress = false) {
    console.log('状态:', message);
    this.showToast(message);

    if (showProgress) {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.style.display = 'block';
      }
    }
  }

  hideStatus() {
    console.log('隐藏状态');
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  showError(message: string) {
    console.error('错误:', message);
    this.showToast(message, 'error');
    this.hideStatus();
  }

  showSuccess(message: string) {
    console.log('成功:', message);
    this.showToast(message, 'success');
  }

  showToast(message: string, type = 'info') {
    const toast = document.getElementById('statusToast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg opacity-0 transition-opacity duration-300';

    if (type === 'error') {
      toast.classList.add('bg-red-500', 'text-white');
    } else if (type === 'success') {
      toast.classList.add('bg-green-500', 'text-white');
    } else {
      toast.classList.add('bg-white', 'text-gray-800');
    }

    setTimeout(() => {
      toast.classList.remove('opacity-0');
      toast.classList.add('opacity-100');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 3000);
  }
}

// ==================== 入口 ====================

async function initApp(): Promise<void> {
  console.log('应用初始化...');

  try {
    new OCRTranslator();
    window.naimo.log.info('OCR翻译插件初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
    window.naimo.log.error('OCR翻译插件初始化失败', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
