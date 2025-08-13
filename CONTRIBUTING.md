# 贡献指南

## 如何参与开发我的项目
0. 确保你可以稳定访问到 Github 页面，如果不能，请在你的 `C:\Windows\System32\drivers\etc\hosts` 文件中添加以下内容（记得把原文件备份一份）：
    ```
    github.com
    20.205.243.166 github.com
    174.37.175.229 global.ssl.fastly.net
    185.199.111.153 assets-cdn.github.com
    185.199.109.153 assets-cdn.github.com
    185.199.108.153 assets-cdn.github.com
    185.199.110.153 assets-cdn.github.com
    20.205.243.165 codeload.github.com
    31.13.71.19 github.global.ssl.fastly.net
    github.com end
    ```
    或者把域名中的 `github.com` 替换成 `kkgithub.com`（GitHub 镜像网站）
1. 点击 GitHub 页面右上角的 “Fork” 按钮，创建一个 fork（就是把我的项目给你复制一份的意思）
2. 创建一个文件夹，在文件夹中右键，点击菜单中的 Git Bash Here，打开命令行窗口
3. 输入以下命令，把项目克隆到本地（就是把项目下载下来的意思）
    ```bash
    git clone https://github.com/你的用户名/Phiedit-2573.git
    ```
4. 双击运行根目录下的 [install.cmd](install.cmd) ，**直接回车**安装依赖
5. 双击运行根目录下的 [dev.cmd](dev.cmd) 启动项目
6. 开始你的开发
7. 基于 dev 分支创建功能分支（你开发完的代码就会在这个分支里）
    ```bash
    git checkout -b 你的功能名 dev
    ```
8. 提交代码并推送至你的 Fork 仓库（要推送到功能分支里）
    ```bash
    git add .
    git commit -m "你的提交信息，对你的修改做了哪些进行描述"
    git push origin 你的功能名
    ```
9. 在 GitHub 上提交 Pull Request，在 Pull Request 的信息中关联对应 Issue（就是向我申请，要把你的修改合并到dev分支里的意思）
10. 等待审核
11. 审核通过后，恭喜你，你已经给这个项目的开发做出了贡献
<!-- 12. 发布新版本时，我会按下面步骤把 dev 分支的代码合并到 master 分支，并打上版本号（**你不需要运行这些命令**）：
12. `git fetch origin`（下载远程仓库的代码）
13. `git checkout master`（切换到 master 分支）
14. `git merge dev`（把本地的 dev 分支的代码合并到 master 分支）
15. `git push origin master`（把本地代码推送到远程仓库）
16. `git tag -a v新的版本号 -m "release 新的版本号"`（给新的版本打标签）
17. `git push origin v新的版本号`（把标签推送到远程仓库）
18. 把需要发布的文件打包为zip压缩包
19. `gh release create v新的版本号 "dist_electron/Phiedit 2573 v新的版本号.zip"`（发布新的版本） -->


