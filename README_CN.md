# StickyDesk

[English](./README.md)

StickyDesk 是一个基于 Electron、React 和 Vite 构建的紧凑型桌面便签侧栏。
它的目标是提供一个窄而轻的桌面面板，用于快速记录、快速浏览，以及作为日常桌面工作流中的轻量辅助工具。

> 状态：`v0.2.0` 原型版本。当前便签主流程、本地持久化、基础个性化设置和发布打包已经可用。

## 当前功能

### 便签

- 本地 JSON 持久化存储（`data/notes.json`）
- 内联新建便签
- 单条便签展开 / 收起
- 标题、正文、标签的内联编辑
- 在展开态删除便签
- 使用 Pin 开关在置顶区与普通区之间切换
- 按标题、正文、标签搜索
- 支持按创建时间或修改时间排序
- 支持从新到旧 / 从旧到新两种排序方向

### 活跃时间统计

- 基于 Electron `powerMonitor.getSystemIdleTime()` 统计活跃时间
- 显示 `Today` 与 `Total` 两类活跃时长
- 空闲判定阈值为 20 秒
- 首次进入空闲态时，Idle 计时从 `0s` 重新开始
- 支持清零当天与总计时

### 窗口外壳

- 无原生标题栏的半透明桌面面板
- 悬浮按钮：设置、最小化、关闭
- 手动输入窗口宽高，并自动应用上下限
- 窗口尺寸持久化到 `data/settings.json`
- `Always on Top` 开关并支持持久化
- 启动时优先显示轻量壳层，减少“空白等待”感
- 隐藏原生滚动条，保持紧凑外观

### 主题

- 内置 5 种主题：
  - 白色
  - 淡黄色
  - 淡蓝色
  - 淡绿色
  - 淡紫色
- 主题选择会持久化到 `data/settings.json`
- 顶部统计、设置面板、便签区和底部统计条会一起跟随主题变化

## 当前限制

- 还没有短时倒计时 / 专注计时功能
- 还没有系统托盘集成
- 单文件便携版仍然会比目录版启动更慢，因为启动前需要解压到临时目录
- 应用体积主要受 Electron 运行时影响，应用本身代码只占其中较小一部分

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- 本地 JSON（便签与设置）

## 项目结构

- `main.cjs`：Electron 主进程、JSON 存储与 IPC
- `preload.cjs`：安全的渲染进程桥接层
- `src/pages/NotesBoard.tsx`：主界面组合
- `src/components/notes/`：便签卡片、编辑器、工具栏、顶部统计与窗口控制
- `src/hooks/useActiveTime.ts`：活跃 / 空闲统计逻辑
- `src/hooks/useAppSettings.ts`：渲染层设置状态
- `src/hooks/useNotes.ts`：便签加载、筛选、排序与增删改
- `src/data/notes.ts`：渲染层便签 I/O 适配器
- `data/notes.json`：运行时便签数据文件（缺失时自动创建）
- `data/settings.json`：运行时设置数据文件（缺失时自动创建）

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 校验

```bash
npm run typecheck
npm run build
```

### 打包

Windows 便携版：

```bash
npm run package:win
```

Windows 目录版：

```bash
npm run package:win:dir
```

当前发布形式以便携版和目录版为主。由于目录版已经覆盖“直接启动更快”的场景，现阶段不把 NSIS 安装包作为优先方向。

## 路线图

### 下一阶段

- [x] 增加短时倒计时 / 专注计时
- [ ] 增加系统托盘与后台控制
- [ ] 增加便签与设置的导入 / 导出
- [ ] 评估迁移到 `electron-vite`，统一 Electron 构建管线
- [ ] 在不破坏当前视觉外壳的前提下，继续压缩冷启动成本

### 后续阶段

- [ ] 扩展更丰富的便签元数据与筛选能力
- [ ] 如果 Electron 在启动速度或包体上持续不满足目标，再评估 Tauri 作为未来迁移方案
- [ ] 只有在本地 JSON 明显不够用时，再评估 SQLite

## 许可

MIT
