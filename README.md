# 📂 SovereignNote | 主权笔记

[![Offline First](https://img.shields.io/badge/Architecture-Offline--First-success?style=for-the-badge&logo=offline&logoColor=white)](https://ai.studio/apps/2ae5b816-012f-4621-9dc5-0c96f0ad1216)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Vite / CJS Express](https://img.shields.io/badge/Backend-Express%20Vite-61dafb?style=for-the-badge&logo=express)](https://expressjs.com)
[![Platform Capabilities](https://img.shields.io/badge/Gemini-AI%20Assisted-orange?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)

> **SovereignNote (主权笔记)** is a privacy-first, local-first markdown and rich-text note-taking application designed for absolute data sovereignty. Built with a strict zero-cloud mandate, it operates entirely offline, storing data securely in your local IndexedDB database, offering real autonomy and protection.

---

## 🌎 Live Preview

You can view, test, and use the fully interactive applet inside **Google AI Studio Build**:
👉 [**Open SovereignNote in AI Studio**](https://ai.studio/apps/2ae5b816-012f-4621-9dc5-0c96f0ad1216)

---

## ✨ Features | 核心亮点

### 📑 Complete Creative Freedom
- **Dual Editors**: Seamlessly toggle between direct **Markdown Preview** and **Rich Text WYSIWYG Editor**.
- **Interactive Canvases**: Dynamic **Mindmap** and **Whiteboard Boards** for visual brainstorming, diagram drawing, and spatial grouping.
- **Sovereign Calendar (主权智能日历)**: Merges standard Solar calendars with ancient Chinese Lunar calendar conversions (`solarlunar` integration), allowing you to attach notes directly with dates.

### 🗂️ Absolute Structure & Tag Hierarchy
- **Nested Core Folders**: Keep projects cleanly separated with unlimited folders.
- **6-Level Structured Tag Outline**: Create rich taxonomy with deep nested sub-tags to map complex learning webs.

### 🔌 Multi-Device CSS Visual Optimizer Profiles
Switch layout rules on the fly inside the **Device UI Optimizer** to enjoy perfectly formatted styles suited for any hardware:
1. **💻 Windows Desktop (Precision Mouse Mode)**: Tiny custom native scrollbars, compact padding, and elegant hover animations designed for mouse-controlled high screen densities.
2. **📟 Tablet Windows (Touch Anti-Collision)**: Massive 48px targets, touch-friendly offsets, and a stacked top toolbar list that prevents button overlapping at narrower viewport splits.
3. **📱 Android 13+ (Modern Smooth Gesture)**: Generous corner roundings, smooth physical kinetic inertia scrolling, and device native viewport gesture bar safe-area inserts.
4. **📻 Android 5.0 (Retro Safe Performance)**: Completely disables box-shadows, animations, and heavy backdrops to protect older CPU/GPU cores. Automatically compensates older flex gaps using fallback margin offsets to stop visual drift in classical WebViews.

---

## 🛠️ Run Locally | 本地开发指南

Follow these steps to establish a running instance of **SovereignNote** on your own computer.

### Prerequisites (开发前置条件)

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

---

### Step-by-Step Installation

#### 1. Clone & Setup Workspace
Unzip the exported project code and enter the project folder.

#### 2. Install Project Dependencies
Run the installation command in your terminal:
```bash
npm install
```

#### 3. Config Local Secrets & Environment
Create a copy of the environment settings or make a `.env.local` directly in the project root folder.
Set the Gemini API key to query local helpers:
```env
# .env.local
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

#### 4. Run Development Server
Fire up the local dual Express + Vite pipeline:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view your brand new offline sanctuary!

---

## 🏗️ Production Build & Deployment

SovereignNote is fully production-ready and runs on a robust Full-Stack Node.js bundle for fast container boot times and minimal file I/O operations.

### Clean & Build Production Package

```bash
# Clean preceding builds
npm run clean

# Bundle client-side bundle & server.ts into CJS
npm run build
```

The server compiler will output a self-contained production-grade target at `dist/server.cjs` and the static SPA assets inside `dist/`.

### Run Built Server

To simulate production or launch in a Docker environment, run:
```bash
npm run start
```
By default, the production worker binds cleanly to host `0.0.0.0` over Port `3000`.

---

## 👥 Privacy Declaration

**SovereignNote is 100% Client-Side Private.** All your folders, tags, canvas assets, and notes are cached directly into your computer's browser storage (IndexedDB) and **never** transmitted to third-party databases. You hold the master key. Ensure regular database snapshots via the internal **Backup & Sync (LAN/WebDAV/JSON)** panels underneath the Sync tab.
