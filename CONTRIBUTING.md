# 贡献指南

## 如何参与开发我的项目

1. 请先安装 [Node.js](https://nodejs.org/zh-cn/download) 和 [Git](https://git-scm.com/downloads)。
2. 确保你可以稳定访问到 Github 页面，如果不能，请在你的 `C:\Windows\System32\drivers\etc\hosts` 文件中添加以下内容（记得把原文件备份一份）：

    ```plaintext
    20.205.243.166 github.com
    174.37.175.229 global.ssl.fastly.net
    185.199.111.153 assets-cdn.github.com
    185.199.109.153 assets-cdn.github.com
    185.199.108.153 assets-cdn.github.com
    185.199.110.153 assets-cdn.github.com
    20.205.243.165 codeload.github.com
    31.13.71.19 github.global.ssl.fastly.net
    ```

    你也可以把域名中的 `github.com` 替换成 `kkgithub.com`（GitHub 镜像网站）来提高访问速度。
3. 点击 GitHub 页面右上角的 “Fork” 按钮，创建一个 fork（就是把我的项目给你复制一份的意思）。
4. 在桌面上右键，点击菜单中的 Git Bash Here，打开命令行窗口。
5. 输入以下命令，把项目克隆到本地（就是把项目下载下来的意思）。

    ```bash
    # 克隆项目，请把“你的用户名”替换成你实际的用户名
    git clone https://github.com/你的用户名/Phiedit-2573.git
    ```

6. 双击运行根目录下的 [install.cmd](install.cmd) ，**直接回车**安装依赖。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm install` 或 `install` 安装依赖。
7. 双击运行根目录下的 [dev.cmd](dev.cmd) 启动项目的开发模式。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm run electron:serve` 或 `dev` 启动项目。
8. 给你的功能起一个名字（详见[功能分支命名规定](#功能分支命名规定)），并基于 dev 分支创建功能分支（你开发完的代码会被推送到这个分支里）。
   如果你使用的是 Visual Studio Code（以下简称 VSCode），你也可以点击**界面左下角**的树枝形状的图标，点击“Create new branch”，输入你的功能名并回车。

    ```bash
    # 从 dev 分支创建功能分支，请把“你的功能名”替换为实际的功能名
    git checkout -b 你的功能名 dev
    ```

9. **开始你的开发。在开发之前，请先查看[注意事项](#注意事项)。**

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

11. 根据 [Pull Request 审核标准](#pull-request-审核标准)在 GitHub 上提交 Pull Request（就是向我申请，要把你的修改合并到 dev 分支里的意思）。
12. 等待审核。若审核通过，我会把你功能分支中的一个或多个 commit 统一 squash 为一个 commit，并提交到 dev 分支中。
13. 恭喜你，你已经给这个项目的开发做出了贡献！

## 文件目录结构解释

### [managers](src/managers)（管理器）

管理器是用来实现具体功能的类，包含实现该功能的具体代码。
[managers/renderer](src/managers/renderer) 属于渲染线程，[managers/main](src/managers/main) 属于主线程。

### [tools](src/tools)（工具）

这些工具函数应该是跨项目通用的，也就是说，你把我的这些代码复制过去之后也可以用到你自己的代码里，而不会出问题，即使你的代码跟我的代码毫无关系。

### [models](src/models)（类和接口）

[谱面](src/models/chart.ts)、[音符](src/models/note.ts)、[事件](src/models/event.ts)都定义在这里。
外部代码不应该直接引用具体实现类来定义类型，而是使用抽象接口定义类型。

### [panels](src/panels)（侧边栏）

这些文件是 Vue 组件，显示在界面左右两侧。
[NoteEditPanel](src/panels/NoteEditPanel.vue)、[NumberEventEditPanel](src/panels/NumberEventEditPanel.vue)、[ColorEventEditPanel](src/panels/ColorEventEditPanel.vue)、[TextEventEditPanel](src/panels/TextEventEditPanel.vue) 以及 [MutipleEditPanel](src/panels/MutipleEditPanel.vue) ~~（这几坨屎山能不能重构一下啊）~~ 显示在界面左侧，其他的显示在界面右侧。

### [myElements](src/myElements)（封装组件）

一些自定义 Vue 组件，看起来与 Element Plus 的组件一模一样。
有[输入框](src/myElements/MyInput.vue)、[下拉菜单](src/myElements/MySelect.vue)、[开关](src/myElements/MySwitch.vue)等等。
输入框、下拉菜单等组件也可以往下细分，比如[拍数输入框](src/myElements/MyInputBeats.vue)，[数字输入框](src/myElements/MyInputNumber.vue)，[缓动下拉菜单](src/myElements/MySelectEasing.vue)等等，它们是用来处理不同类型的输入数据的。
也含有一些 Element Plus 没有的组件，比如[计算器组件](src/myElements/MyCalculator.vue)。

### [views](src/views)（页面）

在 [Root.vue](src/Root.vue) 中会被放到 `<RouterView />` 的位置。
最开始进入软件时显示的是首页，点进某个谱面后显示编辑页。
目前只有[首页](src/views/HomePage.vue)和[编辑页](src/views/EditorPage.vue)两个页面，后面会考虑增加。

### [eventEmitter.ts](src/eventEmitter.ts)（事件分发器）

用于分发消息，实现发布订阅模式，联结各个 managers 和 Vue 组件之间的消息传递

### [store.ts](src/store.ts)（数据存储器）

用于存储数据，并把这些数据在各个 managers 和 Vue 组件之间传递。

### [background.ts](src/background.ts)（主线程）

用于处理一些文件操作，如添加谱面、打开谱面、删除谱面等。正在考虑重构。

### [preload.ts](src/preload.ts)（预加载线程）

用于在主线程和渲染线程之间双向通信。不要直接用 `import` 导入此文件，请使用 `window.electronAPI`。

### [keyHandlers.ts](src/keyHandlers.ts)（按键监听器）

用于处理键盘按下或松开不同的键时应该做的操作。

### [main.ts](src/main.ts)（渲染线程）

用于创建 Vue 应用程序，并导入一些全局的 CSS 文件。

### [router.ts](src/router.ts)（路由管理器）

用于定义 `vue-router` 的路由。

### [constants.ts](src/constants.ts)（常量）

就是一些写死在代码里的设置项。~~你可以翻看此代码，看看我都往 Tips 里藏了多少彩蛋。~~

### [Root.vue](src/Root.vue)（根组件）

用于管理 [views](src/views) 下的页面，~~其实就是给它们套了一层 Suspense~~，也 provide 了一些方法供子组件调用。
<!-- 不知道为啥，eslint 非得规定组件名字必须要是多个单词，搞得我不能用 Root 做组件名了，还得用 MainRoot -->

> 这些文件都是在 [src](src) 目录下的，你不会还在根目录下找文件吧？不会吧？

## 术语解释

### `ChartPackage` 谱面包

被压缩为 zip 或 pez 压缩包的谱面。

### `ChartFolder`/`ChartDir` 谱面文件夹

被存储在文件夹内的谱面。
其实没有必要区分 `ChartPackage`、`ChartFolder` 和 `ChartDir` 的存储形式，但为了和 `Chart` 作区分，所以~~随便起了一个名字就得了~~。

### `Chart` 谱面

存储为 RPEJSON 格式的谱面。

### `ResourcePackage` 资源包

被压缩为 zip 格式的资源包，里面包含一些资源文件，如音符图片和打击音效等。

### `JudgeLine` 判定线

谱面中最主要的组成部分。存储在 `chart.judgeLineList` 中。

### `Note` 音符

在落在判定线上时需要被打击。存储在 `judgeLine.notes` 中。

### `Event` 事件

谱面中用于控制判定线的某些属性，例如坐标、角度等。也有一些属性是静态的，无法用事件控制。
为了和 `window` 对象自带的 `Event` 类区分开，代码中该类的名字叫做 `AbstractEvent`。

### `NumberEvent` 数字事件

起始和结束值类型为数字的事件。

### `ColorEvent` 颜色事件

起始和结束值类型为 [RGBcolor](src/tools/color.ts#L7) 的事件。

### `TextEvent` 文本事件

起始和结束值类型为字符串的事件。

### `ShaderVariableEvent` 着色器变量事件

用于控制着色器变量的事件。类型可以为数字，也可以为二维、三维、四维矢量（以数组的形式存储）。

### `Extra` 扩展信息

存储在 `extra.json` 中，用于定义着色器等高级信息。

### `Effect`/`Shader` 效果/着色器

包含着色器名称、着色器变量等信息。

> 待补充

## 注意事项

这些注意事项是本项目的开发规范，旨在防止代码成为“屎山代码”。
如果你发现现有的代码中有不合规定的地方，可以进行修改。
~~虽然规则很多，但其实你可以把它看成一纸空文，毕竟我也不会一条一条的去检查你的代码。~~

### 分层架构

项目遵循分层架构原则，模块的依赖等级从高到低分别是：

1. [background.ts](src/background.ts)（M）
2. [main.ts](src/main.ts)（R）
3. [Root.vue](src/Root.vue)（R）
4. [views\\](src/views/)（R）
5. [panels\\](src/panels/)（R）
6. [managers\\main](src/managers/main)（M）、[managers\\renderer](src/managers/renderer/)（R）
7. [store.ts](src/store.ts)（R，可依赖 managers\）
8. [preload.ts](src/preload.ts)（R）
9. [eventEmitter.ts](src/eventEmitter.ts)（R）
10. [constants.ts](src/constants.ts)（R，只可被 managers\ 依赖）
11. [myElements\\](src/myElements/)（*R）
12. [models\\](src/models/)（*RM）
13. [tools\\](src/tools/)（*RM）
14. 第三方库（*RM，~~不会真的有人上 `node_modules` 里去改库吧~~）

除特殊说明外，模块都只能**直接**依赖比其依赖等级更低的模块，标星号的还可以**直接**依赖同级的模块。
R 表示该模块属于渲染线程（Renderer），M 表示该模块属于主线程（Main）。RM 表示渲染线程和主线程都可以依赖该模块。在遵守其他规则的前提下，同一线程的模块可以直接进行依赖。R 依赖 M 时必须通过 `window.electronAPI` 调用，M 依赖 R 时必须通过 `win.webContents.send` 发送消息。RM 只能依赖 RM。
除 [Root.vue](src/Root.vue) 可以被 [main.ts](src/main.ts) 引用外，**Vue 文件只能被 Vue 文件引用**。
> 特殊说明：managers\ 必须通过依赖 [store.ts](src/store.ts) 来间接依赖其他 managers。（详见 [数据使用规范第 1 条](#数据使用规范)）

### 单一职责

- 项目遵循单一职责原则，请确保每个 manager 只负责一个功能。
- 如果你的函数或方法名中出现 `and`、`or` 等连词，请考虑将其拆分为多个函数或方法。
- 如果你发现一个文件的代码行数过多，请考虑将其拆分为多个文件。正常情况下，一个 Typescript 文件的代码行数应该在 50~150 行左右，Vue 文件的代码行数应该在 100~300 行左右。
- [panels](src/panels) 中的文件应该只是 Vue 组件，不应该含有过多的具体功能实现。具体功能实现应该放在 [managers](src/managers) 中。

### 命名规则

- 函数和变量命名应该使用小驼峰命名法，例如 `myVariable`、`myFunction`。
- 类和组件的命名应该使用大驼峰命名法，例如 `MyClass`、`MyComponent`。
- 驼峰命名法的特殊情况：含有数字或者全大写简称时，数字或简称后面的一个单词要用全小写，比如应该是 `RGBcolor` 而不是 `RGBColor`。
- HTML 的 class 名和 id 名应该使用小写短横线命名法，例如 `.my-class`、`#my-id`。
- 常量名称以及 [eventEmitter.ts](src/eventEmitter.ts) 中的事件名称应该使用大写下划线命名法，例如 `MY_CONSTANT`、`MY_EVENT_NAME`。
- 变量应该以名词或名词性短语命名，例如 `store`、`judgeLineNumber`。
- 表示数量或数组长度的变量应该以名词的复数或 `xxxCount`、`xxxLength` 等方式命名，例如 `lines`、`judgeLinesCount`。
- 数组应该以名词的复数或 `xxxList`、`xxxArray` 等方式命名，例如 `selectedElements`、`judgeLineList`。
- 函数应该以动词或动词性短语命名，例如 `select`、`addJudgeLine`。
- 类中的属性不需要再把类名重复一遍，例如 `event.eventType` 应该改为 `event.type`。
- 以 `xxxUtils` 命名的类中应该只含有 `static` 方法或属性，不能有构造函数、实例方法或属性。
- [eventEmitter.ts](src/eventEmitter.ts) 中的事件名称若为“动词_名词”或“动词”的格式，则代表“用户想干这件事情”，
  事件名称若为“名词_动词”或“名词_动词过去分词”的格式，则代表“这件事情已经发生了”。
  例如：
  `CHANGE_JUDGE_LINE` 表示“用户想要切换判定线”，应该在用户按下切换判定线的按钮或快捷键时发出该事件，在业务代码中监听该事件并实现切换判定线的具体逻辑。
  `JUDGE_LINE_CHANGED` 表示“用户已经切换了判定线”，应该在切换判定线的具体代码中应该发出该事件，以通知其他模块，其他模块可以监听该事件以更新判定线信息。
- 布尔类型的变量或属性应该以 `isXxx`、`hasXxx`、`canXxx` 等形式命名。
- `aaaToBbb` 可以简称为 `aaa2bbb`。
- 含义相反的方法、属性、变量、函数应该以反义词命名，如下：

| 正义               | 反义                 |
| ------------------ | -------------------- |
| `add` 或 `insert`  | `remove` 或 `delete` |
| `push`（压入）     | `pop`（弹出）        |
| `push`（推送）     | `pull`（拉取）       |
| `get`              | `set`                |
| `start` 或 `begin` | `end`                |
| `enable`           | `disable`            |
| `open`             | `close`              |
| `show`             | `hide`               |
| `min`              | `max`                |
| `play`（播放）     | `pause`（暂停）      |
| `up`               | `down`               |
| `left`             | `right`              |
| `top`              | `bottom`             |
| `above`            | `below`              |
| `positive`         | `negative`           |
| `before`           | `after`              |
| `first`            | `last`               |
| `previous`         | `next`               |
| `visible`          | `hidden`             |
| `allow`            | `deny`               |
| `increase`         | `decrease`           |
| `success`          | `failure`            |
| `accept`           | `reject`             |
| `create`           | `destroy`            |
| `static`           | `dynamic`            |
| `readonly`         | `mutable`            |
| `single`           | `multiple`           |
| `public`           | `private`            |
| `real`             | `fake`               |
| `read`             | `write`              |
| `save`             | `load`               |
| `import`           | `export`             |

对于无明确反义词的场景，可在词前直接添加 `un-`、`dis-`、`not-` 等表示否定的前缀。
`-ful` 结尾的词与相对应的 `-less` 结尾的词互为反义词。
对于一个词有多个反义词的场景，请只使用其中的一个。

### 代码格式

- 请经常使用代码编辑器的格式化功能统一代码格式。VSCode 中，格式化代码的快捷键为 Shift+Alt+F。
- 缩进使用 4 个空格。如果你用的也是 VSCode，请点击界面下方的“Tab Size: 4”或类似的文字，并点击“Indent Using Spaces”，点击数字 4，那个文字应该会变为“Spaces: 4”。设置完成后，请按 Shift+Alt+F 重新格式化代码。
- 使用 Vue 组件时，每个属性都要换一行。如果超过 2 个属性，或者一个属性占了多行，则第一个属性和开头的尖括号之间要换行，最后一个属性和结尾的尖括号之间也要换行。如果你用的也是 VSCode，请打开设置，并把 `html.format.wrapAttributes` 设置为 `force-expand-multiline`。
- 大多数代码格式规则都在 eslint 配置中设置了，在编写时，如果出现了错误，你应该能收到错误提示。下列均为 eslint 中没有配置的规则，请自行遵守。
- 对于较长的函数调用，有三种换行格式，均可以选择：

```typescript
/*
换行格式1：
开头和结尾的括号不换行，每个参数的逗号后面换行
*/
method(ifThe * (parameter + contains + a + very + complex + expression
        + or + a.veryLongAttributeNameWithSevenWords),
    ["you should split it into",
        "multiple lines"],
    2,
    5,
    7,
    3);

/*
换行格式2：
每个参数的逗号和开头结尾的括号相互之间都换行
*/
method(
    ifThe * (
        parameter + contains + a + very + complex + expression
        + or + a.veryLongAttributeNameWithSevenWords
    ),
    [
        "you should split it into",
        "multiple lines"
    ],
    2,
    5,
    7,
    3
);

/*
换行格式3：
较长的参数换行，较短的参数不换行
*/
method([1, 1, 4, 5, 1, 4], () => {
    if (this_ + is < a && very || (long || expression)) {
        doSomething();
        doSomethingElse();
        doAnotherThing();
    }
    else {
        someVar = "this is a very long string that it contains eleven words";
        return someResult;
    }
}, "a string param");

method(1, 2, 3, {
    someAttribute1: "some value 1",
    someAttribute2: "some value 2",
    someAttribute3: "some value 3",
    someAttribute4: "some value 4",
    someAttribute5: "some value 5",
    someAttribute6: "some value 6",
    someAttribute7: "some value 7",
    someAttribute8: "some value 8",
    someAttribute9: "some value 9",
}， "a short string");

```

### 文档格式

- 本规定针对文档内除嵌入代码外的文字部分，以及代码内的注释部分。
- 如果你使用的是 VSCode，请安装 `markdownlint` 插件，并按照其中的规则编写文档。你可以使用 Quick Fix 功能中的 “Fix all supported markdownlint violations in the document” 来自动修复报错，然后再手动修复剩余的报错。下列均为 markdownlint 中没有配置的规则，请自行遵守。

#### 空格格式
  
| 字符种类 | 中文 | 英文 | 数字 | 全角标点 | 特殊字符 |
| -------- | ---- | ---- | ---- | -------- | -------- |
| 中文     | ×    | √    | O    | ×        | √        |
| 英文     | √    | √    | √    | ×        | √        |
| 数字     | O    | √    | √    | ×        | √        |
| 全角标点 | ×    | ×    | ×    | ×        | ×        |
| 特殊字符 | √    | √    | √    | ×        | O        |

- 列表示前面的字符，行表示后面的字符；
- √ 表示对应行列的两个字符之间要有空格，× 表示不要有空格，O 表示可有可无；
- 中文、英文以词为单位，按照对应的语言习惯空格即可；
- 数字仅包括阿拉伯数字；
- 全角标点仅包括全角的逗号、句号、问号、感叹号、冒号、分号、省略号、括号、引号、破折号、顿号、书名号；
- 特殊字符是包括数学符号在内的不属于前面四类的所有非语言字符；
- 对于多种字符混合，共同表达一个意思的词语，我们称之为混合词，例如“B站”、“i18n”、“3.14”、“C++”等；
- 混合词内部不空格；
- 混合词的字符种类视作其含有的所有字符的种类中，在上表中最靠前的那个，例如“B站”为中文，“i18n”为英文，“3.14”为数字；

> 半角标点的特殊规定：
> 逗号、句点、问号、感叹号、冒号、分号**后**要空格；
> 左引号和左括号**前**要空格，右引号和右括号**后**要空格；
> 斜杠和反斜杠**两侧都不空格**；
> 两个半角标点相邻时，中间不空格。

#### 其他

- 结构完整的句子后面要加标点符号。
- 如果要使用简称，第一次出现时请用全称，并在括号中注明“以下简称 xxx”。
- 文档中可以写开玩笑的话，但请使用删除线<!-- 或者注释 -->括起来。
~~其实就算没有这些规定，你靠直觉也能知道到底该怎么写，你看不懂就看不懂吧~~

### 开发流程规范

#### 添加新功能

1. 在 [managers](src/managers) 目录下新建一个文件，使用 `export default class 类名 extends Manager { ... }` 定义一个管理器类，实现相应的代码。
2. 在 [eventEmitter.ts](src/eventEmitter.ts) 的 `EventMap` 接口中添加相应的事件名称。
3. 在 [store.ts](src/store.ts) 中的 `managersMap` 中新增一个字段来存储新增的管理器。
4. 可能需要在 [panels](src/panels) 下新建一个侧边栏的 Vue 组件，并实现相应的界面。添加了 Vue 组件后，请在 [RightPanelState](src/managers/state.ts#L15) 中添加相应的字段。
5. 为了能进入上一步的界面，需要在 [编辑器界面](src/views/EditorPage.vue) 中添加一个按钮。
6. 在你需要的地方调用 `globalEventEmitter.emit("你的事件名称", 参数)`。

#### 添加设置项

1. 在 [settings.ts](src/managers/settings.ts) 的 `defaultSettings` 中添加相应的字段。
2. 在 [SettingsPanel.vue](src/panels/SettingsPanel.vue) 中添加相应的设置项。
3. 在对应的代码处引用 settingsManager，以应用该设置项。（详见 [数据使用规范第 1 条](#数据使用规范)）

#### 添加新页面

1. 在 [views](src/views) 下添加相应的页面，并实现页面逻辑。
2. 在 [router.ts](src/router.ts) 中添加相应的路由。

### 数据使用规范

- 如果你要在 [managers](src/managers/) 中使用其他 managers 的数据或方法，请使用 [store.useManager()](src/store.ts) 方法。
- 如果你要获取任何数据，例如谱面或资源包，必须使用 [store.ts](src/store.ts) 所提供的方法，如 `useChart()`、`useChartPackage()`、`useResourcePackage()` 等。
- 所有添加、删除音符或事件的操作都应该使用 [store.ts](src/store.ts) 提供的方法。添加之后，请确保你使用了 [historyManager](src/managers/history.ts) 来记录该操作的历史记录。
- [store.ts](src/store.ts) 的生命周期从打开软件开始一直到关闭软件，所以在组件卸载时，请手动把不需要的数据设为 `null`。

### 代码质量要求

- 请遵循 eslint 中的规则。你可以使用 `npm run lint` 检查你是否有 eslint 错误。如果有，应该是会有错误提示的。
- 实在无法避免的 eslint 错误，请使用 eslint 禁用注释、`ts-ignore`、忽略类型检查或 `as any` 等手段。
- 但只有在你 100% 确定代码不会有运行时错误的情况下，才能使用上述的方法，且应尽量避免。
- 如果你认为某些 eslint 规则不符合你的要求，请修改 [eslint 的配置文件](.eslintrc.js)。
- 下列规则均为 eslint 中没有配置的规则：
- 普通对象只能含有属性，不能含有方法。方法只能在类中定义。
- [src](src) 下的所有代码文件都应该是 Typescript 文件，Vue 组件中也应该使用 `<script setup lang="ts">`。不要出现 `.js` 文件。（当然，配置文件除外）
- 对于AI（人工智能）写的或请他人写的代码，请确保你理解了这段代码的意思再加进项目中。
- 对于较复杂难理解的逻辑，请添加注释，以确保他人能够理解你的代码。请尽量使用文档注释而不是普通注释，因为文档注释可以被你的代码编辑器识别，并显示在代码提示中。
- 在 [managers](src/managers/) 中，如果发现用户传入的参数有误时，不要直接 `return`。请使用 `throw new Error()` 抛出一个错误，并在 [`globalEventEmitter.on()`](src/eventEmitter.ts) 中使用 [`createCatchErrorByMessage()`](src/tools/catchError.ts) 包裹住函数以捕获错误，这样该错误会在界面的顶部显示为一个弹窗。
- 路径的拼接请使用 `path` 库中的 `path.join()` 方法，不要直接把字符串相加，也不要使用模板字符串拼接。
- Javascript 中，对负数做取模运算仍会返回负数。如果这不合你的预期，请使用 [`MathUtils.mod`](src/tools/mathUtils.ts) 函数来处理负数的取模运算。
- [managers\\main](src/managers/main) 是主线程的管理器，需要用 `export default new MyManager()` 导出单例；[managers\\renderer](src/managers/renderer) 是渲染线程的管理器，需要用 `export default class MyManager { ... }` 导出类。
- 不要在 [managers](src/managers) 中直接引用 [models](src/models) 的具体实现类来判断一个对象是否属于这个类。你可以引用 `isNoteLike()` 或者 `isEventLike()` 等函数。

### UI 组件规范

- 不要直接使用 ElButton 组件，而是使用封装后的 [MyButton 组件](src/myElements/MyButton.vue)。因为 ElButton 按钮按下后再按空格键，会触发点击事件，而空格键又是暂停和播放音乐的快捷键，导致用户按完按钮后想播放一下音乐，但实际又触发了一次按钮，影响体验。封装组件已避免该问题。
- 不要用 `v-model` 绑定非响应式数据。如果真的需要，请在组件内创建一个响应式数据，并手动同步响应式数据和非响应式数据。
- 遇到用户可能比较难懂的术语时，使用 [MyQuestionMark.vue](src/myElements/MyQuestionMark.vue) 的问号组件来进行解释。
- HTML 元素应该是语义化的。例如，我想添加一个一级标题，但 `<h1>` 元素的字号太大了，则应该调整 `<h1>` 元素的样式，而不是使用 `<h2>` 元素。
- 在 [myElements](src/myElements) 和 [panels](src/panels) 目录下的 Vue 组件中，`<style>` 必须使用 `scoped` 属性。

### 其他规则

其他的规则有可能在代码的注释中给出，请自行查看。

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

- 首先要遵循 [commit 通用规范](https://www.conventionalcommits.org/zh-hans/)。还有一些本项目特有的规范：
- 除特殊说明外，commit 信息遵循的格式与[文档格式](#文档格式)相同。
- commit 信息的第一行结尾不加标点符号。

### 功能分支命名规定

- `feature/xxx`：新功能
- `fix/xxx`：修复 bug
- `hotfix/xxx`：紧急修复 bug
- `refactor/xxx`：重构代码
- `docs/xxx`：文档修改
- `release/vA.B.C`：即将发布的新版本

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

## 开发建议

- 建议不要轻易升级或降级依赖，因为这可能会带来一些非常难解决的问题。
- 建议你在推送代码之前，先逐一检查你所做的修改是否符合规范，是否有可能引起其他 bug。

## 备注

本项目作者第一次发布开源项目，对于 Github 平台的开发逻辑还不是很懂，所以可能会有错误，欢迎在 Issue 中指正。

## 贡献者名单

就我自己一个人 ~~（那还写这么长的文档有啥用）~~