[（你说啥？git不是内部或外部命令，也不是可运行的文件？你根本就没安装git啊？赶快点击链接下载安装呀！）](https://git-scm.com/downloads)

## 文件目录结构解释
- [managers](src/managers): 管理器，用于实现各种功能，比如[复制粘贴](src/managers/clipboard.ts)，[鼠标框选](src/managers/mouse.ts)等等
- [tools](src/tools): 各种工具（可通用）
- [models](src/[models): 各种类，例如[谱面类](src/models/chart.ts)，[音符类](src/models/note.ts)，[事件类](src/models/event.ts)等等
- [panels](src/panels): 侧边栏的vue组件，显示在界面右侧。这些文件应该只是vue组件，不应该代替 [managers](src/managers) 中文件的功能。
- [myElements](src/myElements): 一些自定义的 Vue 组件，看起来与 Element Plus 的组件一模一样。有[输入框](src/myElements/MyInput.vue)，[下拉菜单](src/myElements/MySelect.vue)，[开关](src/myElements/MySwitch.vue)等等。
  输入框、下拉菜单等组件也分很多种，比如[拍数输入框](src/myElements/MyInputBeats.vue)，[数字输入框](src/myElements/MyInputNumber.vue)，[缓动下拉菜单](src/myElements/MySelectEasing.vue)等等，用来处理不同类型的输入数据。
  输入框有 input 和 change 事件，下拉菜单和开关只有 change 事件。也含有一些 Element Plus 没有的组件，比如[计算器组件](src/myElements/MyCalculator.vue)。
- [views](src/views): 界面的各个页面，目前只有[首页](src/views/HomePage.vue)和[谱面编辑页](src/views/EditorPage.vue)两个页面
- [eventEmitter.ts](src/eventEmitter.ts): 用于分发消息，实现发布订阅模式，联结各个 managers 和 Vue 组件之间的消息传递
- [store.ts](src/store.ts): 数据集中管理，用于在各个 managers 和 Vue 组件中传递数据。
  它的生命周期从打开软件开始一直到关闭软件，所以请手动把不需要的数据设为 `null`。
- [background.ts](src/background.ts): Electron 的主线程，用于处理一些文件操作，如添加谱面、打开谱面、删除谱面等
- [preload.ts](src/preload.ts): Electron 的预加载线程，定义了 `window.electronAPI`，用于把添加谱面、打开谱面、删除谱面等操作从主线程转发给渲染线程
- [main.ts](src/main.ts): Electron 的渲染线程
- [router.ts](src/router.ts): 路由管理，用于定义路由
- 其他文件: 含有一些比较杂乱的文件，正在考虑优化和重构

（这些文件都是在src目录下的，你不会还在根目录下找文件吧？不会吧？）

## 注意事项
- 除了 [store.ts](src/store.ts) 以外，不要在任何位置直接使用 [note.ts](src/models/note.ts) 和 [event.ts](src/models/event.ts) 提供的构造函数 `Note()`、`NumberEvent()`、`ColorEvent()`、`TextEvent()` 来新建音符或事件的对象。你应该使用 [store.ts](src/store.ts) 提供的 `store.addNote()` 和 `store.addEvent()` 等。添加之后，请确保你使用了 `historyManager.recordAddNote()` 和 `historyManager.recordAddEvent()`（[history.ts](src/managers/history.ts)） 来记录添加动作的历史记录。
- 用户传入的参数有误时，请使用`throw new Error()`抛出一个错误，并在Vue组件中使用 [catchError.ts](src/tools/catchError.ts) 模块提供的 `createCatchErrorByMessage()` 方法捕获错误，这样该错误会在界面的顶部显示为一个弹窗。
- 需要添加新功能时，请按以下步骤操作：
    1. 在 [managers](src/managers) 目录下新建一个文件，使用 `export default class 类名 extends Manager { ... }` 定义一个管理器类，实现相应的代码，在实现过程中可以通过 `store` 对象获取所需要的数据。
    2. 在 [eventEmitter.ts](src/eventEmitter.ts) 的 `EventMap` 接口中添加相应的事件名称。
    3. 在 [store.ts](src/store.ts) 中的 `Store.managers` 字段中新增一个字段来存储新增的管理器。
    4. 可能需要新建一个vue组件，并实现相应的界面。
    5. 在你需要的地方调用 `globalEventEmitter.emit("你的事件名称", 参数)`。
    6. 在 [EditorPage.vue](src/pages/EditorPage.vue) 中导入你定义的类，调用构造函数，创建实例，并设置进 `store` 对象中。
- 项目遵循分层架构原则，文件的依赖等级从高到低分别是：
    1. [main.ts](src/main.ts)
    2. [Root.vue](src/Root.vue)
    3. [views 下的文件](src/views/)
    4. [panels 下的文件](src/panels/)
    5. [managers 下的文件](src/managers/)
    6. [store.ts](src/store.ts)
    7. [eventEmitter.ts](src/eventEmitter.ts)
    8. [* myElements 下的文件](src/myElements/)
    9. [* models 下的文件](src/models/)
    10. [* tools 下的文件](src/tools/)
    11. [types.ts](src/types.ts)
    12. 第三方库
    文件只能依赖比该文件依赖等级更低的文件，标星号的还可以依赖同级的文件。
    特殊说明：
    除了 [main.ts](src/main.ts) 以外，请不要在 Typescript 文件中直接引用 Vue 文件。
    [store.ts](src/store.ts) 是一个特殊的文件，它可以引用 [managers 下的文件](src/managers/)，但只能引用类型，不能使用构造函数。
    例如：
    ```typescript
    // store.ts
    import { Note } from "@/models/note"; // ✅可以引用 models 下的文件
    import ClipboardManager from "@/managers/clipboard"; // ❌不能引用 managers 下的文件
    import type ClipboardManager from "@/managers/clipboard"; // ✅可以只引用类型，引用 managers 下的文件
    import MyInput from "@/myElements/MyInput.vue"; // ❌不能引用 Vue 文件
    ```

- 对于较复杂难理解的逻辑，请添加注释，以确保他人能够理解你的代码。请尽量使用文档注释而不是普通注释。
- 对于AI（人工智能）写的或请他人写的代码，请确保你理解了这段代码的意思再加进项目中。（实话实说，这个项目里真的有很多用AI生成的代码或文档）
- [myElements](src/myElements/) 文件夹下的组件若使用 `v-model` 绑定了非响应式的数据，请使用组件暴露的 `updateShowedValue` 方法手动更新显示的内容。
- 为防止XSS攻击，路径的拼接请使用 `path` 库中的 `path.join()` 方法，不要直接把字符串相加，也不要使用模板字符串拼接。
- 不要使用eslint禁用注释、`ts-ignore`、忽略类型检查、`as any` 等避免报错的手段，除非你确定该段代码100%不会出错。
- 不要直接使用 `ElButton` 组件，而是使用[封装后的 `MyButton` 组件](src/myElements/MyButton.vue)。因为 `ElButton` 按钮按下后再按空格键，会触发点击事件，而空格键又是暂停/播放音乐的快捷键，导致用户按完按钮后想播放一下音乐，但实际又触发了一次按钮，影响体验。封装组件已避免该问题。
- 不要使用魔法数字，[models](src/models) 文件夹中有很多文件都已经定义了 `enum` 枚举常量（如 `NoteType`、`NoteAbove` 等），请使用枚举常量。
- 遇到用户可能比较难懂的术语时，使用 [MyQuestionMark.vue](src/myElements/MyQuestionMark.vue) 的问号组件来进行解释。
- 请使用 `<em>` 元素表示需要强调的内容。[index.html](public/index.html) 中已经为 `<em>` 元素设置了样式。

## Pull Request 审核标准
- Pull Request 的目标分支必须是 dev（开发分支），而非 master（主分支）。
- Pull Request 的描述中必须包含以下内容：
    - 修改目的（如修复 Bug、新增功能）
    - 关联的 Issue 编号（如 Closes #123）
    - 测试情况（如是否通过 [build.cmd](build.cmd) 构建测试）
- 需遵守 [Commit 规范](https://www.conventionalcommits.org/zh-hans/)。
- 需通过 [build.cmd](build.cmd) 构建测试，编译后的安装包安装后可以正常运行无 bug。
- 需遵循本文件 [注意事项](#注意事项) 部分的规定，旨在防止代码成为“屎山代码”。
- 需通过 eslint 检查，可使用 `npm run lint` 自查。
- 请在提交前删除或注释掉所有的 `console.log()` 等用来调试的语句，`console.warn()` 和 `console.error()` 除外。
- 请在提交前去掉所有未被使用的模块。
- 请在提交前去掉所有未被使用的依赖。

注：本项目作者是个学生党，有可能无法及时处理 Pull Request。