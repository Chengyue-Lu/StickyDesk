# StickyDesk Desktop Canvas 方案（重整版）

## 1. 目标与边界

本方案的目标是：在不推翻现有主窗口与模块拆分能力的前提下，实现条目级的桌面自由摆放。

明确边界：

1. 条目级分离不再采用“每条目一个系统窗口”。
2. 第一阶段只做 Note，Future Task 后置。
3. 第一阶段优先稳定可用，不追求复杂动画。
4. “任意位置”定义为桌面画布内任意位置（画布本身覆盖桌面工作区）。

---

## 2. 核心决策

新增一个 `Desktop Canvas` 窗口形态，专门承载被放到桌面的条目卡片。

统一三种窗口形态：

1. `main`：主窗口，负责 CRUD、列表管理、搜索排序、设置。
2. `module`：现有 notes/tasks 模块拆分窗口，继续保留。
3. `canvas`：桌面画布窗口，负责条目绝对定位展示与拖动。

结论：Canvas 是新增能力，不替代 main/module。

---

## 3. 为什么不走 item-level 多窗口

如果每条目都是系统子窗口，会直接引入高复杂度：

1. 窗口数量管理与回收复杂。
2. 焦点与输入冲突复杂。
3. 资源开销上升明显。
4. 多窗口数据同步链路变长。
5. 用户心智负担变重。

Canvas 方案将“系统窗口管理问题”降为“同画布内坐标管理问题”，复杂度更可控。

---

## 4. MVP 交付范围

先做这些：

1. 新增 `canvas` 窗口并可开关。
2. Note 支持 `Send to desktop`。
3. Canvas 渲染 desktop note。
4. desktop note 支持拖动与位置持久化。
5. desktop note 支持 `Return to list`。
6. 空白区域点击穿透，卡片区域可交互。

暂不做这些：

1. Future Task desktop 化。
2. 吸附、磁贴、自动对齐。
3. 多屏完整支持。
4. 复杂桌面内编辑。
5. 从主列表直接拖拽入 Canvas（先按钮触发）。

---

## 5. 数据模型（关键）

核心原则：条目是否在桌面展示，属于条目布局状态，不属于窗口状态。

建议新增：

```ts
export type DesktopLayout = {
  mode: 'list' | 'desktop';
  x: number;
  y: number;
  zIndex: number;
};
```

扩展 Note/FutureTask：

```ts
desktopLayout?: DesktopLayout | null;
```

展示规则：

1. 主窗口列表只显示 `mode !== 'desktop'` 的条目。
2. Canvas 只显示 `mode === 'desktop'` 的条目。

兼容策略：

1. 旧数据无 `desktopLayout` 时，默认按 `list` 处理。
2. normalization 层负责兜底，避免老数据崩溃。

---

## 6. 关键修改逻辑（必须说清）

### 6.1 Send to desktop

触发路径（主窗口）：

1. 用户点击条目 `Send to desktop`。
2. 设置 `desktopLayout = { mode: 'desktop', x, y, zIndex }`。
3. 若 Canvas 未打开，自动打开 Canvas。
4. 主列表立即隐藏该条目。

默认摆放：

1. 首个 `(80, 80)`。
2. 后续按固定偏移递增。
3. 超界后换列或回绕。

### 6.2 Canvas 渲染与拖动

Canvas 只渲染 `desktop` 条目，使用绝对定位。

拖动逻辑：

1. `pointerdown` 记录抓取偏移。
2. `pointermove` 更新视觉位置。
3. `pointerup` 提交并持久化 `x/y`。

第一版建议：拖动过程中可仅更新本地态，松手再写存储，降低写入压力。

### 6.3 Return to list

回收逻辑：

1. 点击 `Return to list`。
2. 清空 `desktopLayout` 或改为 `mode: 'list'`。
3. 条目从 Canvas 消失并回到主列表。

### 6.4 zIndex 与置顶

点击卡片时：

1. 计算 `maxZ + 1`。
2. 更新当前卡片 `zIndex`。
3. 持久化该变更。

第一版可不做归一化压缩，后续再处理过大 `zIndex`。

---

