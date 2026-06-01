# 🤖 SovereignNote 安卓老旧设备（Android 5.0 - 9.0）终极打包与同步完美指南

本指南针对在老旧安卓设备的系统内核（WebView）中所出现的**排版崩塌、功能失效、触控延迟（300ms）**等典型硬件碎片化问题，提供**方案 B（Cordova + Crosswalk 独家打包方案）**与**路线 A（Localhost 后台本地中转同步）**的完整落地指南。

---

## 一、 为什么默认打包的 APK 只有 1.66MB？

**原因分析：**
1. **系统 WebView 依赖模式**：1.66MB 的打包版本只是一个极简的壳容器，其底层**直接调用当前手机系统的原生 Android System WebView 组件**。
2. **老旧系统内核落后**：Android 5.0 的出厂系统 WebView 对应的 Chromium 版本只有 v37-v39。由于缺乏对现代 ES6/ES7、CSS Flexbox/Grid 间距属性（如 `gap`）、CSS `inset` 属性以及 Promise 等特性的原生支持，直接加载时会导致：
   - 界面布局拉伸、排版重叠（由于 `gap`, `inset` 不等效）。
   - JavaScript 语法解析报错（直接导致白屏或功能中断）。
   - 页面点击有 300 毫秒的时延阻尼。
3. **安全沙盒限制**：在这些老旧 WebView 里，浏览器内置的本地安全沙盒（File API / Download API）常常受到系统固件层面的阉割，无法流畅实现数据库本地快照导出。

因此，**完美解决的方法就是采用自带现代运行核的 Crosswalk 框架，将现代浏览器内核强行装进 APK 中**。

---

## 二、 方案 B：Cordova 项目集成 Crosswalk 插件 (解决渲染问题)

**Crosswalk** 是一个开源的 Web 运行时，它允许你**将一个专属、定制的 Chromium 引擎（通常为 Chrome 53+，比安卓 5.0 自带的 v37 强大无数倍）直接打包封装进你的 APK 中**。

### 1. 方案特点
- **包体膨胀，但运行完美**：打包后 APK 体积会由 **1.66MB 增加至约 23MB-28MB**，这是完全正常的，因为高版本 Chromium 占用了体积。
- **卓越渲染性能**：独立于设备的底层系统版本，即使在十年前的 Android 5.0 老旧平板上，也能够完美运行，提供 60FPS 的跟手滑动速度，且彻底消灭老旧内核对 `gap` 与 `inset` CSS 渲染的各种 Bug。
- **解决白屏与兼容问题**：提供了完整的现代 JS API 支持。

### 2. Cordova + Crosswalk 构建步骤

我们在项目根目录创设了预置的 `/cordova` 容器配置文件：
- `/cordova/config.xml` (配置了 `cordova-plugin-crosswalk-webview` 与配置项)
- `/cordova/package.json` (配置了对应依赖平台)
- `/cordova/build-cordova.sh` (自动化编译和拷贝流脚本)

#### 💻 本地打包操作指引：
1. **配置好本地开发环境**：
   确保你的电脑中已配置好最新版的 **Node.js**、**JDK 8**（Crosswalk 兼容性黄金版本）以及 **Android SDK**。
2. **全局安装 Cordova 命令行工具**：
   ```bash
   npm install -g cordova
   ```
3. **在电脑端进入项目 root 并运行编译集成脚本**：
   ```bash
   chmod +x cordova/build-cordova.sh
   # 运行脚本自动编译 React 并注入 Cordova index 桥接
   ./cordova/build-cordova.sh
   ```
4. **进入 cordova 目录并运行平台初始化**：
   ```bash
   cd cordova
   # 添加 Cordova 安卓底层
   cordova platform add android@8.1.0
   ```
5. **执行最終的 Crosswalk 混合封包编译**：
   ```bash
   cordova build android --release
   ```
   *编译成功后，将在 `cordova/platforms/android/app/build/outputs/apk/` 目录下生成打包好的自带高性能内核的定制 APK 成果，安装到安卓 5.0 设备中立马享受丝滑完美的笔记体验！*

---

## 三、 路线 A：Localhost 本地中转运行 (完美解脱沙盒束缚)

在原生老旧 APK 中，受制于底层沙盒安全防御，有些时候不能自由读取本地文件。
**路线 A 的精妙之处在于**：使前端将数据发往运行在 `localhost` 的后台进行中转。

我们已针对此路线完成了代码支持和适配：
1. **自动识别打包环境**：当软件在 Cordova 的 `file:///android_asset/` 环境下加载时，自动将同步主机的默认 IP 重定向并连接至 `http://localhost:3000` (或 `http://127.0.0.1:3000`)。
2. **电脑端/手机本地守护进程中转**：
   我们在后台直接运行主权 Express 服务。它提供高精度的去中心化时间戳同步（LWW算法）。
   - **如果您是在 Windows/Mac/Linux 电脑上运行平台**：可以直接在电脑终端运行 `node dist/server.cjs`（或 `npm run dev`）。同时，若手机与电脑在同一局域网下，安卓平板将局域网物理 IP（例如 `http://192.168.1.100:3000`）复制填入中转设置，即可畅行无碍。
   - **如果您只想在手机单机上运行**：可通过手机上的 **Termux**、**QPython** 或定制的本地后台中转插件在手机端极速拉起一个微型的 `localhost:3000` 中转容器，前端读取本地接口完美保底。

### 3. 如何使用
1. 在主界面打开【同步管理】(Sync Management)。
2. 选择 **【局域对等同步】(Intranet/LAN)** 页面。
3. 观察同步服务器地址：
   - 处于打包版时，输入框已智能预设为 `http://localhost:3000`。
   - 点击 【开始拉取对齐】，即可与在本地电脑或 Termux 容器上部署的文件持久服务进行双向多版本增量 LWW 对齐。
   - 绝不丢失一份随手灵感，并从零开始将数据安全置于个人主权掌控之中！
