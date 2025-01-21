# PhiEdit 2573 Online

## 搭建环境

### 安装依赖

`install.cmd`

### 运行开发服务器

`dev.cmd`

### 编译为生产环境

`build.cmd`

## 关于作者 [@程序小袁_2573](https://space.bilibili.com/522248560)  

### 我名字里面那个2573其实是这么来的
好几年前的一天，我翻开了一本关于数学思维的书
- 我翻到了某一页，上面有一个思维游戏：
- **把你的出生日期和你的年龄先这样算，再那样算，最后再这样算，会得到一个数，你把这个数字告诉魔术师，魔术师就能知道你的出生日期和年龄。**
- 具体算法我就不说了，但是我按照这个算法算了一遍之后，得到的数字就是22573
- 我那时还小，不懂得这个游戏背后的原理，所以我就去看了答案
- 答案说，**魔术师用你算出来的数字算一下之后，最后两位就是你的年龄，前面的三位就是出生日期**
- 我算了一下，居然还真是！在现在看来，这不过是一个简单的方程问题而已，但我那时候那么小哪懂啊，我就觉得，好神奇啊，这个数字是不是我的幸运数字啊，于是我就拿这个数做了网名
- 考虑到五位数22573念起来不顺口，我还天真地去掉了一位数，变成了2573（正好跟3473的后两位撞名了，但其实我跟3473一点关系没有）

## 关于 PhiEdit 2573 Online

### 创作原因
- RPE的bug太多，有时候不知道干什么就崩了
- RPE学习成本太高，就那个什么数值下界数值上界扰动根本看不懂
- RPE缺少很多方便的功能，比如将一条判定线的note一键转移到另一条判定线

### `src/ts` 目录中各个 Typescript 文件的作用

- `render.ts`: 里面有`render`函数，可以将谱面或编辑器UI界面的某一帧显示到canvas上，也是最核心的功能
- `store.ts`: Vuex的数据库，state存数据，mutations改数据
- `eventListeners.ts`: 监听事件，用户点击之后需要处理的业务逻辑都在这里，是一个用来辅助`App.vue`的文件
- `tools.ts`: 里面有很多杂七杂八的工具函数，应该都能看懂啥意思
- `typeCheck.ts`: 一个类型检查的小功能，可以考虑合并到`tools.ts`里
- `components`: 里面有一些函数式组件
    - `loadingText.ts`: Loading文字，`setLoadingText`设置Loading文字，`hideLoadingText`隐藏Loading文字
- `classes`: 里面有很多类
    - `chart.ts`: 谱面
    - `judgeline.ts`: 判定线
    - `note.ts`: 音符
      `highlight`: 是否有双押提示
      `hitSeconds`: 这个note在音乐开始的第几秒被实际击打了（还没击打就是`undefined`，现在只有autoplay模式，所以击打后`hitSeconds`恒等于note开始的秒数）
    - `beats.ts`: 就是那个表示拍数的三元组，用带分数表示拍数
    - `eventLayer.ts`: 事件层，包括普通事件层和特殊事件层
    - `event.ts`: 事件（`NumberEvent`，`ColorEvent`，`TextEvent`）
      除了颜色事件是`ColorEvent`，文字事件是`TextEvent`，其他事件都是`NumberEvent`
    - `chartPackage.ts`: 谱面包，包括谱面、音乐、曲绘、以及可有可无的判定线贴图
    - `resourcePackage.ts`: 资源包，包括note的皮肤、音效和打击特效，还有一大堆配置属性，里面有几个不支持的
    ---
    - `EditableImage.ts`: 可以对图片进行旋转、切割、缩放、染色等操作
    - `taskQueue.ts`: 任务队列，可以按优先级执行任务
      这个类的意义是为了在`render.ts`中不让Hold挡住其他note，导致其他note不可见
      用这个就能控制canvas上元素的叠放顺序——背景 < 判定线（按zOrder叠放） < Hold < Drag < Tap < Flick < 打击特效
      如果有更好的方法可以试着修改
    - `box.ts`: 盒子类，为了方便canvas上的碰撞检测写的
    - `classExtends.ts`: 给JavaScript自带的类加功能，现只有`FileReaderExtends`一个类，用来读取文件（估计以后也只会有这一个了）

### 一些未修复的bug和未实现的功能（按重要程度排序，只列出部分）
- 编辑谱面的功能很不完全
- 我打算以后给这个项目做成一个制谱器、谱面播放器、Phigros模拟器三合一的项目
- 向后拖进度条会发出炸裂的打击音效
- 不支持判定线的bpmfactor、alphaControl、posControl、sizeControl、skewControl、yControl
- 不支持资源包的holdCompact

## 其他

### 如果你们也要做Phigros制谱器，给你们的提示：
- 五字母四数字的模拟器是这么判断你导入的是RPE文件还是官谱文件的：
  他会看你的文件有没有`META.RPEVersion`属性，如果有就是RPE文件，如果没有就是官谱文件，所以你的制谱器要是导出格式是RPE格式，就一定要加上`META.RPEVersion`属性！瞎填都可以，但不能不填！否则就兼容不了五字母四数字的模拟器了！
  