## 7. 点击穿透策略（高风险点）

注意：Tauri 的忽略鼠标事件能力是窗口级，不是区域级。

第一版可执行策略：

1. Canvas 默认“允许交互”（不穿透）。
2. 当指针离开所有卡片且进入空白区域时，切换窗口为穿透。
3. 当指针回到卡片区域时，关闭穿透，恢复交互。
4. 拖动中强制关闭穿透，避免丢失拖动。

实现重点不是动画，而是稳定状态机：

1. `idle`
2. `card-hover`
3. `dragging`
4. `passthrough`

不要第一版就做复杂命中优化。

---

## 8. 跨窗口数据同步策略

建议规则：

1. 数据真实来源仍是本地存储（Rust 命令层）。
2. 主窗口与 Canvas 都通过同一套数据命令读写。
3. 变更后通过窗口事件通知对方刷新；轮询仅做兜底，不做主链路。

这样可避免“主窗和 Canvas 显示不一致”的老问题复发。

---

## 9. 文件级改造清单（按当前仓库）

### 9.1 前端 TypeScript

1. `src/App.tsx`  
   增加 `windowKind=canvas` 分流。
2. `src/lib/desktopApi.ts`  
   新增 `openDesktopCanvasWindow / closeDesktopCanvasWindow / isDesktopCanvasWindowOpen`。
3. `src/types/note.ts`  
   增加 `DesktopLayout` 与 `desktopLayout` 字段。
4. `src/types/futureTask.ts`  
   预留 `desktopLayout` 字段（可先只读不写）。
5. `src/hooks/useNotes.ts`  
   增加 desktop 过滤与布局更新接口。
6. `src/pages/NotesBoard.tsx`  
   增加 `Send to desktop` 入口与回收联动刷新。
7. 新增 `src/pages/DesktopCanvas.tsx`  
   实现 desktop note 渲染、拖动、置顶、回收。
8. `src/index.css`  
   新增 Canvas 层样式、desktop note 卡片样式、穿透状态样式。

### 9.2 后端 Rust

1. `src-tauri/src/sticky_desk.rs`  
   扩展 `Note/FutureTask` 结构字段；扩展更新输入结构。
2. `src-tauri/src/sticky_desk/normalization.rs`  
   增加 `desktopLayout` 解析与默认兜底。
3. `src-tauri/src/sticky_desk/commands_data.rs`  
   支持 desktopLayout 的写入更新。
4. `src-tauri/src/sticky_desk/storage.rs`  
   原逻辑可复用，依赖 serde 自动序列化新增字段。

---

## 10. 分阶段实施

### Phase 1：窗口与路由打底

1. 增加 `canvas` windowKind 与开关 API。
2. 建立空 Canvas 页面。

### Phase 2：Note desktop 化闭环

1. Note 数据模型扩展。
2. 主窗口 `Send to desktop`。
3. Canvas 渲染 + 拖动 + 回收。
4. 位置持久化。

### Phase 3：稳定性增强

1. zIndex 置顶。
2. 边界限制。
3. 点击穿透状态机打磨。
4. 事件驱动同步替代轮询主链路。

### Phase 4：Future Task 扩展

1. Task desktop 卡片形态设计。
2. Task 拖动与回收。

---

## 11. 风险与验收

主要风险：

1. 点击穿透切换抖动。
2. 跨窗口刷新时序不一致。
3. 高 DPI/多屏下坐标偏差。

MVP 验收标准：

1. 主窗口可将 note 送入桌面且主列表隐藏。
2. Canvas 中可拖动并在重启后保持位置。
3. 可回收到主列表且数据不丢失。
4. 空白区域可穿透，卡片区域可交互。
5. 不出现主窗/Canvas 长时间数据不一致。

---

## 12. 最终结论

Desktop Canvas 是当前阶段最合适的条目级桌面化路线：

1. 不破坏既有架构。
2. 可复用现有多窗口与数据能力。
3. 显著降低 item-level 多窗口复杂度。
4. 能快速产出可验证的产品价值。

建议立即按 MVP 路径推进，先完成 Note 闭环，再扩展 Task 与高级交互。
