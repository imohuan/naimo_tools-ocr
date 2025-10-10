// OCR翻译插件主脚本
class OCRTranslator {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {};
    this.ocrResults = [];
    this.currentImage = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupCanvas();
    this.updateSettingsUI();
    this.showPlaceholder(); // 初始显示占位符

    // 检查是否需要自动启动截图
    setTimeout(() => {
      this.checkAutoStartScreenshot();
    }, 500);
  }

  checkAutoStartScreenshot() {
    try {
      // 从 __metadata 中获取窗口打开时传入的参数
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
      // 加载本地UI设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.loadSettings) {
        const localSettings = await window.ocrPluginAPI.loadSettings();
        if (localSettings) {
          this.settings = { ...this.settings, ...localSettings };
        }
      }

      // 加载全局API设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.getGlobalSettings) {
        const globalSettings = await window.ocrPluginAPI.getGlobalSettings();
        if (globalSettings) {
          this.settings.tencentSecretId = globalSettings.tencentSecretId || '';
          this.settings.tencentSecretKey = globalSettings.tencentSecretKey || '';
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }

    // 设置默认值
    this.settings = {
      tencentSecretId: '',
      tencentSecretKey: '',
      defaultSourceLang: 'auto',
      defaultTargetLang: 'zh',
      showOriginalImage: true,
      showOriginalText: true,
      showTranslatedText: true,
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
      translatedTextOffsetY: 0,
      textBackgroundOpacity: 70,
      textBackgroundColor: '#000000',
      boxBorderColor: '#007AFF',
      boxBorderWidth: 2,
      ...this.settings
    };
  }

  async saveSettings() {
    try {
      // 保存本地UI设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.saveSettings) {
        const localSettings = { ...this.settings };
        // 移除API密钥，这些应该保存到全局设置中
        delete localSettings.tencentSecretId;
        delete localSettings.tencentSecretKey;
        await window.ocrPluginAPI.saveSettings(localSettings);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  async updateAPIStatus() {
    try {
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');
      const apiStatus = document.getElementById('apiStatus');

      if (!statusIndicator || !statusText || !apiStatus) return;

      // 检查API密钥是否配置
      const hasSecretId = this.settings.tencentSecretId && this.settings.tencentSecretId.trim();
      const hasSecretKey = this.settings.tencentSecretKey && this.settings.tencentSecretKey.trim();

      if (hasSecretId && hasSecretKey) {
        statusIndicator.textContent = '🟢';
        statusText.textContent = '已配置';
        apiStatus.className = 'api-status configured';
      } else {
        statusIndicator.textContent = '🔴';
        statusText.textContent = '未配置';
        apiStatus.className = 'api-status error';
      }
    } catch (error) {
      console.error('更新API状态失败:', error);
    }
  }

  setupEventListeners() {
    // 控制栏按钮
    document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());
    document.getElementById('openImageBtn').addEventListener('click', () => this.openImage());
    document.getElementById('resetViewBtn').addEventListener('click', () => this.resetView());
    document.getElementById('saveImageBtn').addEventListener('click', () => this.saveImage());
    document.getElementById('copyTextBtn').addEventListener('click', () => this.copyText());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

    // 设置面板
    document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());

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
      'showOriginalImage', 'showOriginalText', 'showTranslatedText',
      'originalTextColor', 'translatedTextColor', 'originalTextSize', 'translatedTextSize',
      'originalTextBold', 'translatedTextBold', 'originalTextUnderline', 'translatedTextUnderline',
      'originalTextWrap', 'translatedTextWrap',
      'originalTextOffsetX', 'originalTextOffsetY', 'translatedTextOffsetX', 'translatedTextOffsetY',
      'textBackgroundOpacity', 'textBackgroundColor', 'boxBorderColor', 'boxBorderWidth', 'showBorder'
    ];

    // 设置切换按钮事件
    this.setupToggleButtons();

    // 设置数字输入框支持上下键
    this.setupNumberInputs();

    settingIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => this.updateSetting(id, e));
        element.addEventListener('input', (e) => this.updateSetting(id, e));
      }
    });
  }

  updateSetting(id, event) {
    const element = event.target;
    let value = element.type === 'checkbox' ? element.checked : element.value;

    // 映射设置名称
    const settingMap = {
      'sourceLang': 'defaultSourceLang',
      'targetLang': 'defaultTargetLang'
    };

    const settingName = settingMap[id] || id;

    // 转换数值类型
    if (id.includes('Size') || id === 'textBackgroundOpacity') {
      value = parseInt(value);
    }

    this.settings[settingName] = value;
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
    document.getElementById('sourceLang').value = this.settings.defaultSourceLang || 'auto';
    document.getElementById('targetLang').value = this.settings.defaultTargetLang || 'zh';

    // 更新显示选项和对应按钮
    const displaySettings = [
      'showOriginalImage', 'showOriginalText', 'showTranslatedText', 'showBorder'
    ];
    displaySettings.forEach(setting => {
      const checkbox = document.getElementById(setting);
      const button = document.querySelector(`[data-target="${setting}"]`);
      if (checkbox) checkbox.checked = this.settings[setting];
      if (button) button.classList.toggle('active', this.settings[setting]);
    });

    // 更新文本样式
    document.getElementById('originalTextColor').value = this.settings.originalTextColor;
    document.getElementById('translatedTextColor').value = this.settings.translatedTextColor;
    document.getElementById('originalTextSize').value = this.settings.originalTextSize;
    document.getElementById('translatedTextSize').value = this.settings.translatedTextSize;

    // 更新偏移设置
    document.getElementById('originalTextOffsetX').value = this.settings.originalTextOffsetX || 0;
    document.getElementById('originalTextOffsetY').value = this.settings.originalTextOffsetY || 0;
    document.getElementById('translatedTextOffsetX').value = this.settings.translatedTextOffsetX || 0;
    document.getElementById('translatedTextOffsetY').value = this.settings.translatedTextOffsetY || 0;

    // 更新样式切换按钮
    const styleSettings = [
      'originalTextBold', 'originalTextUnderline', 'originalTextWrap',
      'translatedTextBold', 'translatedTextUnderline', 'translatedTextWrap'
    ];
    styleSettings.forEach(setting => {
      const checkbox = document.getElementById(setting);
      const button = document.querySelector(`[data-target="${setting}"]`);
      if (checkbox) checkbox.checked = this.settings[setting];
      if (button) button.classList.toggle('active', this.settings[setting]);
    });

    // 更新背景和边框设置
    document.getElementById('textBackgroundColor').value = this.settings.textBackgroundColor || '#000000';
    document.getElementById('textBackgroundOpacity').value = this.settings.textBackgroundOpacity;
    document.getElementById('boxBorderColor').value = this.settings.boxBorderColor || '#007AFF';
    document.getElementById('boxBorderWidth').value = this.settings.boxBorderWidth || 2;

    // 更新范围值显示
    const rangeElements = [
      { id: 'textBackgroundOpacity', unit: '%' },
      { id: 'boxBorderWidth', unit: 'px' }
    ];
    rangeElements.forEach(({ id, unit }) => {
      const valueElement = document.getElementById(id + 'Value');
      if (valueElement) {
        valueElement.textContent = this.settings[id] + unit;
      }
    });

    // 更新API状态显示
    this.updateAPIStatus();
  }

  setupCanvas() {
    this.resizeCanvas();
  }

  showSettings() {
    document.getElementById('settingsDrawer').classList.add('open');
  }

  hideSettings() {
    document.getElementById('settingsDrawer').classList.remove('open');
  }

  toggleSettings() {
    const drawer = document.getElementById('settingsDrawer');
    drawer.classList.toggle('open');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Tab键切换设置面板
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleSettings();
      }
      // Escape键关闭设置面板
      else if (e.key === 'Escape') {
        this.hideSettings();
      }
    });
  }

  showPlaceholder() {
    document.getElementById('placeholder').classList.remove('hidden');
  }

  hidePlaceholder() {
    document.getElementById('placeholder').classList.add('hidden');
  }

  setupPasteEvents() {
    // 监听键盘粘贴事件
    document.addEventListener('paste', (e) => this.handlePaste(e));

    // 确保Canvas能接收焦点
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
    });
  }

  async handlePaste(e) {
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
            this.showError('粘贴图片失败: ' + error.message);
          }
        }
        break;
      }
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  setupToggleButtons() {
    // 显示选项切换按钮
    const displayToggles = ['showOriginalImageBtn', 'showOriginalTextBtn', 'showTranslatedTextBtn', 'showBorderBtn'];
    displayToggles.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.toggleSetting(btn));
      }
    });

    // 样式切换按钮
    const styleToggles = [
      'originalTextBoldBtn', 'originalTextUnderlineBtn', 'originalTextWrapBtn',
      'translatedTextBoldBtn', 'translatedTextUnderlineBtn', 'translatedTextWrapBtn'
    ];
    styleToggles.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.toggleSetting(btn));
      }
    });
  }

  setupNumberInputs() {
    const numberInputs = [
      'originalTextSize', 'translatedTextSize',
      'originalTextOffsetX', 'originalTextOffsetY',
      'translatedTextOffsetX', 'translatedTextOffsetY'
    ];

    numberInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        // 支持键盘上下键调整数值
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            input.value = Math.min(parseInt(input.max), parseInt(input.value) + 1);
            this.updateSetting(inputId, { target: input });
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            input.value = Math.max(parseInt(input.min), parseInt(input.value) - 1);
            this.updateSetting(inputId, { target: input });
          }
        });
      }
    });
  }

  toggleSetting(button) {
    const targetId = button.getAttribute('data-target');
    const checkbox = document.getElementById(targetId);

    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      button.classList.toggle('active', checkbox.checked);
      this.updateSetting(targetId, { target: checkbox });
    }
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
        this.updateCanvasInfo();
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
    // 设置Canvas为全屏大小
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.redrawCanvas();
  }

  zoomAt(x, y, delta) {
    const prevScale = this.scale;
    this.scale *= delta;
    this.scale = Math.max(0.1, Math.min(5, this.scale));

    if (this.scale !== prevScale) {
      const scaleChange = this.scale / prevScale;
      this.offsetX = x - scaleChange * (x - this.offsetX);
      this.offsetY = y - scaleChange * (y - this.offsetY);

      this.redrawCanvas();
      this.updateCanvasInfo();
    }
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.redrawCanvas();
    this.updateCanvasInfo();
  }

  updateCanvasInfo() {
    // Canvas信息现在显示在状态提示中
    // const info = `缩放: ${Math.round(this.scale * 100)}% | 位置: (${Math.round(this.offsetX)}, ${Math.round(this.offsetY)})`;
    // console.log(info);
  }

  async takeScreenshot() {
    try {
      this.showStatus('准备截图...', true);

      if (window.ocrPluginAPI && window.ocrPluginAPI.takeScreenshot) {
        const screenshotData = await window.ocrPluginAPI.takeScreenshot();
        if (screenshotData) {
          await this.processImage(screenshotData);
        } else {
          this.showError('截图取消或失败');
        }
      } else {
        this.showError('截图功能不可用，请检查插件配置');
      }
    } catch (error) {
      console.error('截图失败:', error);
      this.showError('截图失败: ' + error.message);
    } finally {
      this.hideStatus();
    }
  }

  async openImage() {
    try {
      if (window.ocrPluginAPI && window.ocrPluginAPI.selectImage) {
        const imageData = await window.ocrPluginAPI.selectImage();
        if (imageData) {
          await this.processImage(imageData);
        }
      } else {
        // 备用方案：使用文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
              await this.processImage(e.target.result);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('打开图片失败:', error);
      this.showError('打开图片失败: ' + error.message);
    }
  }

  async processImage(imageData) {
    try {
      this.showStatus('正在加载图片...', true);

      // 加载图片
      const img = new Image();
      img.onload = async () => {
        this.currentImage = img;
        this.hidePlaceholder();
        this.resetView();
        this.redrawCanvas();

        // 启用按钮
        document.getElementById('resetViewBtn').disabled = false;
        document.getElementById('saveImageBtn').disabled = false;

        // 进行OCR识别
        await this.performOCR(imageData);
      };

      img.onerror = () => {
        this.showError('图片加载失败');
      };

      img.src = imageData;

    } catch (error) {
      console.error('处理图片失败:', error);
      this.showError('处理图片失败: ' + error.message);
    }
  }

  async performOCR(imageData) {
    try {
      this.showStatus('正在识别文字...', true);

      if (!this.settings.tencentSecretId || !this.settings.tencentSecretKey) {
        this.showError('请先配置腾讯云API密钥');
        return;
      }

      // 调用OCR API
      if (window.ocrPluginAPI && window.ocrPluginAPI.performOCR) {
        const results = await window.ocrPluginAPI.performOCR({
          imageData: imageData,
          secretId: this.settings.tencentSecretId,
          secretKey: this.settings.tencentSecretKey,
          sourceLang: this.settings.defaultSourceLang,
          targetLang: this.settings.defaultTargetLang
        });

        if (results && results.length > 0) {
          this.ocrResults = results;
          this.redrawCanvas();
          document.getElementById('copyTextBtn').disabled = false;
          this.showSuccess(`成功识别 ${results.length} 个文本区域`);
        } else {
          this.showError('未识别到任何文字');
        }
      } else {
        this.showError('OCR功能不可用，请检查插件配置');
      }

    } catch (error) {
      console.error('OCR识别失败:', error);
      this.showError('OCR识别失败: ' + error.message);
    } finally {
      this.hideStatus();
    }
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentImage) return;

    // 保存当前状态
    this.ctx.save();

    // 应用变换
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // 绘制原始图片（如果启用）
    if (this.settings.showOriginalImage) {
      this.ctx.drawImage(this.currentImage, 0, 0);
    }

    // 绘制OCR结果
    this.drawOCRResults();

    // 恢复状态
    this.ctx.restore();
  }

  drawOCRResults() {
    if (!this.ocrResults || this.ocrResults.length === 0) {
      console.log('没有OCR结果需要绘制');
      return;
    }

    console.log('开始绘制OCR结果，共', this.ocrResults.length, '个区域');

    const showOriginal = this.settings.showOriginalText;
    const showTranslated = this.settings.showTranslatedText;

    if (!showOriginal && !showTranslated) {
      console.log('文本显示被禁用');
      return;
    }

    this.ocrResults.forEach((result, index) => {
      console.log(`处理第${index + 1}个OCR结果:`, result);

      if (!result.polygon || result.polygon.length === 0) {
        console.warn(`第${index + 1}个结果没有坐标信息`);
        return;
      }

      // 计算文本区域
      const minX = Math.min(...result.polygon.map(p => p.X || p.x || 0));
      const maxX = Math.max(...result.polygon.map(p => p.X || p.x || 0));
      const minY = Math.min(...result.polygon.map(p => p.Y || p.y || 0));
      const maxY = Math.max(...result.polygon.map(p => p.Y || p.y || 0));

      const width = maxX - minX;
      const height = maxY - minY;

      console.log(`文本区域: (${minX}, ${minY}) 到 (${maxX}, ${maxY}), 大小: ${width}x${height}`);

      // 检查是否显示背景和边框
      const showBorder = this.settings.showBorder === true;

      // 绘制文本背景（仅在开启背景显示时）
      const bgOpacity = this.settings.textBackgroundOpacity / 100;
      if (showBorder && bgOpacity > 0) {
        const bgColor = this.settings.textBackgroundColor || '#000000';
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        this.ctx.fillRect(minX, minY, width, height);
      }

      // 绘制边框（仅在开启边框显示时）
      const borderWidth = this.settings.boxBorderWidth || 2;
      if (showBorder && borderWidth > 0) {
        this.ctx.strokeStyle = this.settings.boxBorderColor || '#007AFF';
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(minX, minY, width, height);
      }

      // 计算文本位置 - 使用统一的基准位置
      const baseX = minX + 5;
      const baseY = minY + Math.max(this.settings.originalTextSize, this.settings.translatedTextSize);

      // 绘制原始文本（不含背景）
      if (showOriginal && result.originalText) {
        console.log(`绘制原始文本: "${result.originalText}"`);
        const offsetX = parseInt(this.settings.originalTextOffsetX) || 0;
        const offsetY = parseInt(this.settings.originalTextOffsetY) || 0;
        const origX = Math.max(0, baseX + offsetX);
        const origY = Math.max(this.settings.originalTextSize, baseY + offsetY);

        console.log(`原始文本坐标: (${origX}, ${origY}), 偏移: (${offsetX}, ${offsetY})`);

        this.drawText(
          result.originalText,
          origX,
          origY,
          Math.max(100, width - 10),
          this.settings.originalTextColor,
          this.settings.originalTextSize,
          this.settings.originalTextBold,
          this.settings.originalTextUnderline,
          this.settings.originalTextWrap
        );
      }

      // 绘制翻译文本（不含背景） - 使用相同的基准位置
      if (showTranslated && result.translatedText) {
        console.log(`绘制翻译文本: "${result.translatedText}"`);
        const offsetX = parseInt(this.settings.translatedTextOffsetX) || 0;
        const offsetY = parseInt(this.settings.translatedTextOffsetY) || 0; // 默认偏移改为0
        const transX = Math.max(0, baseX + offsetX);
        const transY = Math.max(this.settings.translatedTextSize, baseY + offsetY);

        console.log(`翻译文本坐标: (${transX}, ${transY}), 偏移: (${offsetX}, ${offsetY})`);

        this.drawText(
          result.translatedText,
          transX,
          transY,
          Math.max(100, width - 10),
          this.settings.translatedTextColor,
          this.settings.translatedTextSize,
          this.settings.translatedTextBold,
          this.settings.translatedTextUnderline,
          this.settings.translatedTextWrap
        );
      }
    });
  }

  drawTextWithBackground(text, x, y, maxWidth, color, size, bold, underline, wrap = true) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    console.log(`绘制文本（含背景）: "${text}" 在 (${x}, ${y}), 换行: ${wrap}`);

    // 计算背景透明度和颜色
    const bgOpacity = this.settings.textBackgroundOpacity / 100;
    let bgColor = null;
    if (bgOpacity > 0) {
      const bgColorHex = this.settings.textBackgroundColor || '#000000';
      const r = parseInt(bgColorHex.slice(1, 3), 16);
      const g = parseInt(bgColorHex.slice(3, 5), 16);
      const b = parseInt(bgColorHex.slice(5, 7), 16);
      bgColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
    }

    if (!wrap) {
      // 不换行，直接绘制单行
      const textWidth = this.ctx.measureText(text).width;

      // 绘制背景
      if (bgColor) {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x - 2, y - size, textWidth + 4, size + 4);
      }

      // 绘制文本
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, x, y);

      if (underline) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + 2);
        this.ctx.lineTo(x + textWidth, y + 2);
        this.ctx.stroke();
      }
      return;
    }

    // 文本换行处理 - 先计算所有行，然后绘制背景和文本
    const words = text.split('');
    let line = '';
    let lineY = y;
    const lines = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        lines.push({ text: line, y: lineY, width: this.ctx.measureText(line).width });
        line = words[i];
        lineY += size + 4;
      } else {
        line = testLine;
      }
    }

    if (line) {
      lines.push({ text: line, y: lineY, width: this.ctx.measureText(line).width });
    }

    // 绘制所有行的背景和文本
    lines.forEach(lineInfo => {
      // 绘制背景
      if (bgColor) {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x - 2, lineInfo.y - size, lineInfo.width + 4, size + 4);
      }

      // 绘制文本
      this.ctx.fillStyle = color;
      this.ctx.fillText(lineInfo.text, x, lineInfo.y);

      // 绘制下划线
      if (underline) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, lineInfo.y + 2);
        this.ctx.lineTo(x + lineInfo.width, lineInfo.y + 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
      }
    });
  }

  drawText(text, x, y, maxWidth, color, size, bold, underline, wrap = true) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    console.log(`绘制文本: "${text}" 在 (${x}, ${y}), 换行: ${wrap}`);

    if (!wrap) {
      // 不换行，直接绘制单行
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

    // 文本换行处理
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

      // 创建新的canvas用于导出
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.currentImage.width;
      exportCanvas.height = this.currentImage.height;
      const exportCtx = exportCanvas.getContext('2d');

      // 绘制图片和OCR结果
      exportCtx.drawImage(this.currentImage, 0, 0);

      // 临时设置scale和offset为1和0来正确绘制OCR结果
      const originalScale = this.scale;
      const originalOffsetX = this.offsetX;
      const originalOffsetY = this.offsetY;

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      // 在导出canvas上绘制OCR结果
      const originalCtx = this.ctx;
      this.ctx = exportCtx;
      this.drawOCRResults();
      this.ctx = originalCtx;

      // 恢复原始值
      this.scale = originalScale;
      this.offsetX = originalOffsetX;
      this.offsetY = originalOffsetY;

      // 下载图片
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr_result_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        this.showSuccess('图片已保存');
      });

    } catch (error) {
      console.error('保存图片失败:', error);
      this.showError('保存图片失败: ' + error.message);
    }
  }

  copyText() {
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

      if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showSuccess('文本已复制到剪贴板');
        });
      } else {
        // 备用方案
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showSuccess('文本已复制到剪贴板');
      }

    } catch (error) {
      console.error('复制文本失败:', error);
      this.showError('复制文本失败: ' + error.message);
    }
  }


  showStatus(message, showProgress = false) {
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

  showError(message) {
    console.error('错误:', message);
    this.showToast(message, 'error');
    this.hideStatus();
  }

  showSuccess(message) {
    console.log('成功:', message);
    this.showToast(message, 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    toast.textContent = message;
    toast.className = 'status-toast show';

    if (type === 'error') {
      toast.style.background = 'rgba(244, 67, 54, 0.95)';
      toast.style.color = 'white';
    } else if (type === 'success') {
      toast.style.background = 'rgba(76, 175, 80, 0.95)';
      toast.style.color = 'white';
    } else {
      toast.style.background = 'rgba(255, 255, 255, 0.95)';
      toast.style.color = '#333';
    }

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.ocrTranslator = new OCRTranslator();
});
