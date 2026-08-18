# dsh-artifacts

为 DeepSeek Harness 提供类 Claude Artifact 的图表渲染。当模型调用
<code>render_diagram</code> 工具时，图表会直接以内联 SVG 卡片的形式渲染在
对话回复中，并可打开右侧面板查看更大、带版本历史的视图，以及导出。

## 特性

- 在工具结果中内联渲染 SVG 图表卡片（无需刷新、无需额外窗口）。
- 三种确定性布局：<code>workflow</code>（流程，纵向或横向）、<code>architecture</code>（分组架构）、<code>nested-loop</code>（递归嵌套循环）。
- 自动版本化：同一 artifact id 的每次成功渲染都会成为可切换的新版本。
- 右侧面板：预览 / 源码 两个标签页、版本选择器、主题（亮色 / 暗色 / 跟随系统）、自动打开开关。
- 可将当前图表导出为 SVG 或 PNG，或复制 SVG 标记 / 规格 JSON。
- 轻量、白底、简洁设计；SVG 由 React 元素构建，绝不注入原始 HTML 或脚本。

## 环境要求

- DeepSeek Harness <code>0.1.0-rc.6</code>（预发布版本，后续版本可能调整插槽契约）。
- 已安装该插件的 Web 配置。

## 安装

1. 将插件安装到你的 DSH Web 配置。
2. 将插件加入宿主插件配置（见 <code>cordis.patch.yml</code>）。
3. 刷新 DSH Web 页面。

宿主侧注册 <code>render_diagram</code> 工具与系统提示词；浏览器侧注册内联
卡片、回合卡片和右侧抽屉。若浏览器侧缺失，工具仍会返回规范的 JSON，对话会
退化为普通的文本 / 工具输出。

## 使用

让模型绘制图表。模型会以 artifact id、标题和图表规格调用
<code>render_diagram</code>。例如：

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

图表会内联显示。点击 "在面板中打开" 查看更大的抽屉，使用药丸按钮切换版本，
用底部工具栏下载或复制。

复用同一个 <code>artifactId</code> 即可创建新版本；抽屉和回合卡片会从对话
本身重建版本历史，不写入任何独立数据库。

## 图表类型

- <code>workflow</code>：节点与连线按从上到下或从左到右布局。
- <code>architecture</code>：以容器形式呈现的分组阶段。
- <code>nested-loop</code>：可递归嵌套子循环的循环。

## 设置

- 主题：亮色、暗色或跟随系统。
- 自动打开：图表渲染完成后自动打开面板。

设置保存在浏览器的 localStorage（键 <code>dsh-artifacts.settings</code>）。

## 安全边界

- 插件仅通过 React 元素渲染 SVG，绝不注入原始 HTML、脚本、样式或外部资源。
- 图表规格在渲染前会经过封闭 schema 与硬性上限校验；非法规格显示有界的错误卡片，绝不阻塞文本。
- 导出文件名经过清洗，下载均为本地 blob（不会上传任何内容）。

## 升级兼容性

- 将 peer 依赖固定到 <code>0.1.0-rc.6</code>。
- 插槽契约（<code>tool.call.toolview</code>、<code>conversation.chat.turnTail</code>、<code>shell.overlay</code>）为预发布定义，升级时需重新验证。
- 展示元数据带 schema 版本号；不支持的版本会以文本回退呈现。

## 故障排查

- 图表未显示：确认浏览器侧已加载（刷新页面）且配置包含该插件。
- 提示规格非法：模型产出的图表超出尺寸或形状限制，请让它简化。
- PNG 导出为空：图表缺少固有尺寸，请在预览标签页重新打开后再导出。

## 开发

    pnpm install
    pnpm run typecheck
    pnpm test
    pnpm run build
    pnpm pack --dry-run

## 许可证

MIT
