# StickyDesk

[English](./README.md)

StickyDesk 是一个基于 Electron、React 和 Vite 构建的紧凑型桌面便签面板。
当前版本重点在于窄侧边栏形态、快速便签浏览、桌面友好的窗口控制，以及轻量的活跃时间统计。

> 状态：活跃原型阶段。当前 UI 外壳已经可用，但便签 CRUD 和长期持久化仍在开发中。

## 当前功能

### 便签面板

- 面向桌面侧边停靠的窄面板布局
- 支持置顶便签与普通便签分区展示
- 支持按标题、内容、分类和标签快速搜索
- 采用紧凑型便签行，适合快速浏览
- 搜索无结果时提供空状态提示

### 活跃时间统计

- 基于 Electron `powerMonitor.getSystemIdleTime()` 统计活跃时间
- 显示当前状态（`Active now`、`Idle` 或不可用）
- 同时统计 `Today` 和 `Total` 两类活跃时长
- 活跃时长数据持久化到 `localStorage`
- 支持清空当天和总计计时

### 窗口控制

- 无原生标题栏的半透明桌面窗口
- 内置自定义悬浮控制按钮：设置、最小化、关闭
- 内置窗口尺寸预设
- 设置面板支持 `Always on Top` 全局置顶开关
- 隐藏原生滚动条，保持紧凑外观

## 当前限制

- 便签仍然来自本地种子数据
- 尚未实现便签新建 / 编辑 / 删除
- 尚未实现标签管理 UI
- 尚未实现任务、拖拽排序、右键菜单
- 设置面板中的主题和排序规则仍是占位项

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- 存储：当前优先使用本地 JSON，只有在后续需要更重的查询或索引能力时再考虑 SQLite

## 项目结构

- `main.cjs`：Electron 主进程与窗口 IPC
- `preload.cjs`：安全的渲染进程桥接层
- `src/pages/NotesBoard.tsx`：主界面组合
- `src/components/notes/`：便签面板 UI 与窗口控制组件
- `src/hooks/useActiveTime.ts`：活跃时间统计逻辑
- `src/hooks/useNotes.ts`：便签加载与筛选逻辑
- `src/data/`：便签种子数据

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

## 近期路线

- [ ] 将便签和设置从种子数据切换到本地 JSON 持久化
- [ ] 实现便签新建、左键展开、内联编辑与删除
- [ ] 增加右键快捷操作菜单
- [ ] 增加短时倒计时任务（专注计时）
- [ ] 将主题、排序和窗口行为改成真实设置项

## 许可

MIT
