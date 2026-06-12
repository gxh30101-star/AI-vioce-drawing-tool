/* ==========================================================================
   语音绘图工具 - Voice-Controlled Drawing Tool
   Pure voice-driven canvas application using Web Speech API
   ========================================================================== */

// ===== Configuration =====
const CONFIG = {
  maxHistory: 50,        // max undo states
  maxHistoryItems: 100,  // max command history entries
  defaultColor: '#2c3e50',
  defaultSize: 'medium',
  defaultShape: 'circle',
  frameQuality: 0.92,
  canvasBg: '#ffffff',
  ttsRate: 1.1,
  ttsVolume: 0.8,
  restartDelay: 300,     // ms before restarting speech recognition
};

const COLORS = {
  '红':   '#e74c3c', '红色': '#e74c3c', 'red': '#e74c3c',
  '蓝':   '#3498db', '蓝色': '#3498db', 'blue': '#3498db',
  '绿':   '#2ecc71', '绿色': '#2ecc71', 'green': '#2ecc71',
  '黄':   '#f1c40f', '黄色': '#f1c40f', 'yellow': '#f1c40f',
  '紫':   '#9b59b6', '紫色': '#9b59b6', 'purple': '#9b59b6',
  '橙':   '#e67e22', '橙色': '#e67e22', 'orange': '#e67e22',
  '黑':   '#2c3e50', '黑色': '#2c3e50', 'black': '#2c3e50',
  '白':   '#ecf0f1', '白色': '#ecf0f1', 'white': '#ecf0f1',
  '粉':   '#e91e63', '粉色': '#e91e63', 'pink': '#e91e63',
  '青':   '#00bcd4', '青色': '#00bcd4', 'cyan': '#00bcd4',
  '棕':   '#795548', '棕色': '#795548', 'brown': '#795548',
  '灰':   '#9e9e9e', '灰色': '#9e9e9e', 'grey': '#9e9e9e', 'gray': '#9e9e9e',
};

const COLOR_NAMES = {};
for (const [key, val] of Object.entries(COLORS)) {
  if (key.length > 1) COLOR_NAMES[val] = key;
}

const SHAPES = {
  '圆': 'circle', '圆形': 'circle', '圆圈': 'circle',
  '方': 'rect', '方形': 'rect', '矩形': 'rect', '正方形': 'rect', '方块': 'rect', '长方形': 'rect',
  '三角': 'triangle', '三角形': 'triangle',
  '线': 'line', '直线': 'line', '线条': 'line',
  '星': 'star', '五角星': 'star', '星星': 'star',
  '箭头': 'arrow',
  '心': 'heart', '爱心': 'heart', '心形': 'heart',
  '菱形': 'diamond', '钻石': 'diamond',
  '五边形': 'pentagon',
  '六边形': 'hexagon',
  '文字': 'text', '文本': 'text', '字': 'text', '写': 'text',
  '波浪': 'wavy', '波浪线': 'wavy',
  '虚线': 'dashed',
  '螺旋': 'spiral', '漩涡': 'spiral',
};

const SIZES = {
  '小': 'small', '小的': 'small', '小小的': 'small',
  '中': 'medium', '中等': 'medium', '中等的': 'medium', '适中': 'medium',
  '大': 'large', '大的': 'large', '大大的': 'large',
  '超大': 'xlarge', '巨大': 'xlarge', '超大的': 'xlarge', '特大': 'xlarge',
};

const SIZE_VALUES = {
  small: 30, medium: 60, large: 100, xlarge: 150,
};

const SIZE_NAMES = {
  small: '小', medium: '中等', large: '大', xlarge: '超大',
};

const POSITIONS = {
  '左上': 'top-left', '左上角': 'top-left',
  '上面': 'top', '上方': 'top', '顶部': 'top', '上边': 'top', '顶端': 'top',
  '右上': 'top-right', '右上角': 'top-right',
  '左边': 'left', '左侧': 'left', '左侧的': 'left', '左面': 'left',
  '中间': 'center', '中心': 'center', '正中': 'center', '中央': 'center',
  '右边': 'right', '右侧': 'right', '右侧的': 'right', '右面': 'right',
  '左下': 'bottom-left', '左下角': 'bottom-left',
  '下面': 'bottom', '下方': 'bottom', '底部': 'bottom', '下边': 'bottom',
  '右下': 'bottom-right', '右下角': 'bottom-right',
};

// ===== Speech Manager =====
class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isMuted = false;
    this.onResult = null;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this._shouldRestart = false;
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('此浏览器不支持语音识别，请使用 Chrome 浏览器');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (this.onResult) {
        this.onResult({ final: finalText, interim: interimText, isFinal: !!finalText });
      }
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
      // Auto-restart unless explicitly stopped or muted
      if (this._shouldRestart && !this.isMuted) {
        setTimeout(() => this.start(), CONFIG.restartDelay);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('Speech error:', event.error);
      if (this.onError) this.onError(event.error);
    };
  }

  start() {
    if (!this.recognition) return;
    if (this.isListening) return;
    this._shouldRestart = true;
    this.isMuted = false;
    try {
      this.recognition.start();
    } catch (e) {
      // Already started, ignore
    }
  }

  stop() {
    this._shouldRestart = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this._shouldRestart = false;
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    } else {
      this._shouldRestart = true;
      this.start();
    }
    return this.isMuted;
  }
}

// ===== Agent Engine (Local Intelligent Parser) =====
class AgentEngine {
  constructor() {
    this.lastCommands = []; // for modification support
    this.conversationContext = null; // pending scene info
  }

