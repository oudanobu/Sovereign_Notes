# SovereignNote (主权笔记) - 版本发布与更新日志 (Changelog)

本项目旨在提供一个拥有 **100% 本地数据主权** 的纯离线极简双语笔记软件，独创 **6级子孙级联标签树** 以及 **SVG交互式思维导图** 画板。

为了照顾和拯救老旧闲置设备（如 **Android 5.0 的低版本平板、手机、Win32 触控平板**），本项目实施了深度的物理触控优化、核心转译降级、以及单 HTML 文件的绿色无损发布。

---

## 📌 当前正式版本：`v1.2.0` (三端本地化 - 触控优化版)

### 🌟 核心适配与优化摘要
本版本对整体打包和手持设备的软硬件特征进行了深度重构，旨在提供零时延、极速响应、不卡顿、不白屏的卓越体验。

#### 1. 严格践行“胖手指法则” (Fat Finger Principle)
- **黄金触控热区**：系统对所有的功能按键、编辑器模式切换标签、笔记本选项、快照及同步中心按键均赋予了物理上不小于 **44px × 44px** 的点击尺寸。
- **防止误点与选中**：增加了 `user-select: none;` 和 `touch-action: manipulation;`。手指长按操作选项时，绝对不会触发系统蓝色文字选择光标，消除了误触带来的困扰。

#### 2. 彻底歼灭 300ms 点击判定延迟
- 在老旧的 Android 5.0 系统（Chromium 内核 37-39 左右）以及低版本 Webview 微内核上，系统默认存在 300ms 的点击判断延迟。
- 引入了 `touch-action: manipulation` 和纯物理级轻量化触控代理（`touchUtils.ts`），直接消除延迟，手指落下即触发响应。
- 为多级折叠树组件（文件夹和多级标签的展开/收缩 ICON）扩充了高密度的 `padding` 点击范围（`.tag-toggle-icon` 增加 12px 物理扩容），触碰更加灵敏。

#### 3. 完美兼容低版本 WebView，杜绝白屏
- **语法降级转译**：使用 `@vitejs/plugin-legacy` 和 Vite 转译参数，放弃了所有 ESNext ES 模块专属的现代语法标签，打包出对老旧硬件高兼容度的 `es2015` 标准包。
- **纯粹单网页发布**：借助 `vite-plugin-singlefile` 会将整个笔记的所有 React 代码、UI 组件逻辑、Tailwind 全屏样式、SVG 指引库等 **完全内联强塞进单个 index.html 中** 运行。
- **零安全沙盒封锁**：不需要本地启动 Node 或 Python 静态服务器，下载单个独立 `html` 之后，在任何无网环境下直接双击用浏览器拉开即可运行，完美调取当地专属的本地数据库。

---

## 🛠️ GitHub Actions 全自动多端流水线 (`release.yml`)

我们已完美配置了自动化构建通道。当您在本地完成特色修改后，向 GitHub 推送版本标签，Actions 将自动进行传统编译器兼容重载，为您构建并上传三端核心产物：

1. **`SovereignNote-PWA-SingleFile.html`**
   - 包含降级与触控优化的纯独立单网页包。可以直接通过 WebDAV、坚果云、或局域网共享至老设备上直接双击离线工作。
2. **`SovereignNote-Windows-Win32-Green.zip`**
   - Windows 平板与桌面操作系统绿色免安装包。解压双击即可利用底层 Chromium WebView 全屏纵情发挥灵感。
3. **`SovereignNote-Android5.0-Tablet.apk`**
   - 专为 Android 5.0+ 旧系统精细转译打包的安卓平板端离线本地 APP。

### 🚀 开发与提交流程示范
仅仅需要在本地仓库执行以下三行指令，便可以完全解放双手，让 CI 管线自行合并编译成果：

```bash
git add .
git commit -m "feat: 完备支持老旧机型触控点击微操与三端整合发布简介"
git tag v1.2.0
git push origin main --tags
```
