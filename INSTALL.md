# 安装与使用指南

## 📋 环境要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | v14 或更高 | JavaScript 运行环境 |
| Chrome / Edge | 最新版 | 语音识别需要 |
| 麦克风 | 任意 | 语音输入设备 |
| 网络 | 需要联网 | AI 图像生成需要 |

---

## 🚀 快速开始

### 方式一：从 GitHub 克隆（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/gxh30101-star/AI-vioce-drawing-tool.git

# 2. 进入项目目录
cd AI-vioce-drawing-tool

# 3. 安装依赖
npm install

# 4. 启动服务器
node server.js

# 5. 打开浏览器访问
# http://localhost:3001
```

### 方式二：下载 ZIP 包

1. 访问 GitHub 仓库页面
2. 点击绿色 "Code" 按钮
3. 选择 "Download ZIP"
4. 解压到任意目录
5. 按照上述步骤 3-5 操作

---

## 📁 项目文件说明

```
AI-vioce-drawing-tool/
├── public/              # 前端文件（浏览器访问）
│   ├── index.html       # 主页面
│   ├── style.css        # 样式表
│   └── app.js           # 应用逻辑
├── server.js            # Node.js 服务器
├── package.json         # 项目配置
├── README.md            # 项目说明
├── INSTALL.md           # 安装指南（本文件）
├── DEMO_SCRIPT.md       # Demo 视频剧本
└── PR_DESCRIPTIONS.md   # PR 描述文档
```

---

## 🔧 详细安装步骤

### 第一步：安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 LTS 版本（推荐）
3. 运行安装程序，一路点击 "Next"
4. 安装完成后，打开终端/命令提示符，验证安装：
   ```bash
   node --version
   # 应该显示类似 v18.x.x 或 v20.x.x
   ```

### 第二步：下载项目

**方式 A：使用 Git（推荐）**
```bash
# 如果没有安装 Git，先下载：https://git-scm.com/
git clone https://github.com/gxh30101-star/AI-vioce-drawing-tool.git
cd AI-vioce-drawing-tool
```

**方式 B：下载 ZIP**
1. 在 GitHub 页面点击 "Code" → "Download ZIP"
2. 解压到任意文件夹
3. 打开终端，进入该文件夹

### 第三步：安装依赖

```bash
npm install
```

等待安装完成（可能需要 1-2 分钟）。

### 第四步：启动服务器

```bash
node server.js
```

看到以下提示表示启动成功：
```
Voice Drawing Tool running at http://localhost:3001
```

### 第五步：打开浏览器

1. 打开 Chrome 或 Edge 浏览器
2. 访问 http://localhost:3001
3. 点击"开始语音绘图"按钮
4. 允许麦克风权限

---

## 🎤 使用方法

### 基础操作

1. **唤醒**：说 "你好"
2. **绘图**：说 "画一只猫" 或 "一幅日落海滩"
3. **待机**：说 "待机" 或等待 15 秒自动待机

### 常用指令

| 指令 | 功能 |
|------|------|
| "你好" | 唤醒工具 |
| "画一只猫" | AI 生成图片 |
| "油画风格" | 风格转换 |
| "撤销" | 撤销上一步 |
| "清除" | 清空画布 |
| "保存" | 保存图片 |
| "帮助" | 显示帮助 |

---

## ❓ 常见问题

### Q1: 语音识别不工作？
- 确保使用 Chrome 或 Edge 浏览器
- 确保已授权麦克风权限
- 确保麦克风正常工作

### Q2: 图片生成失败？
- 检查网络连接
- agnes.ai 服务可能暂时不可用，稍后重试

### Q3: 端口 3001 被占用？
```bash
# 使用其他端口启动
PORT=3002 node server.js
```
然后访问 http://localhost:3002

### Q4: npm install 失败？
```bash
# 清除缓存重试
npm cache clean --force
npm install
```

### Q5: 如何停止服务器？
- 在终端按 `Ctrl + C`

---

## 🔗 相关链接

- **GitHub 仓库**：https://github.com/gxh30101-star/AI-vioce-drawing-tool
- **Node.js 下载**：https://nodejs.org/
- **Chrome 下载**：https://www.google.com/chrome/
- **Edge 下载**：https://www.microsoft.com/edge

---

## 📞 技术支持

如有问题，请在 GitHub 上提交 Issue：
https://github.com/gxh30101-star/AI-vioce-drawing-tool/issues

---

*最后更新：2026-06-14*
