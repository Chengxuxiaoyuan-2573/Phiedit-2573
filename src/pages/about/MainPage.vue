<template>
    <div class="content">
        <h1 id="phiedit-2573-online">
            PhiEdit 2573 Online
        </h1>
        <h2 id="搭建环境">
            搭建环境
        </h2>
        <h3 id="安装依赖">
            安装依赖
        </h3>
        <pre><code>npm install</code></pre>
        <h3 id="运行开发服务器">
            运行开发服务器
        </h3>
        <pre><code>npm run serve</code></pre>
        <h3 id="编译为生产环境">
            编译为生产环境
        </h3>
        <pre><code>npm run build</code></pre>
        <h2 id="关于作者">
            关于作者
        </h2>
        <h3 id="程序小袁_2573-的bilibili个人空间httpsspacebilibilicom522248560">
            <a href="https://space.bilibili.com/522248560">@程序小袁_2573 的bilibili个人空间</a>
        </h3>
        <h3 id="我名字里面那个2573其实是这么来的">
            我名字里面那个2573其实是这么来的
        </h3>
        <ul>
            <li>好几年前的一天，我翻开了一本关于数学思维的书</li>
            <li>我翻到了某一页，上面有一个思维游戏：</li>
            <li>“把你的出生日期和你的年龄先这样，再那样，最后再这样算……最后会得到一个数，你把这个数字告诉魔术师，魔术师就能知道你的出生日期和年龄。”</li>
            <li>具体算法我就不说了，免得泄露个人隐私，但是我按照这个算法算了一遍之后，得到的数字就是22573</li>
            <li>我那时还小，不懂得这个游戏背后的原理，所以我就去看了答案</li>
            <li>答案说，魔术师用你算出来的数字只做一步运算之后，最后两位就是你的年龄，前面的三位就是出生日期</li>
            <li>我算了一下，居然还真是</li>
            <li>我就觉得，好神奇啊，这个数字是不是我的幸运数字啊，于是就拿这个数做了网名</li>
            <li>考虑到五位数22573念起来不顺口，我还天真地去掉了一位数，变成了2573</li>
        </ul>
        <h2 id="关于-phiedit-2573-online">
            关于 PhiEdit 2573 Online
        </h2>
        <h3 id="创作原因">
            创作原因
        </h3>
        <ul>
            <li>RPE的bug太多，有时候不知道干什么就崩了</li>
            <li>RPE学习成本太高，就那个什么数值下界数值上界扰动根本看不懂</li>
            <li>RPE缺少很多方便的功能，比如将一条判定线的note一键转移到另一条判定线</li>
            <li>当然想要解决这些问题的话还只是梦想，现在还啥也不是呢</li>
        </ul>
        <h3 id="srcts-目录中各个-typescript-文件的作用">
            <code>src/ts</code> 目录中各个 Typescript 文件的作用
        </h3>
        <ul>
            <li><code>render.ts</code>: 里面有<code>renderChart</code>函数，可以将谱面的某一帧显示到canvas上。</li>
            <li><code>editor.ts</code>: 里面有<code>renderEditorUI</code>函数，可以将某一帧时的编辑器界面显示到canvas上。</li>
            <li><code>tools.ts</code>: 里面有很多杂七杂八的工具函数，应该都能看懂啥意思</li>
            <li><code>typeDefinitions.ts</code>: 一些类型，正在考虑把它们都转换为class</li>
            <li><code>typeCheck.ts</code>: 一个类型检查的小功能</li>
            <li>
                <code>easing.ts</code>: 缓动函数，至于为什么要单独用一个文件，那可就说来话长了……
                <ul>
                    <li>我2024年暑假时刚开始做这个项目的时候，因为不知道缓动函数的表达式，没法写出来代码，就卡住不知道怎么办了</li>
                    <li>然后我就想不是有李纯真模拟器吗，他能做出来肯定知道，于是我就开始扒他的代码</li>
                    <li>
                        关键是他的代码都是经过加密的啊，我也不知道那些像<code>e</code>、<code>t</code>、<code>s</code>等等的变量是啥意思，也还是找了半天没找到，然后又卡住了
                    </li>
                    <li>然后我不是想有文心一言吗，用AI肯定能解释出来那些变量的含义</li>
                    <li>诶嘿然后我就真解出来了，他的代码里面有一个神秘的<code>h</code>函数，我一看真是那个缓动函数</li>
                    <li>然后我就赶紧复制过来了，心中暗自窃喜，终于知道了</li>
                </ul>
            </li>
            <li>
                <code>classes</code>: 里面有很多类
                大多数是谱面以及其中的判定线、note、事件、事件层级类：
                <ul>
                    <li>
                        <code>chart.ts</code>: 谱面
                        <ul>
                            <li><code>highlighted</code>：谱面是否已经标过双押提示</li>
                        </ul>
                    </li>
                    <li>
                        <code>judgeline.ts</code>: 判定线
                        <ul>
                            <li>一大堆属性不支持，爱谁支持谁支持去吧</li>
                        </ul>
                    </li>
                    <li>
                        <code>note.ts</code>: 音符
                        <ul>
                            <li><code>highlight</code>: 是否有双押提示</li>
                            <li><code>hitSeconds</code>: 这个note在音乐开始的第几秒被实际击打了（还没击打就是<code>undefined</code>）</li>
                            <li>
                                <code>_startSecondsCache</code>，<code>_endSecondsCache</code>:
                                这个note的开始秒数和结束秒数缓存（没有使用，用了会有bug，不用影响不大）
                            </li>
                        </ul>
                    </li>
                    <li><code>eventLayer.ts</code>: 事件层，包括普通事件层和特殊事件层</li>
                    <li>
                        <code>event.ts</code>:
                        三种事件（普通五大事件都是<code>NumberEvent</code>，特殊五大事件中颜色事件是<code>ColorEvent</code>，文字事件是<code>TextEvent</code>，其他都是<code>NumberEvent</code>）
                        <ul>
                            <li>
                                <code>_startSecondsCache</code>，<code>_endSecondsCache</code>:
                                这个事件的开始秒数和结束秒数缓存（没有使用，用了会有bug，不用影响不大）
                            </li>
                        </ul>
                    </li>
                    <li><code>chartPackage.ts</code>: 谱面包，包括谱面、音乐、曲绘、以及可有可无的判定线贴图</li>
                    <li><code>resourcePackage.ts</code>: 资源包，包括note的皮肤、音效和打击特效，还有一大堆配置，里面有几个不支持</li>
                    <li>上述所有类为方便都各有一个接口，名字是字母I后面拼接上类名</li>
                </ul>
                一小部分是为了实现某些功能而定义的类，比如：
                <ul>
                    <li><code>EditableImage.ts</code>: 可以对图片进行旋转、切割、缩放、染色等操作</li>
                    <li>
                        <code>taskQueue.ts</code>: 任务队列，可以按优先级执行任务
                        这个类的意义是为了在<code>render.ts</code>中不让Hold挡住其他note，导致其他note不可见
                        用这个就能控制canvas上元素的叠放顺序：背景 &lt; 判定线 &lt; Hold &lt; Drag &lt; Tap &lt; Flick &lt; 打击特效
                    </li>
                    <li><code>box.ts</code>: 盒子类，为了方便canvas上的碰撞检测写的</li>
                    <li><code>classExtends.ts</code>: 给JavaScript自带的类加功能</li>
                </ul>
            </li>
        </ul>
        <h3 id="一些未修复的bug和未实现的功能">
            一些未修复的bug和未实现的功能
        </h3>
        <ul>
            <li>导出的谱面文件没法在李纯真模拟器里播放</li>
            <li>编辑谱面的功能很不完全，只有一个编辑note的功能，没有编辑事件、设置BPM等功能</li>
            <li>我打算以后给这个项目做成一个制谱器、谱面播放器、Phigros模拟器三合一的项目</li>
            <li>向后拖进度条会发出炸裂的打击音效，还有很大概率出现good和bad，因为<code>render.ts</code>里没有检测时间的增加是由于播放音乐还是由于拖动进度条导致的</li>
            <li>谱面上面没有UI控件</li>
            <li>调快倍速后Autoplay会爆good，甚至bad（bad没特效，因为没写）</li>
            <li>假note碰到判定线不会立即消失，而会穿过去，像miss了一样</li>
            <li>判定线一直是白的</li>
            <li>不支持判定线的bpmfactor、alphaControl、posControl、sizeControl、skewControl、yControl，真想不到有啥用</li>
            <li>不支持资源包的holdRepeat和holdCompact</li>
        </ul>
        <h3 id="关于-srcpages-的使用方法">
            关于 <code>src/pages</code> 的使用方法
        </h3>
        <ul>
            <li>src/pages下面的每个目录是一个页面，<code>MainPage.vue</code>是要放到vue-router里面的主组件，要建子组件就往同一目录下面加就可以了</li>
            <li>index: 主页面，与RPE页面相似</li>
            <li>about: 关于页面，就是这个页面（README.md中内容相同）</li>
            <li>document: 文档页面，为了解释清楚RPE谱面中的属性，我之前也一直不知道那些属性是啥意思，为了让你们快速知道写的这个页面</li>
        </ul>
    </div>
</template>
<script setup>
</script>
