# 贡献指南

## 如何参与开发我的项目

1. 请先安装 [Node.js](https://nodejs.org/zh-cn/download) 和 [Git](https://git-scm.com/downloads)。
2. 确保你可以稳定访问到 Github 页面，如果不能，请使用 [FastGithub](https://github.com/creazyboyone/FastGithub/releases) 等加速软件加速。
3. 点击 GitHub 页面右上角的 “Fork” 按钮，创建一个 fork。
4. 在桌面上右键，点击菜单中的 Git Bash Here，打开命令行窗口。
5. 输入以下命令，把项目克隆到本地。

    ```bash
    # 请把“你的用户名”这五个字替换成你实际的用户名
    git clone https://github.com/你的用户名/Phiedit-2573.git
    ```

6. 双击运行根目录下的 [install.cmd](install.cmd) ，**直接回车**安装依赖。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm install` 或 `install` 安装依赖。
7. 双击运行根目录下的 [dev.cmd](dev.cmd) 启动项目的开发模式。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm run electron:serve` 或 `dev` 启动项目。
8. 请不要直接在 `master` 分支上开发，请在 `dev` 分支上开发，或者先基于 `dev` 分支创建功能分支（名字可任取），并在功能分支上开发。（你开发完的代码会被推送到 `dev` 或功能分支里）。
9. 开始你的开发。
10. 提交代码并推送至你的 Fork 仓库（要推送到功能分支里）。**注意提交信息要遵循 [commit 规范](#commit-规范)**。

    ```bash
    # 第1步：把修改添加到暂存区
    git add .
    # 第2步：提交暂存区，请把引号中的内容替换为实际的提交信息
    git commit -m "feat(example): 你的提交信息"
    # 第3步：将修改推送到远程仓库，请把“你的功能名”替换为实际的功能名
    git push origin 你的功能名
    ```

    如果你使用的是 VSCode，建议按下面的步骤操作：
    1. 点击**界面左侧的**树枝形状的图标，点击“Changes”右侧的加号图标（第1步）
    2. 在输入框内输入提交信息，然后点击“Commit”按钮（第2步）
    3. 再点击“Sync Changes”或“Publish Branch”按钮（第3步）。

11. 在 GitHub 上给我提交 Pull Request 并等待审核。若审核通过，我会把你 Fork 的仓库上的修改合并到我的仓库。我会根据 [Pull Request 审核标准](#pull-request-审核标准) 审核你的 Pull Request。

## 文件目录结构解释

### [managers](src/managers)（管理器）

管理器是用来实现具体功能的类，包含实现该功能的具体代码。
[managers/renderer](src/managers/renderer) 属于渲染线程，[managers/main](src/managers/main) 属于主线程。

### [tools](src/tools)（工具）

就是一些简单的工具函数和类等等。

### [models](src/models)（类和接口）

[谱面](src/models/chart.ts)、[音符](src/models/note.ts)、[事件](src/models/event.ts)都定义在这里。
外部代码不应该直接引用具体实现类来定义类型，而是使用抽象接口定义类型。

### [panels](src/panels)（侧边栏）

这些文件是 Vue 组件，显示在界面的侧边。
[NoteEditPanel](src/panels/NoteEditPanel.vue)、[NumberEventEditPanel](src/panels/NumberEventEditPanel.vue)、[ColorEventEditPanel](src/panels/ColorEventEditPanel.vue)、[TextEventEditPanel](src/panels/TextEventEditPanel.vue) 以及 [MutipleEditPanel](src/panels/MutipleEditPanel.vue) 显示在左侧边栏，其他的显示在右侧边栏。

### [myElements](src/myElements)（封装组件）

一些自定义 Vue 组件，是 Element Plus 组件的封装。
有[输入框](src/myElements/MyInput.vue)、[下拉菜单](src/myElements/MySelect.vue)、[开关](src/myElements/MySwitch.vue)等等。也含有一些 Element Plus 没有的组件，比如[计算器组件](src/myElements/MyCalculator.vue)。

### [views](src/views)（页面）

在 [Root.vue](src/Root.vue) 中会被放到 `<RouterView />` 的位置。
最开始进入软件时显示的是首页，点进某个谱面后显示编辑页。
目前只有[首页](src/views/HomePage.vue)和[编辑页](src/views/EditorPage.vue)两个页面，后面会考虑增加。

### [eventEmitter.ts](src/eventEmitter.ts)（事件分发器）

用于分发消息，实现发布-订阅模式，联结各个 managers 和 Vue 组件之间的消息传递。

### [store.ts](src/store.ts)（数据存储器）

用于存储数据，并把这些数据在各个 managers 和 Vue 组件之间传递。

### [background.ts](src/background.ts)（主线程）

用于处理一些文件操作，如添加谱面、打开谱面、删除谱面等。

### [preload.ts](src/preload.ts)（预加载线程）

用于在主线程和渲染线程之间双向通信。不要直接用 `import` 导入此文件，请使用 `window.electronAPI`。

### [keyHandlers.ts](src/keyHandlers.ts)（按键监听器）

用于处理键盘按下或松开不同的键时应该做的操作。

### [main.ts](src/main.ts)（渲染线程）

用于创建 Vue 应用程序，并导入一些全局的 CSS 文件。

### [router.ts](src/router.ts)（路由管理器）

用于定义 `vue-router` 的路由。

### [constants.ts](src/constants.ts)（常量）

就是一些写死在代码里的设置项，包括 UI 的位置和 Tips 等等。~~你可以翻看此代码，看看我都往 Tips 里藏了多少彩蛋。~~

### [Root.vue](src/Root.vue)（根组件）

用于管理 [views](src/views) 下的页面，也 provide 了一些方法供子组件调用。

## 术语解释

### `ChartPackage` 谱面包

JSON 谱面、音乐、曲绘，以及判定线贴图等等的总称。

### `ChartFolder`/`ChartDir` 谱面文件夹

存储 ChartPackage 的文件夹。

### `Chart` 谱面

存储为 RPE JSON 格式的谱面。

### `ResourcePackage` 资源包

资源包，里面包含音符图片、打击音效、配置信息等等。

### `JudgeLine` 判定线

判定线上面可以放置音符，也可以放置事件。存储在 `chart.judgeLineList` 中。

### `Note` 音符

音符包括 Tap、Drag、Flick、Hold 四种。存储在 `judgeLine.notes` 中。

### `Event` 事件

事件用于控制判定线的坐标、角度、透明度等等。也有一些属性是静态的，无法用事件控制。
为了和 `window` 对象自带的 `Event` 类区分开，代码中该类的名字叫做 `AbstractEvent`。

### `NumberEvent` 数字事件

起始和结束值类型为数字的事件。

### `ColorEvent` 颜色事件

起始和结束值类型为 [RGBcolor](src/tools/color.ts#L7) 的事件。

### `TextEvent` 文本事件

起始和结束值类型为字符串的事件。

### `ShaderVariableEvent` 着色器变量事件

用于控制着色器变量的事件。
起始和结束值可以为数字，也可以为二维、三维、四维矢量（以数组的形式存储）。

### `Extra` 扩展信息

存储在 `extra.json` 中，用于定义着色器等高级信息。

### `Effect`/`Shader` 效果/着色器

包含着色器名称、着色器变量等信息。

## 开发规范

这里本来是有很大篇幅的开发规范的，但是考虑到本项目规模较小，不需要这么长的规范，再加上你看到这些规范可能会头疼，所以全部删掉了。
所以，你就正常写你的代码，正常提交 Pull Request 即可。
当你给我提交 Pull Request 时，**如果你的提交有不合规范的地方，我会告诉你具体的修改要求**。然后，我可能**拒绝**该 Pull Request，也可能**接受**该 Pull Request。如果我接受了该 Pull Request，就说明我要**自己修改**你提交的内容。

## Pull Request 审核标准

### 目标分支规定

Pull Request 的目标分支必须是 dev（开发分支），而非 master（主分支）。

### 内容规定

- 修改目的（修复 Bug、新增功能等，必要）
- 测试情况（包括开发环境和生产环境下的测试结果，必要）
- 关联的 Issue 编号（以 # 开头，可选）
- 相关截图或录屏（包含一些具体的描述，可选）
- 其他内容（由本文档的其他部分规定）

### 测试情况审核标准

需通过 [build.cmd](build.cmd) 构建测试，编译后的安装包安装后可以正常运行，不能有白屏、闪退、功能失效等严重 bug，且必须达到修改目的。

### commit 规范

- 要遵循 [commit 通用规范](https://www.conventionalcommits.org/zh-hans/)。
- commit 信息的第一行结尾不加标点符号。

## 开发建议

- 建议不要轻易升级或降级依赖，因为这可能会带来一些非常难解决的问题，例如编译不通过或者一打开就报错等等。
- （待补充）

## 版权与许可证

本项目采用 [MIT 许可证](LICENSE)，所有贡献均需遵守以下版权规则：

### 1. 新增文件的版权声明

- **必须**在文件顶部添加标准声明：

  ```javascript
  /** 
   * @license MIT
   * Copyright © <年份> <您的 GitHub 用户名或真实姓名>. All rights reserved.
   * Licensed under MIT (https://opensource.org/licenses/MIT)
   */
  ```

### 2. 修改现有文件的版权声明

- **不要修改**文件顶部的原始版权声明；
- **不要添加**新的版权声明（保留文件历史归属）；
- 仅需确保您的修改**兼容 MIT 许可**。

### 3. 重写现有文件的版权声明

- 要求在 Pull Request 描述中**说明“此为完全重写”**
- 确认新代码**无原始代码片段**
- **允许替换**版权声明

### 贡献即表示同意

提交 Pull Request 即表示您：

- 确认对贡献内容拥有**完整版权或授权**
- 同意**以 MIT 许可证**发布您的贡献
- 理解您的贡献将与项目其他部分**同等适用 MIT 条款**

### 特殊情况处理

| 场景                 | 操作指引                                               |
| -------------------- | ------------------------------------------------------ |
| 修复他人代码中的 bug | 不添加声明，保持原版权归属                             |
| 重写整个文件         | 移除旧声明，添加您的新声明（需在 Pull Request 中说明） |
| 包含第三方代码       | 必须在 Pull Request 中声明来源并确认兼容 MIT           |

## 备注

我第一次发布开源项目，对于 Github 平台的开发逻辑还不是很懂，所以本文档可能会有错误，欢迎在 Issue 中指正。

## 贡献者名单

除了我以外，还有 1 人参与了贡献：

[uzjhf-836](https://github.com/uzjhf-836)
