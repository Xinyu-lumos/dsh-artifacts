# dsh-artifacts

<p align="center">
  <a href="./README.md">English</a> | 中文
</p>

<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-3167E3?style=flat-square"></a>
  <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-0.1.0--rc.6-3167E3?style=flat-square">
  <img alt="版本" src="https://img.shields.io/badge/dsh--artifacts-v0.1.0-3167E3?style=flat-square">
</p>

`dsh-artifacts` 是一个独立的社区插件，为 DeepSeek Harness 带来类 Claude Artifact 的图表渲染。当模型调用 `render_diagram` 工具时，图表会直接以内联 SVG 卡片的形式渲染在对话回复中，并可打开右侧面板查看更大、带版本历史的视图，以及导出。

## 特性

- **内联 SVG 卡片** —— 图表直接渲染在工具结果中，无需刷新、无需额外窗口。
- **三种确定性布局** —— `workflow`（流程，纵向或横向）、`architecture`（分组架构）、`nested-loop`（递归嵌套循环）。
- **自动版本化** —— 同一 artifact id 的每次成功渲染都会成为可切换的新版本。
- **带版本的面板** —— 右侧面板提供 预览 / 源码 两个标签页、版本选择器、主题（亮色 / 暗色 / 跟随系统）、可调整宽度、全屏模式与自动打开开关；按 Escape 可关闭。
- **导出** —— 将当前图表下载为 SVG 或 PNG，或复制 SVG 标记 / 规格 JSON。
- **安全构造** —— SVG 仅由 React 元素构建，绝不注入原始 HTML 或脚本。

## 环境要求

- DeepSeek Harness `0.1.0-rc.6`（预发布版本，后续版本可能调整插槽契约）。
- 已安装该插件的 Web 配置。

## 安装

```sh
dsh plugin --profile web add https://github.com/Xinyu-lumos/dsh-artifacts
```

重启 `web` 配置（或强制刷新页面），然后让模型绘制图表。

本地开发安装：

```sh
dsh plugin --profile web add ./dsh-artifacts
```

## 使用

让模型绘制图表。模型会以 artifact id、标题和图表规格调用 `render_diagram`：

```js
render_diagram(
  artifactId: "auth-flow",
  title: "认证流程",
  diagram: {
    "type": "workflow",
    "direction": "TB",
    "nodes": [
      { "id": "start", "label": "开始" },
      { "id": "login", "label": "登录" },
      { "id": "done", "label": "完成" }
    ],
    "edges": [
      { "from": "start", "to": "login" },
      { "from": "login", "to": "done" }
    ],
    "groups": []
  }
)
```

图表会内联显示。点击 "在面板中打开" 查看更大的抽屉，使用药丸按钮切换版本，用底部工具栏下载或复制。

复用同一个 `artifactId` 即可创建新版本；抽屉和回合卡片会从对话本身重建版本历史，不写入任何独立数据库。

## 图表类型

- `workflow` —— 节点与连线按从上到下或从左到右布局。
- `architecture` —— 以容器形式呈现的分组阶段。
- `nested-loop` —— 可递归嵌套子循环的循环。

## 作用范围

该插件仅使用官方 Harness 工具与插槽 API（`tool.call.toolview`、`conversation.chat.turnTail`、`shell.overlay`），不修改 DSH 核心文件。工具结果始终是唯一持久化的数据来源；当浏览器侧缺失时，对话会退化为普通的文本 / 工具输出。

## 设置

- 主题：亮色、暗色或跟随系统。
- 自动打开：图表渲染完成后自动打开面板。

设置保存在浏览器的 localStorage（键 `dsh-artifacts.settings`）。

## 安全

- 仅通过 React 元素渲染 SVG —— 绝不注入原始 HTML、脚本、样式或外部资源。
- 渲染前对图表规格做封闭 schema 与硬性上限校验；非法规格显示有界的错误卡片，绝不阻塞文本。
- 导出文件名经过清洗；下载均为本地 blob（不会上传任何内容）。

## 升级兼容性

- 将 peer 依赖固定到 `0.1.0-rc.6`。
- 插槽契约为预发布定义，升级时需重新验证。
- 展示元数据带 schema 版本号；不支持的版本会以文本回退呈现。

## 故障排查

- 图表未显示：确认浏览器侧已加载（刷新页面）且配置包含该插件。
- 提示规格非法：模型产出的图表超出尺寸或形状限制，请让它简化。
- PNG 导出为空：图表缺少固有尺寸，请在预览标签页重新打开后再导出。

## 开发

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
pnpm pack --dry-run
```

## 许可证

MIT