  // Scene templates: keywords → drawing command sequences
  static SCENES = {
    '日落': {
      reply: '为你画一幅日落美景',
      commands: [
        { action: 'draw', shape: 'rect', color: '#f39c12', size: 'xlarge', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'large', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'medium', position: 'center' },
        { action: 'draw', shape: 'wavy', color: '#3498db', size: 'xlarge', position: 'bottom-left' },
        { action: 'draw', shape: 'wavy', color: '#2980b9', size: 'large', position: 'bottom-right' },
      ]
    },
    '夕阳': { alias: '日落' },
    '海滩': {
      reply: '为你画一片海滩风景',
      commands: [
        { action: 'draw', shape: 'rect', color: '#f1c40f', size: 'xlarge', position: 'bottom' },
        { action: 'draw', shape: 'wavy', color: '#3498db', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#f39c12', size: 'large', position: 'top-right' },
        { action: 'draw', shape: 'wavy', color: '#2980b9', size: 'large', position: 'bottom' },
        { action: 'draw', shape: 'triangle', color: '#27ae60', size: 'medium', position: 'top-left' },
      ]
    },
    '沙滩': { alias: '海滩' },
    '城堡': {
      reply: '为你画一座城堡',
      commands: [
        { action: 'draw', shape: 'rect', color: '#95a5a6', size: 'large', position: 'center' },
        { action: 'draw', shape: 'rect', color: '#7f8c8d', size: 'medium', position: 'top-left' },
        { action: 'draw', shape: 'rect', color: '#7f8c8d', size: 'medium', position: 'top-right' },
        { action: 'draw', shape: 'triangle', color: '#e74c3c', size: 'medium', position: 'top-left' },
        { action: 'draw', shape: 'triangle', color: '#e74c3c', size: 'medium', position: 'top-right' },
        { action: 'draw', shape: 'rect', color: '#6c3483', size: 'small', position: 'center' },
        { action: 'draw', shape: 'rect', color: '#2c3e50', size: 'small', position: 'bottom' },
      ]
    },
    '房子': {
      reply: '为你画一座房子',
      commands: [
        { action: 'draw', shape: 'rect', color: '#e67e22', size: 'large', position: 'center' },
        { action: 'draw', shape: 'triangle', color: '#c0392b', size: 'large', position: 'top' },
        { action: 'draw', shape: 'rect', color: '#8b4513', size: 'small', position: 'bottom' },
        { action: 'draw', shape: 'rect', color: '#3498db', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'rect', color: '#3498db', size: 'small', position: 'top-right' },
      ]
    },
    '花园': {
      reply: '为你画一座花园',
      commands: [
        { action: 'draw', shape: 'rect', color: '#27ae60', size: 'xlarge', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#e91e63', size: 'medium', position: 'bottom-left' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'medium', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#9b59b6', size: 'medium', position: 'bottom-right' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'small', position: 'left' },
        { action: 'draw', shape: 'circle', color: '#3498db', size: 'small', position: 'right' },
        { action: 'draw', shape: 'circle', color: '#f39c12', size: 'xlarge', position: 'top-right' },
      ]
    },
    '星空': {
      reply: '为你画一片星空',
      commands: [
        { action: 'draw', shape: 'rect', color: '#0f0f2a', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'star', color: '#f1c40f', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'star', color: '#ffffff', size: 'small', position: 'top' },
        { action: 'draw', shape: 'star', color: '#f1c40f', size: 'medium', position: 'top-right' },
        { action: 'draw', shape: 'star', color: '#ffffff', size: 'small', position: 'left' },
        { action: 'draw', shape: 'star', color: '#f1c40f', size: 'small', position: 'right' },
        { action: 'draw', shape: 'circle', color: '#ecf0f1', size: 'large', position: 'top' },
      ]
    },
    '夜空': { alias: '星空' },
    '山水': {
      reply: '为你画一幅山水画',
      commands: [
        { action: 'draw', shape: 'rect', color: '#ecf0f1', size: 'xlarge', position: 'bottom' },
        { action: 'draw', shape: 'triangle', color: '#27ae60', size: 'xlarge', position: 'bottom-left' },
        { action: 'draw', shape: 'triangle', color: '#2ecc71', size: 'large', position: 'bottom-right' },
        { action: 'draw', shape: 'wavy', color: '#3498db', size: 'large', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'medium', position: 'top-right' },
      ]
    },
    '雪人': {
      reply: '为你画一个雪人',
      commands: [
        { action: 'draw', shape: 'circle', color: '#ecf0f1', size: 'xlarge', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#ecf0f1', size: 'large', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#ecf0f1', size: 'medium', position: 'top' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'triangle', color: '#e67e22', size: 'small', position: 'center' },
      ]
    },
    '太阳': {
      reply: '为你画一个太阳',
      commands: [
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'star', color: '#f39c12', size: 'xlarge', position: 'center' },
      ]
    },
    '树': {
      reply: '为你画一棵树',
      commands: [
        { action: 'draw', shape: 'rect', color: '#795548', size: 'medium', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#27ae60', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#2ecc71', size: 'large', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#27ae60', size: 'large', position: 'top-right' },
      ]
    },
    '大树': { alias: '树' },
    '猫': {
      reply: '为你画一只猫',
      commands: [
        { action: 'draw', shape: 'circle', color: '#e67e22', size: 'large', position: 'center' },
        { action: 'draw', shape: 'triangle', color: '#e67e22', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'triangle', color: '#e67e22', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'heart', color: '#e91e63', size: 'small', position: 'center' },
      ]
    },
    '小猫': { alias: '猫' },
    '狗': {
      reply: '为你画一只狗',
      commands: [
        { action: 'draw', shape: 'circle', color: '#795548', size: 'large', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#795548', size: 'medium', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#795548', size: 'medium', position: 'top-right' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'circle', color: '#000000', size: 'small', position: 'center' },
      ]
    },
    '小狗': { alias: '狗' },
    '彩虹': {
      reply: '为你画一道彩虹',
      commands: [
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#e67e22', size: 'large', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'medium', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#2ecc71', size: 'small', position: 'center' },
      ]
    },
    '蛋糕': {
      reply: '为你画一个蛋糕',
      commands: [
        { action: 'draw', shape: 'rect', color: '#e91e63', size: 'large', position: 'bottom' },
        { action: 'draw', shape: 'rect', color: '#f1c40f', size: 'large', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'small', position: 'top' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'small', position: 'top-right' },
      ]
    },
    '气球': {
      reply: '为你画气球',
      commands: [
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'large', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#3498db', size: 'large', position: 'top' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'large', position: 'top-right' },
        { action: 'draw', shape: 'line', color: '#2c3e50', size: 'medium', position: 'top-left' },
        { action: 'draw', shape: 'line', color: '#2c3e50', size: 'medium', position: 'top' },
        { action: 'draw', shape: 'line', color: '#2c3e50', size: 'medium', position: 'top-right' },
      ]
    },
    '爱心': {
      reply: '为你画一颗爱心',
      commands: [
        { action: 'draw', shape: 'heart', color: '#e74c3c', size: 'xlarge', position: 'center' },
      ]
    },
    '音乐': {
      reply: '为你画音乐符号',
      commands: [
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'medium', position: 'bottom-left' },
        { action: 'draw', shape: 'circle', color: '#2c3e50', size: 'medium', position: 'bottom-right' },
        { action: 'draw', shape: 'line', color: '#2c3e50', size: 'xlarge', position: 'top' },
      ]
    },
    '机器人': {
      reply: '为你画一个机器人',
      commands: [
        { action: 'draw', shape: 'rect', color: '#95a5a6', size: 'large', position: 'center' },
        { action: 'draw', shape: 'rect', color: '#7f8c8d', size: 'medium', position: 'top' },
        { action: 'draw', shape: 'circle', color: '#3498db', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'rect', color: '#95a5a6', size: 'small', position: 'bottom-left' },
        { action: 'draw', shape: 'rect', color: '#95a5a6', size: 'small', position: 'bottom-right' },
      ]
    },
    '飞船': {
      reply: '为你画一艘飞船',
      commands: [
        { action: 'draw', shape: 'diamond', color: '#95a5a6', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#3498db', size: 'medium', position: 'center' },
        { action: 'draw', shape: 'triangle', color: '#e74c3c', size: 'medium', position: 'bottom' },
        { action: 'draw', shape: 'triangle', color: '#f39c12', size: 'small', position: 'bottom' },
      ]
    },
    '摩天轮': {
      reply: '为你画一个摩天轮',
      commands: [
        { action: 'draw', shape: 'circle', color: '#e74c3c', size: 'xlarge', position: 'center' },
        { action: 'draw', shape: 'circle', color: '#3498db', size: 'small', position: 'top' },
        { action: 'draw', shape: 'circle', color: '#f1c40f', size: 'small', position: 'top-right' },
        { action: 'draw', shape: 'circle', color: '#2ecc71', size: 'small', position: 'right' },
        { action: 'draw', shape: 'circle', color: '#9b59b6', size: 'small', position: 'bottom-right' },
        { action: 'draw', shape: 'circle', color: '#e67e22', size: 'small', position: 'bottom' },
        { action: 'draw', shape: 'circle', color: '#e91e63', size: 'small', position: 'bottom-left' },
        { action: 'draw', shape: 'circle', color: '#00bcd4', size: 'small', position: 'left' },
        { action: 'draw', shape: 'circle', color: '#ff5722', size: 'small', position: 'top-left' },
        { action: 'draw', shape: 'rect', color: '#795548', size: 'large', position: 'bottom' },
      ]
    },
  };

  // Color modifiers
  static COLOR_MAP = {
    '红': 'red', '红色': 'red', '红的': 'red',
    '蓝': 'blue', '蓝色': 'blue', '蓝的': 'blue',
    '绿': 'green', '绿色': 'green', '绿的': 'green',
    '黄': 'yellow', '黄色': 'yellow', '黄的': 'yellow',
    '紫': 'purple', '紫色': 'purple', '紫的': 'purple',
    '橙': 'orange', '橙色': 'orange', '橙的': 'orange',
    '粉': 'pink', '粉色': 'pink', '粉的': 'pink',
    '黑': 'black', '黑色': 'black',
    '白': 'white', '白色': 'white',
    '金': 'yellow', '金色': 'yellow',
    '银': 'gray', '银色': 'gray',
  };

  parse(text) {
    if (!text || !text.trim()) return null;
    text = text.trim();

    // Check for modification commands
    const modResult = this._checkModification(text);
    if (modResult) return modResult;

    // Find matching scene
    const sceneResult = this._findScene(text);
    if (sceneResult) {
      // Apply color modifiers from text
      const colorMod = this._extractColor(text);
      if (colorMod) {
        sceneResult.commands = sceneResult.commands.map(cmd => ({
          ...cmd,
          color: this._pickColor(cmd.color, colorMod, text)
        }));
      }
      this.lastCommands = [...sceneResult.commands];
      return sceneResult;
    }

    // Try to generate from keywords
    const generated = this._generateFromKeywords(text);
    if (generated) {
      this.lastCommands = [...generated.commands];
      return generated;
    }

    return null;
  }

  _findScene(text) {
    // Sort by keyword length descending for better matching
    const entries = Object.entries(AgentEngine.SCENES)
      .filter(([k, v]) => !v.alias)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, scene] of entries) {
      if (text.includes(keyword)) {
        // Resolve alias
        const resolved = scene.alias ? AgentEngine.SCENES[scene.alias] : scene;
        if (resolved) {
          return {
            reply: resolved.reply,
            commands: JSON.parse(JSON.stringify(resolved.commands)),
            needConfirm: false,
          };
        }
      }
    }
    return null;
  }

  _extractColor(text) {
    const sorted = Object.entries(AgentEngine.COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [keyword, color] of sorted) {
      if (text.includes(keyword)) return color;
    }
    return null;
  }

  _pickColor(originalColor, newColor, text) {
    // If the user specifies a color, apply it to most shapes but keep some variety
    return newColor;
  }

  _checkModification(text) {
    if (this.lastCommands.length === 0) return null;

    // Size modifications
    if (text.includes('大一点') || text.includes('放大') || text.includes('变大')) {
      const sizeUp = { small: 'medium', medium: 'large', large: 'xlarge', xlarge: 'xlarge' };
      this.lastCommands = this.lastCommands.map(cmd => ({
        ...cmd, size: sizeUp[cmd.size] || cmd.size
      }));
      return { reply: '已放大', commands: this.lastCommands, needConfirm: false };
    }
    if (text.includes('小一点') || text.includes('缩小') || text.includes('变小')) {
      const sizeDown = { xlarge: 'large', large: 'medium', medium: 'small', small: 'small' };
      this.lastCommands = this.lastCommands.map(cmd => ({
        ...cmd, size: sizeDown[cmd.size] || cmd.size
      }));
      return { reply: '已缩小', commands: this.lastCommands, needConfirm: false };
    }

    // Color modifications
    const color = this._extractColor(text);
    if (color && (text.includes('换成') || text.includes('改成') || text.includes('变'))) {
      this.lastCommands = this.lastCommands.map(cmd => ({ ...cmd, color }));
      return { reply: `已换成${color}`, commands: this.lastCommands, needConfirm: false };
    }

    // Position modifications
    const positions = {
      '左边': 'left', '右边': 'right', '上面': 'top', '下面': 'bottom',
      '中间': 'center', '左上': 'top-left', '右上': 'top-right',
      '左下': 'bottom-left', '右下': 'bottom-right',
    };
    for (const [keyword, pos] of Object.entries(positions)) {
      if (text.includes(keyword) && (text.includes('移到') || text.includes('移'))) {
        this.lastCommands = this.lastCommands.map(cmd => ({ ...cmd, position: pos }));
        return { reply: `已移到${keyword}`, commands: this.lastCommands, needConfirm: false };
      }
    }

    return null;
  }

  _generateFromKeywords(text) {
    // Try to build a scene from individual keywords
    const shapes = [];
    const shapeMap = {
      '圆': 'circle', '方块': 'rect', '方形': 'rect', '矩形': 'rect',
      '三角': 'triangle', '星星': 'star', '五角星': 'star',
      '爱心': 'heart', '心': 'heart', '箭头': 'arrow',
      '菱形': 'diamond', '波浪': 'wavy', '螺旋': 'spiral',
    };

    for (const [keyword, shape] of Object.entries(shapeMap)) {
      if (text.includes(keyword)) shapes.push(shape);
    }

    if (shapes.length === 0) return null;

    const color = this._extractColor(text) || 'blue';
    const positions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right', 'top', 'bottom'];

    const commands = shapes.map((shape, i) => ({
      action: 'draw',
      shape,
      color,
      size: i === 0 ? 'large' : 'medium',
      position: positions[i % positions.length],
    }));

    return {
      reply: `为你画${shapes.length}个图形`,
      commands,
      needConfirm: false,
    };
  }
}

// ===== Command Parser =====
class CommandParser {
  parse(text) {
    if (!text || !text.trim()) return null;
    text = text.trim();

    // Normalize common speech recognition quirks
    text = text
      .replace(/[，。！？、]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check for chaining: "画A然后画B"
    const chainParts = text.split(/然后|接着|再(?=画)|并且/);
    if (chainParts.length > 1) {
      return chainParts.map(p => this._parseSingle(p.trim())).filter(Boolean);
    }

    const result = this._parseSingle(text);
    return result ? [result] : null;
  }

  _parseSingle(text) {
    if (!text) return null;

    // 1. Action commands
    if (this._match(text, ['清除', '清空', '重来', '全部清除', '清屏', '擦除', '擦掉'])) {
      return { action: 'clear' };
    }
    if (this._match(text, ['撤销', '返回', '返回上一步', '上一步', '回退', '后退'])) {
      return { action: 'undo' };
    }
    if (this._match(text, ['重做', '恢复', '前进', '回到下一步'])) {
      return { action: 'redo' };
    }

    // 2. Extract components
    const shape = this._extractShape(text);
    const color = this._extractColor(text);
    const size = this._extractSize(text);
    const position = this._extractPosition(text);

    // 3. Size adjustments
    const sizeAdj = this._extractSizeAdjust(text);
    if (sizeAdj) {
      return { action: 'size-adjust', direction: sizeAdj };
    }

    // 4. Standalone color change (e.g. just "红色" or "换成蓝色")
    const colorChangeMatch = text.match(/(?:换成|换|改成|切换|使用|用)(.*)/) || [null, text];
    if (!shape && color && this._isMinimalCommand(text, color)) {
      return { action: 'color-change', color };
    }

    // 5. Standalone shape change (e.g. "换成画方块")
    if (!color && shape && this._isMinimalCommand(text, shape)) {
      return { action: 'shape-change', shape };
    }

    // 6. Draw command - needs at least a shape
    if (shape) {
      const cmd = { action: 'draw', shape };
      if (color) cmd.color = color;
      if (size) cmd.size = size;
      if (position) cmd.position = position;

      // Extract text content for text shapes
      if (shape === 'text') {
        const textContent = this._extractTextContent(text);
        if (textContent) cmd.textContent = textContent;
        else cmd.textContent = '你好';
      }

      return cmd;
    }

    // 7. If we have color + position but no shape, draw default shape
    if (color || position) {
      const cmd = { action: 'draw', shape: CONFIG.defaultShape };
      if (color) cmd.color = color;
      if (size) cmd.size = size;
      if (position) cmd.position = position;
      return cmd;
    }

    return null;
  }

  _extractShape(text) {
    // Check for patterns like "画一个X", "画X", "个X"
    const drawPatterns = [
      /画(?:一|个|条|出|上)?(?:一?个?|条)?(?:的)?(.+)/,
      /绘制(?:一?个?)(.+)/,
      /(?:个|条)(.+)/,
    ];

    for (const pattern of drawPatterns) {
      const match = text.match(pattern);
      if (match) {
        const afterDraw = match[1];
        // Try to find shape in the part after "画"
        for (const [keyword, shape] of Object.entries(SHAPES)) {
          if (afterDraw.startsWith(keyword) || afterDraw.includes(keyword)) {
            return shape;
          }
        }
      }
    }

    // Direct keyword match anywhere in text
    // Sort by keyword length descending to match longer keywords first
    const sorted = Object.entries(SHAPES).sort((a, b) => b[0].length - a[0].length);
    for (const [keyword, shape] of sorted) {
      if (text.includes(keyword)) {
        return shape;
      }
    }

    return null;
  }

  _extractColor(text) {
    // Sort by keyword length descending
    const sorted = Object.entries(COLORS).sort((a, b) => b[0].length - a[0].length);
    for (const [keyword, color] of sorted) {
      if (text.includes(keyword)) {
        return color;
      }
    }
    return null;
  }

  _extractSize(text) {
    // Check explicit size keywords
    for (const [keyword, size] of Object.entries(SIZES)) {
      if (text.includes(keyword)) {
        return size;
      }
    }
    return null;
  }

  _extractPosition(text) {
    // Sort by keyword length descending
    const sorted = Object.entries(POSITIONS).sort((a, b) => b[0].length - a[0].length);
    for (const [keyword, pos] of sorted) {
      if (text.includes(keyword)) {
        return pos;
      }
    }
    return null;
  }

  _extractSizeAdjust(text) {
    if (this._match(text, ['大一点', '大一些', '放大', '变大', '更大', '再大', '增大', '大一点吧'])) {
      return 'up';
    }
    if (this._match(text, ['小一点', '小一些', '缩小', '变小', '更小', '再小', '小一点吧'])) {
      return 'down';
    }
    return null;
  }

  _extractTextContent(text) {
    // "写文字XXX" or "文字XXX" or "写XXX"
    const patterns = [
      /写(?:文字|文本|字)?(.+)/,
      /文字(.+)/,
      /文本(.+)/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1].trim()) {
        // Remove shape/color/size/position keywords from the text content
        let content = m[1].trim();
        for (const kw of Object.keys(SHAPES)) {
          content = content.replace(new RegExp(kw, 'g'), '');
        }
        for (const kw of Object.keys(COLORS)) {
          content = content.replace(new RegExp(kw, 'g'), '');
        }
        content = content.trim();
        if (content) return content;
      }
    }
    return null;
  }

  _match(text, keywords) {
    return keywords.some(kw => text === kw || text.includes(kw));
  }

  _isMinimalCommand(text, detectedKeyword) {
    // Check if the text is essentially just the keyword (possibly with small filler)
    const cleaned = text
      .replace(/换成|换|改成|切换|使用|用|画|一个|个|的|了|吧|请|帮我|给我/g, '')
      .trim();
    return cleaned.length <= detectedKeyword.length + 2;
  }
}

// ===== Drawing Engine =====
class DrawingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.undoStack = [];
    this.redoStack = [];
    this.currentColor = CONFIG.defaultColor;
    this.currentSize = CONFIG.defaultSize;
    this.currentShape = CONFIG.defaultShape;
    this._lastDrawnPos = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Save current content
    let imageData = null;
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      try { imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height); } catch(e) {}
    }

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);

    // Restore content
    if (imageData) {
      this.ctx.putImageData(imageData, 0, 0);
    } else {
      this._clearCanvas();
    }

    this.width = w;
    this.height = h;
  }

  _clearCanvas() {
    this.ctx.fillStyle = CONFIG.canvasBg;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  _saveState() {
    const dpr = window.devicePixelRatio || 1;
    const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(data);
    if (this.undoStack.length > CONFIG.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  _getPositionCoords(pos) {
    const margin = 0.15;
    const positions = {
      'top-left':     { x: this.width * margin,       y: this.height * margin },
      'top':          { x: this.width / 2,            y: this.height * margin },
      'top-right':    { x: this.width * (1 - margin), y: this.height * margin },
      'left':         { x: this.width * margin,       y: this.height / 2 },
      'center':       { x: this.width / 2,            y: this.height / 2 },
      'right':        { x: this.width * (1 - margin), y: this.height / 2 },
      'bottom-left':  { x: this.width * margin,       y: this.height * (1 - margin) },
      'bottom':       { x: this.width / 2,            y: this.height * (1 - margin) },
      'bottom-right': { x: this.width * (1 - margin), y: this.height * (1 - margin) },
    };
    return positions[pos] || positions['center'];
  }

  _getSizePixels(size) {
    return SIZE_VALUES[size] || SIZE_VALUES[CONFIG.defaultSize];
  }

  _getDrawPos(position, size) {
    if (position) {
      return this._getPositionCoords(position);
    }
    // Default: place near center with some randomness
    if (this._lastDrawnPos) {
      // Offset from last drawn position
      return {
        x: Math.min(this.width - 100, Math.max(100, this._lastDrawnPos.x + (Math.random() - 0.5) * 200)),
        y: Math.min(this.height - 100, Math.max(100, this._lastDrawnPos.y + (Math.random() - 0.5) * 200)),
      };
    }
    return { x: this.width / 2, y: this.height / 2 };
  }

  execute(command) {
    switch (command.action) {
      case 'draw': return this._draw(command);
      case 'clear': return this.clear();
      case 'undo': return this.undo();
      case 'redo': return this.redo();
      case 'color-change': return this.changeColor(command.color);
      case 'shape-change': return this.changeShape(command.shape);
      case 'size-adjust': return this.adjustSize(command.direction);
      default: return { success: false, message: '未知命令' };
    }
  }

  _draw(command) {
    const shape = command.shape || this.currentShape;
    const color = command.color || this.currentColor;
    const size = command.size ? this._getSizePixels(command.size) : this._getSizePixels(this.currentSize);
    const pos = this._getDrawPos(command.position, size);

    this._saveState();

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape) {
      case 'circle':
        this._drawCircle(pos.x, pos.y, size);
        break;
      case 'rect':
        this._drawRect(pos.x, pos.y, size);
        break;
      case 'triangle':
        this._drawTriangle(pos.x, pos.y, size);
        break;
      case 'line':
        this._drawLine(pos.x, pos.y, size, command.position);
        break;
      case 'star':
        this._drawStar(pos.x, pos.y, size);
        break;
      case 'arrow':
        this._drawArrow(pos.x, pos.y, size, command.position);
        break;
      case 'heart':
        this._drawHeart(pos.x, pos.y, size);
        break;
      case 'diamond':
        this._drawDiamond(pos.x, pos.y, size);
        break;
      case 'pentagon':
        this._drawPolygon(pos.x, pos.y, size, 5);
        break;
      case 'hexagon':
        this._drawPolygon(pos.x, pos.y, size, 6);
        break;
      case 'wavy':
        this._drawWavy(pos.x, pos.y, size, color);
        break;
      case 'dashed':
        this._drawDashed(pos.x, pos.y, size);
        break;
      case 'spiral':
        this._drawSpiral(pos.x, pos.y, size);
        break;
      case 'text':
        this._drawText(pos.x, pos.y, command.textContent || '你好', size);
        break;
      default:
        this._drawCircle(pos.x, pos.y, size);
    }

    ctx.restore();
    this._lastDrawnPos = pos;

    // Update state
    if (command.color) this.currentColor = command.color;
    if (command.size) this.currentSize = command.size;
    this.currentShape = shape;

    const shapeName = Object.entries(SHAPES).find(([_, v]) => v === shape);
    const colorName = COLOR_NAMES[color] || color;
    return {
      success: true,
      message: `已绘制${colorName}${shapeName ? shapeName[0] : shape}`,
      shape, color, size, pos
    };
  }

  _drawCircle(x, y, r) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawRect(x, y, size) {
    const w = size * 1.4;
    const h = size * 1.0;
    this.ctx.fillRect(x - w / 2, y - h / 2, w, h);
  }

  _drawTriangle(x, y, size) {
    const h = size * 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - h / 2);
    this.ctx.lineTo(x - size / 2, y + h / 2);
    this.ctx.lineTo(x + size / 2, y + h / 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawLine(x, y, size, position) {
    const len = size * 2;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    // Determine direction from position keyword
    if (position && (position.includes('left') || position.includes('right'))) {
      // Horizontal
      this.ctx.moveTo(x - len / 2, y);
      this.ctx.lineTo(x + len / 2, y);
    } else if (position && (position.includes('top') || position.includes('bottom'))) {
      // Vertical
      this.ctx.moveTo(x, y - len / 2);
      this.ctx.lineTo(x, y + len / 2);
    } else {
      // Default: horizontal
      this.ctx.moveTo(x - len / 2, y);
      this.ctx.lineTo(x + len / 2, y);
    }
    this.ctx.stroke();
  }

  _drawStar(x, y, r) {
    const spikes = 5;
    const outerR = r;
    const innerR = r * 0.45;
    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI / spikes) - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawArrow(x, y, size, position) {
    const len = size * 2;
    let angle = 0; // default right
    if (position) {
      if (position.includes('left')) angle = Math.PI;
      else if (position.includes('top')) angle = -Math.PI / 2;
      else if (position.includes('bottom')) angle = Math.PI / 2;
    }

    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;

    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Arrow head
    const headLen = size * 0.4;
    const headAngle = Math.PI / 6;
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - headLen * Math.cos(angle - headAngle),
      y2 - headLen * Math.sin(angle - headAngle)
    );
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - headLen * Math.cos(angle + headAngle),
      y2 - headLen * Math.sin(angle + headAngle)
    );
    this.ctx.stroke();
  }

  _drawHeart(x, y, size) {
    const s = size / 30;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 10 * s);
    this.ctx.bezierCurveTo(x, y, x - 20 * s, y - 10 * s, x - 25 * s, y + 5 * s);
    this.ctx.bezierCurveTo(x - 30 * s, y + 25 * s, x, y + 35 * s, x, y + 40 * s);
    this.ctx.bezierCurveTo(x, y + 35 * s, x + 30 * s, y + 25 * s, x + 25 * s, y + 5 * s);
    this.ctx.bezierCurveTo(x + 20 * s, y - 10 * s, x, y, x, y + 10 * s);
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawDiamond(x, y, size) {
    const w = size * 0.7;
    const h = size * 1.0;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - h / 2);
    this.ctx.lineTo(x + w / 2, y);
    this.ctx.lineTo(x, y + h / 2);
    this.ctx.lineTo(x - w / 2, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawPolygon(x, y, r, sides) {
    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i / sides) - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawWavy(x, y, size) {
    const len = size * 3;
    const amp = size * 0.3;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    for (let i = 0; i <= len; i += 2) {
      const px = x - len / 2 + i;
      const py = y + Math.sin(i * 0.08) * amp;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.stroke();
  }

  _drawDashed(x, y, size) {
    const len = size * 2.5;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([12, 8]);
    this.ctx.beginPath();
    this.ctx.moveTo(x - len / 2, y);
    this.ctx.lineTo(x + len / 2, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  _drawSpiral(x, y, size) {
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    const turns = 4;
    const maxR = size;
    for (let i = 0; i <= 360 * turns; i += 3) {
      const angle = (i * Math.PI) / 180;
      const r = (i / (360 * turns)) * maxR;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.stroke();
  }

  _drawText(x, y, text, size) {
    const fontSize = Math.max(16, size * 0.6);
    this.ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  changeColor(color) {
    if (!color) return { success: false, message: '未识别到颜色' };
    this.currentColor = color;
    const name = COLOR_NAMES[color] || color;
    return { success: true, message: `颜色已切换为${name}` };
  }

  changeShape(shape) {
    if (!shape) return { success: false, message: '未识别到图形' };
    this.currentShape = shape;
    const entry = Object.entries(SHAPES).find(([_, v]) => v === shape);
    return { success: true, message: `工具已切换为${entry ? entry[0] : shape}` };
  }

  adjustSize(direction) {
    const order = ['small', 'medium', 'large', 'xlarge'];
    const idx = order.indexOf(this.currentSize);
    if (direction === 'up' && idx < order.length - 1) {
      this.currentSize = order[idx + 1];
    } else if (direction === 'down' && idx > 0) {
      this.currentSize = order[idx - 1];
    } else {
      return { success: true, message: direction === 'up' ? '已经是最大了' : '已经是最小了' };
    }
    return { success: true, message: `大小已调整为${SIZE_NAMES[this.currentSize]}` };
  }

  clear() {
    this._saveState();
    this._clearCanvas();
    this._lastDrawnPos = null;
    return { success: true, message: '画布已清空' };
  }

  undo() {
    if (this.undoStack.length === 0) {
      return { success: false, message: '没有可撤销的操作' };
    }
    // Save current state to redo stack
    const dpr = window.devicePixelRatio || 1;
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.redoStack.push(current);

    const prev = this.undoStack.pop();
    this.ctx.putImageData(prev, 0, 0);
    return { success: true, message: '已撤销' };
  }

  redo() {
    if (this.redoStack.length === 0) {
      return { success: false, message: '没有可重做的操作' };
    }
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(current);

    const next = this.redoStack.pop();
    this.ctx.putImageData(next, 0, 0);
    return { success: true, message: '已重做' };
  }
}

// ===== UI Manager =====
class UIManager {
  constructor() {
    this.elements = {};
  }

  init() {
    this.elements = {
      app: document.getElementById('app'),
      startOverlay: document.getElementById('start-overlay'),
      startBtn: document.getElementById('start-btn'),
      canvas: document.getElementById('drawing-canvas'),
      voiceBar: document.getElementById('voice-bar'),
      voiceStatus: document.getElementById('voice-status-text'),
      transcript: document.getElementById('transcript'),
      currentColorDot: document.getElementById('current-color-dot'),
      currentColorName: document.getElementById('current-color-name'),
      currentSizeName: document.getElementById('current-size-name'),
      currentShapeName: document.getElementById('current-shape-name'),
      historyList: document.getElementById('history-list'),
      historyPanel: document.getElementById('history-panel'),
      helpPanel: document.getElementById('help-panel'),
      helpToggle: document.getElementById('help-toggle'),
      closeHelp: document.getElementById('close-help'),
      clearHistory: document.getElementById('clear-history'),
      micToggle: document.getElementById('mic-toggle'),
      toastContainer: document.getElementById('toast-container'),
      welcomeHint: document.getElementById('welcome-hint'),
      permOverlay: document.getElementById('permission-overlay'),
      permMessage: document.getElementById('perm-message'),
      permRetryBtn: document.getElementById('perm-retry-btn'),
      permCancelBtn: document.getElementById('perm-cancel-btn'),
    };
  }

  showPermissionOverlay(msg) {
    if (msg) this.elements.permMessage.textContent = msg;
    this.elements.permOverlay.classList.remove('hidden');
  }

  hidePermissionOverlay() {
    this.elements.permOverlay.classList.add('hidden');
  }

  showApp() {
    this.elements.startOverlay.classList.add('hidden');
    this.elements.app.classList.remove('hidden');
  }

  setListening(isListening) {
    const bar = this.elements.voiceBar;
    bar.classList.toggle('listening', isListening);
    bar.classList.toggle('muted', false);
    this.elements.voiceStatus.textContent = isListening ? '正在聆听...' : '已暂停';
  }

  setMuted(isMuted) {
    const bar = this.elements.voiceBar;
    bar.classList.toggle('muted', isMuted);
    bar.classList.toggle('listening', false);
    this.elements.voiceStatus.textContent = isMuted ? '麦克风已关闭' : '正在聆听...';
    this.elements.micToggle.classList.toggle('muted', isMuted);
  }

  updateTranscript(text, isFinal) {
    const el = this.elements.transcript;
    el.textContent = text;
    el.style.color = isFinal ? '#f0f0f0' : '#8888aa';
  }

  updateSettings(engine) {
    const { currentColorDot, currentColorName, currentSizeName, currentShapeName } = this.elements;
    currentColorDot.style.backgroundColor = engine.currentColor;
    const cName = COLOR_NAMES[engine.currentColor] || engine.currentColor;
    currentColorName.textContent = cName;
    currentSizeName.textContent = SIZE_NAMES[engine.currentSize] || engine.currentSize;
    const shapeEntry = Object.entries(SHAPES).find(([_, v]) => v === engine.currentShape);
    currentShapeName.textContent = shapeEntry ? shapeEntry[0] : engine.currentShape;
  }

  addHistoryItem(text, result) {
    const list = this.elements.historyList;
    const item = document.createElement('div');
    item.className = `history-item ${result.success ? 'success' : 'error'}`;
    item.innerHTML = `
      <div class="cmd-text">${this._escapeHtml(text)}</div>
      <div class="cmd-result">${this._escapeHtml(result.message)}</div>
    `;
    list.insertBefore(item, list.firstChild);

    // Trim old entries
    while (list.children.length > CONFIG.maxHistoryItems) {
      list.removeChild(list.lastChild);
    }
  }

  clearHistory() {
    this.elements.historyList.innerHTML = '';
  }

  showToast(message, type = 'info') {
    const container = this.elements.toastContainer;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showCommand(message) {
    this.showToast(message, 'command');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ===== Main Application =====
class App {
  constructor() {
    this.speech = new SpeechManager();
    this.parser = new CommandParser();
    this.agent = new AgentEngine();
    this.engine = null;
    this.ui = new UIManager();
    this.ttsEnabled = true;
    this._ttsQueue = [];
    this._isSpeaking = false;

    // Wake word state
    this.isAwake = false;
    this.wakeWord = '小溪小溪';
    this.wakeTimeout = null;
    this.wakeDuration = 8000; // 8 seconds idle → back to sleep
  }

  init() {
    this.ui.init();

    // Setup start button
    this.ui.elements.startBtn.addEventListener('click', () => this.start());

    // Setup help panel
    this.ui.elements.helpToggle.addEventListener('click', () => {
      this.ui.elements.helpPanel.classList.toggle('hidden');
    });
    this.ui.elements.closeHelp.addEventListener('click', () => {
      this.ui.elements.helpPanel.classList.add('hidden');
    });

    // Setup history clear
    this.ui.elements.clearHistory.addEventListener('click', () => {
      this.ui.clearHistory();
    });

    // Setup permission dialog buttons
    this.ui.elements.permRetryBtn.addEventListener('click', () => {
      this.ui.hidePermissionOverlay();
      this.start();
    });
    this.ui.elements.permCancelBtn.addEventListener('click', () => {
      this.ui.hidePermissionOverlay();
    });

    // Setup mic toggle
    this.ui.elements.micToggle.addEventListener('click', () => {
      const muted = this.speech.toggleMute();
      this.ui.setMuted(muted);
    });
  }

  async start() {
    // First, explicitly request microphone permission via getUserMedia
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted - stop the stream, we only needed the permission prompt
      stream.getTracks().forEach(t => t.stop());
    } catch (permErr) {
      this.ui.showPermissionOverlay('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。');
      return;
    }

    // Initialize speech recognition
    try {
      this.speech.init();
    } catch (e) {
      this.ui.showError(e.message);
      return;
    }

    // Show the app
    this.ui.showApp();

    // Initialize drawing engine
    this.engine = new DrawingEngine(this.ui.elements.canvas);

    // Update UI with defaults
    this.ui.updateSettings(this.engine);

    // Setup speech callbacks
    this.speech.onResult = (data) => this._handleSpeechResult(data);
    this.speech.onStart = () => this.ui.setListening(true);
    this.speech.onEnd = () => this.ui.setListening(false);
    this.speech.onError = (err) => {
      if (err === 'not-allowed') {
        this.ui.showPermissionOverlay('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。');
      }
    };

    // Start listening
    this.speech.start();

    // Start in sleeping state, waiting for wake word
    this._setAwakeState(false);

    // Speak welcome message
    setTimeout(() => {
      this.speak('欢迎使用语音绘图工具，说小溪小溪唤醒我');
    }, 500);
  }

  _handleSpeechResult(data) {
    // Show interim results
    if (data.interim) {
      this.ui.updateTranscript(data.interim, false);
    }

    // Process final results
    if (data.isFinal && data.final) {
      const text = data.final.trim();
      this.ui.updateTranscript(text, true);

      // --- Wake word logic ---
      if (!this.isAwake) {
        // Sleeping: listen for wake word
        if (text.includes('小溪')) {
          // Check if it's an agent command: "小溪画XXX"
          const agentMatch = text.match(/小溪画(.+)/);
          if (agentMatch) {
            this._setAwakeState(true);
            this._handleAgentCommand(agentMatch[1].trim());
          } else {
            this._setAwakeState(true);
            this.speak('我在');
          }
        }
        // Clear transcript after a delay
        setTimeout(() => {
          this.ui.updateTranscript('', false);
        }, 1500);
        return;
      }

      // --- Check for agent command while awake: "小溪画XXX" ---
      const agentMatch = text.match(/小溪画(.+)/);
      if (agentMatch) {
        this._handleAgentCommand(agentMatch[1].trim());
        this._resetWakeTimer();
        setTimeout(() => this.ui.updateTranscript('', false), 2000);
        return;
      }

      // --- Also try agent for modification keywords (大一点, 换成红色, etc.) ---
      const modKeywords = ['大一点', '小一点', '放大', '缩小', '换成', '移到', '变大', '变小'];
      const isMod = modKeywords.some(kw => text.includes(kw));
      if (isMod && this.agent.lastCommands.length > 0) {
        this._handleAgentCommand(text);
        this._resetWakeTimer();
        setTimeout(() => this.ui.updateTranscript('', false), 2000);
        return;
      }

      // --- Normal command parsing ---
      const commands = this.parser.parse(text);
      if (commands && commands.length > 0) {
        this._executeCommands(commands, text);
      } else {
        this.ui.addHistoryItem(text, { success: false, message: '未识别到有效指令' });
        this.ui.showToast('未理解指令，请重试', 'error');
      }

      // Reset wake timer after each command attempt
      this._resetWakeTimer();

      // Clear transcript after a delay
      setTimeout(() => {
        this.ui.updateTranscript('', false);
      }, 2000);
    }
  }

  _handleAgentCommand(text, mode) {
    this.ui.showToast('🤖 Agent 思考中...', 'info');
    this.ui.addHistoryItem(`[Agent] ${text}`, { success: true, message: '正在分析...' });

    const result = this.agent.parse(text);

    if (result) {
      // Show agent reply
      if (result.reply) {
        this.ui.addHistoryItem(`[Agent回复]`, { success: true, message: result.reply });
        this.speak(result.reply);
      }

      // Execute commands if any
      if (result.commands && result.commands.length > 0) {
        this.ui.showToast(`🎨 Agent 生成了 ${result.commands.length} 个绘图指令`, 'success');
        this._executeAgentCommands(result.commands);
      }
    } else {
      // Agent couldn't understand
      this.ui.addHistoryItem(`[Agent]`, { success: false, message: '没有理解你的描述，请换个说法试试' });
      this.speak('没有理解，请换个说法');
    }
  }

  _executeAgentCommands(commands) {
    let delay = 0;
    commands.forEach((cmd, i) => {
      setTimeout(() => {
        const result = this.engine.execute(cmd);
        this.ui.addHistoryItem(`[Agent ${i + 1}/${commands.length}]`, result);
        this.ui.updateSettings(this.engine);

        if (i === commands.length - 1) {
          this.ui.showSuccess('🎉 绘图完成');
          this.speak('绘图完成');
        }
      }, delay);
      delay += 500;
    });
  }

  _setAwakeState(awake) {
    this.isAwake = awake;
    const bar = this.ui.elements.voiceBar;
    bar.classList.toggle('sleeping', !awake);
    bar.classList.toggle('awake', awake);

    if (awake) {
      this.ui.elements.voiceStatus.textContent = '🎤 请说出指令...';
      this._resetWakeTimer();
    } else {
      this.ui.elements.voiceStatus.textContent = '💤 说"小溪小溪"唤醒我';
      this._clearWakeTimer();
    }
  }

  _resetWakeTimer() {
    this._clearWakeTimer();
    this.wakeTimeout = setTimeout(() => {
      this._setAwakeState(false);
      this.speak('已待机');
    }, this.wakeDuration);
  }

  _clearWakeTimer() {
    if (this.wakeTimeout) {
      clearTimeout(this.wakeTimeout);
      this.wakeTimeout = null;
    }
  }

  _executeCommands(commands, originalText) {
    if (commands.length === 1) {
      const result = this.engine.execute(commands[0]);
      this.ui.addHistoryItem(originalText, result);
      this.ui.updateSettings(this.engine);

      if (result.success) {
        this.ui.showSuccess(result.message);
        this.speak(result.message);
      } else {
        this.ui.showError(result.message);
        this.speak(result.message);
      }
    } else {
      // Multiple commands - execute sequentially with animation delay
      const messages = [];
      let delay = 0;
      commands.forEach((cmd, i) => {
        setTimeout(() => {
          const result = this.engine.execute(cmd);
          this.ui.addHistoryItem(`[步骤${i + 1}] ${originalText}`, result);
          this.ui.updateSettings(this.engine);
          messages.push(result.message);

          if (i === commands.length - 1) {
            this.ui.showSuccess(messages.join('，'));
            this.speak(messages.join('，'));
          }
        }, delay);
        delay += 400;
      });
    }
  }

  speak(text) {
    if (!this.ttsEnabled || !window.speechSynthesis) return;

    this._ttsQueue.push(text);
    if (!this._isSpeaking) {
      this._speakNext();
    }
  }

  _speakNext() {
    if (this._ttsQueue.length === 0) {
      this._isSpeaking = false;
      return;
    }

    this._isSpeaking = true;
    const text = this._ttsQueue.shift();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = CONFIG.ttsRate;
    utterance.volume = CONFIG.ttsVolume;

    // Try to use a Chinese voice
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onend = () => this._speakNext();
    utterance.onerror = () => this._speakNext();

    speechSynthesis.speak(utterance);
  }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
