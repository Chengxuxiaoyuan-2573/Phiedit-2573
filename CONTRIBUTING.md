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
4. 新建一个文件夹，点进文件夹中并右键，点击菜单中的 Git Bash Here，打开命令行窗口。
5. 输入以下命令，把项目克隆到本地（就是把项目下载下来的意思）。

    ```bash
    git clone https://github.com/你的用户名/Phiedit-2573.git
    ```

6. 双击运行根目录下的 [install.cmd](install.cmd) ，**直接回车**安装依赖。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm install` 或 `install` 安装依赖。
7. 双击运行根目录下的 [dev.cmd](dev.cmd) 启动项目。
   或者你也可以双击 [command.cmd](command.cmd)，输入 `npm run electron:dev` 或 `dev` 启动项目。
8. **开始你的开发**
9. 给你的功能起一个名字（详见[功能分支命名规则](#功能分支命名规则)），并基于 dev 分支创建功能分支（你开发完的代码会被推送到这个分支里）。
   如果你使用的是 Visual Studio Code（以下简称 VSCode），你也可以点击**界面左下角**的树枝形状的图标，点击“Create new branch”，输入你的功能名并回车。

    ```bash
    git checkout -b 你的功能名 dev
    ```

10. 提交代码并推送至你的 Fork 仓库（要推送到功能分支里）。

    ```bash
    # 第1步：把修改添加到暂存区
    git add .
    # 第2步：提交暂存区
    git commit -m "你的提交信息，对你做的修改进行描述"
    # 第3步：将修改推送到远程仓库
    git push origin 你的功能名
    ```

    如果你使用的是 VSCode，你也可以按下面的步骤操作：
    1. 点击**界面左侧的**树枝形状的图标，点击“Changes”右侧的加号图标（第1步）
    2. 在输入框内输入提交信息，然后点击“Commit”按钮（第2步）
    3. 再点击“Sync Changes”按钮（第3步）。

11. 根据 [Pull Request 审核标准](#pull-request-审核标准) 在 GitHub 上提交 Pull Request（就是向我申请，要把你的修改合并到 dev 分支里的意思）。
12. 等待审核。审核通过后，恭喜你，你已经给这个项目的开发做出了贡献！

## 文件目录结构解释

- [managers](src/managers): 管理器，用于实现各种功能，比如[复制粘贴](src/managers/clipboard.ts)，[鼠标框选](src/managers/mouse.ts)等等。
  [managers/render](src/managers/render) 是专门用来把内容渲染到 canvas 上的。
- [tools](src/tools): 各种工具，可跨项目通用。
- [models](src/models): 各种类，例如[谱面类](src/models/chart.ts)，[音符类](src/models/note.ts)，[事件类](src/models/event.ts)等等。
- [panels](src/panels): 侧边栏的 Vue 组件，显示在界面左右两侧。
- [myElements](src/myElements): 一些自定义的 Vue 组件，看起来与 Element Plus 的组件一模一样。有[输入框](src/myElements/MyInput.vue)，[下拉菜单](src/myElements/MySelect.vue)，[开关](src/myElements/MySwitch.vue)等等。
  输入框、下拉菜单等组件也分很多种，比如[拍数输入框](src/myElements/MyInputBeats.vue)，[数字输入框](src/myElements/MyInputNumber.vue)，[缓动下拉菜单](src/myElements/MySelectEasing.vue)等等，用来处理不同类型的输入数据。
  也含有一些 Element Plus 没有的组件，比如[计算器组件](src/myElements/MyCalculator.vue)。
- [views](src/views): 界面的各个页面，目前只有[首页](src/views/HomePage.vue)和[谱面编辑页](src/views/EditorPage.vue)两个页面。
- [eventEmitter.ts](src/eventEmitter.ts): 用于分发消息，实现发布订阅模式，联结各个 managers 和 Vue 组件之间的消息传递。
- [store.ts](src/store.ts): 数据集中管理，用于在各个 managers 和 Vue 组件中传递数据。
- [background.ts](src/background.ts): Electron 的主线程，用于处理一些文件操作，如添加谱面、打开谱面、删除谱面等。
- [preload.ts](src/preload.ts): Electron 的预加载线程，定义了 `window.electronAPI`，用于把主线程的操作转发给渲染线程。
- [main.ts](src/main.ts): Electron 的渲染线程。
- [router.ts](src/router.ts): 路由管理，用于定义路由。
- [constants.ts](src/constants.ts): 一些设置项，写死在代码里，用户不可更改。
- [Root.vue](src/views/Root.vue): 根组件，用于管理 [views](src/views) 下的页面。
<!-- 不知道为啥，eslint 非得规定组件名字必须要是多个单词，搞得我不能用 Root 做组件名了，还得用 MainRoot -->
- 其他文件: 含有一些比较杂乱的文件，正在考虑优化和重构。

（这些文件都是在src目录下的，你不会还在根目录下找文件吧？不会吧？）

## 注意事项

这些注意事项是本项目的开发规范，旨在防止代码成为“屎山代码”。
如果你发现现有的代码中有不合规定的地方，可以进行修改。

### 分层架构

项目遵循分层架构原则，文件的依赖等级从高到低分别是：

1. [main.ts](src/main.ts)
2. [Root.vue](src/Root.vue)
3. [views 下的文件](src/views/)
4. [panels 下的文件](src/panels/)
5. [managers 下的文件](src/managers/)、[store.ts](src/store.ts)
6. [constants.ts](src/constants.ts)、[eventEmitter.ts](src/eventEmitter.ts)
7. [* myElements 下的文件](src/myElements/)
8. [* models 下的文件](src/models/)
9. [* tools 下的文件](src/tools/)
10. 第三方库

文件只能依赖比该文件依赖等级更低的文件，标星号的还可以直接依赖同级的文件。
除了 [main.ts](src/main.ts) 以外，请不要在 Typescript 文件中直接引用 Vue 文件。
特殊说明：[managers 下的文件](src/managers/) 不能相互依赖，他们必须通过依赖 [store.ts](src/store.ts) 来间接依赖其他 managers（详见 [数据使用规范第 1 条](#数据使用规范)。

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
- 空格的格式规定如下：

| 字符种类 | 中文 | 英文 | 数字 | 全角标点 | 半角标点 | 特殊字符 |
| -------- | ---- | ---- | ---- | -------- | -------- | -------- |
| 中文     | ×    | √    | O    | ×        | √        | √        |
| 英文     | √    | √    | √    | ×        | √        | √        |
| 数字     | O    | √    | √    | ×        | √        | √        |
| 全角标点 | ×    | ×    | ×    | ×        | O        | ×        |
| 半角标点 | ×    | ×    | ×    | ×        | ×        | √        |
| 特殊字符 | √    | √    | √    | ×        | √        | O        |

注：
列表示前面的字符，行表示后面的字符；
√ 表示对应行列的两个字符之间要有空格，× 表示不要有空格，O 表示可有可无；

中文、英文以词为单位，按照对应的语言习惯空格即可；
数字仅包括阿拉伯数字，同一个数内部不空格；
全角标点仅包括全角的逗号、句号、问号、感叹号、冒号、分号、省略号、括号、引号、破折号、顿号、书名号；
半角标点仅包括半角的逗号、句点、问号、感叹号、冒号、分号、括号、引号、斜杠、反斜杠、波浪线、横杠；
特殊字符是包括数学符号在内的不属于前面五类的所有非语言字符；
多种字符混合，共同表达一个意思的词语，比如“B站”、“i18n”、“C++”等，中间不空格；
你要是记不住也不用担心，只要看看文档的其他部分是怎么写的，按照这个格式写就可以了。

- 结构完整的句子后面要加标点符号。
- 如果要使用简称，第一次出现时请用全称，并在括号中注明 “以下简称 xxx”。

### 开发流程规范

- 需要添加新功能时，请按以下步骤操作：
    1. 在 [managers](src/managers) 目录下新建一个文件，使用 `export default class 类名 extends Manager { ... }` 定义一个管理器类，实现相应的代码。
    2. 在 [eventEmitter.ts](src/eventEmitter.ts) 的 `EventMap` 接口中添加相应的事件名称。
    3. 在 [store.ts](src/store.ts) 中的 `managersMap` 中新增一个字段来存储新增的管理器。
    4. 可能需要在 [panels](src/panels) 下新建一个侧边栏的 Vue 组件，并实现相应的界面。添加了 Vue 组件后，请在 [RightPanelState](src/managers/state.ts) 中添加相应的字段。
    5. 为了能进入上一步的界面，需要在 [编辑器界面](src/views/EditorPage.vue) 中添加一个按钮。
    6. 在你需要的地方调用 [`globalEventEmitter.emit("你的事件名称", 参数)`](src/eventEmitter.ts)。
- 如果要添加设置项，请按以下步骤操作：
    1. 在 [`settings.ts`](src/managers/settings.ts) 的 `defaultSettings` 中添加相应的字段。
    2. 在 [`SettingsPanel.vue`](src/panels/SettingsPanel.vue) 中添加相应的设置项。
    3. 在对应的代码处引用 settingsManager，以应用该设置项。（详见 [数据使用规范第 1 条](#数据使用规范)）

### 数据使用规范

- 如果你要在 [managers](src/managers/) 中使用其他 managers 的数据或方法，请使用 [store.useManager()](src/store.ts) 方法。
- [store.useGlobalManager()](src/store.ts) 是用来获取全局 manager 的，生命周期为从打开软件到关闭软件，在退出谱面时不会被卸载，在进入谱面时也不会被重新加载。
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
- 不要在 [managers](src/managers) 中直接引用 [models](src/models) 的具体实现类来判断一个对象是否属于这个类。你可以引用 `isNoteLike()` 或者 `isEventLike()` 等函数。

### UI 组件规范

- 遇到用户可能比较难懂的术语时，使用 [MyQuestionMark.vue](src/myElements/MyQuestionMark.vue) 的问号组件来进行解释。
- HTML 元素应该是语义化的。例如，我想添加一个一级标题，但 `<h1>` 元素的字号太大了，则应该调整 `<h1>` 元素的样式，而不是使用 `<h2>` 元素。
- 请使用 `<em>` 元素表示需要强调的内容。[index.html](public/index.html) 中已经为 `<em>` 元素设置了样式。
- 在 [myElements](src/myElements) 和 [panels](src/panels) 目录下的 Vue 组件中，`<style>` 必须使用 `scoped` 属性。
- 不要直接使用 `ElButton` 组件，而是使用[封装后的 `MyButton` 组件](src/myElements/MyButton.vue)。因为 `ElButton` 按钮按下后再按空格键，会触发点击事件，而空格键又是暂停和播放音乐的快捷键，导致用户按完按钮后想播放一下音乐，但实际又触发了一次按钮，影响体验。封装组件已避免该问题。
- 不要用 `v-model` 绑定非响应式数据。如果真的需要，请在组件内创建一个响应式数据，并手动同步响应式数据和非响应式数据。

### 其他

- 建议不要轻易升级或降级依赖，因为这可能会带来一些非常难解决的问题。
- 其他的规则有可能在代码的注释中给出，请自行查看。

## Pull Request 审核标准

- Pull Request 的目标分支必须是 dev（开发分支），而非 master（主分支）。
- Pull Request 的内容规定：
  
  - 修改目的（如修复 Bug、新增功能，必选）
  - 测试情况（如是否通过 [build.cmd](build.cmd) 构建测试，必选）
  - 关联的 Issue 编号（以 # 开头，可选）

- Commit 的信息需遵守 [Commit 规范](https://www.conventionalcommits.org/zh-hans/)。
- 需通过 [build.cmd](build.cmd) 构建测试，编译后的安装包安装后可以正常运行，不能有软件打不开、功能失效等严重 bug，且必须达到修改目的。
- 需遵循本文件 [注意事项](#注意事项) 部分的规定。

<!-- 这些规则已被注释禁用
- 请在提交 Pull Request 前删除或注释掉所有的 `console.log()` 语句。
- 请在提交 Pull Request 前去掉所有未被使用的模块。
- 请在提交 Pull Request 前去掉所有未被使用的依赖。
-->

### 功能分支命名规则

- `feature/xxx`：新功能
- `fix/xxx`：修复 bug
- `hotfix/xxx`：紧急修复 bug
- `refactor/xxx`：重构代码
- `docs/xxx`：文档修改

## 备注

本项目作者第一次发布开源项目，对于 Github 平台的开发逻辑还不是很懂，所以可能会有错误，欢迎指正。
