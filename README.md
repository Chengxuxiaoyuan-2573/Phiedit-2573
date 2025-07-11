# PhiEdit 2573（Made by [@程序小袁_2573](https://space.bilibili.com/522248560)）


## 搭建环境

### 安装依赖

双击运行`install.cmd`，**直接按回车键**，安装所有需要的依赖
如果你要添加依赖，双击运行`install.cmd`后输入添加的依赖名称，然后按回车键

### 开发环境下运行

双击运行`dev.cmd`，等待出现窗口
如果在开发过程中安装或删除了依赖，或者修改了根目录下的配置文件（比如`vue.config.js`），你需要把窗口关闭，重新运行`dev.cmd`以应用你的修改

### 编译为生产环境

双击运行 `build.cmd`，然后将生成的文件部署到你的服务器或托管服务
编译后的文件通常位于 `dist-electron` 目录中

<!-- 
### 测试生产环境代码（可选，需要python）
首先[安装python环境](https://www.python.org)，然后安装flask：
```bash
pip install flask
```

新建一个文件夹，名字任意，里面新建一个`main.py`文件，输入以下内容：
```python
import os
from flask import *
app = Flask(__name__) # 创建一个Flask应用
app.config['SECRET_KEY'] = 'Secret_Key*' # 密钥，可以自定义

# 访问主页面
@app.route("/")
def index():
    # 返回主页面
    return render_template("index.html")

# 访问资源文件
@app.route("/<path:subpath>")
def a(subpath):
    # 资源不存在
    if not os.path.exists("static/"+subpath):
        abort(404)
    # 返回对应的资源文件
    return send_from_directory("static", subpath)

# 运行服务器
app.run(host='0.0.0.0', port=5000)
```
再在根目录下新建两个文件夹`templates`和`static`，把`dist`文件夹下的`index.html`文件放到`templates`文件夹下，其余文件都放到`static`文件夹下。
运行`main.py`文件并稍等服务器启动，在浏览器中访问`http://localhost:5000`，就可以看到效果了。
-->

## 创作原因

### RPE的缺陷
- RPE的bug太多，有时候不知道干了什么就崩了，结果还没保存就直接没了
- RPE学习成本太高，就那个什么数值下界数值上界扰动根本看不懂
- RPE缺少很多方便的功能，比如将一条判定线的note一键转移到另一条判定线，一键绑线拆线等等

### 相比于RPE的优势
- 稳定性高，不会出现各种奇怪的bug
- 增加了一些更方便的功能

## 开发注意事项

### 文件目录结构解释
- `managers\`: 管理器，用于实现各种功能，比如复制粘贴，鼠标框选等等
- `tools\`: 各种工具（可通用）
- `models\`: 各种类，例如谱面类，音符类，事件类等等
- `editorComponents\`: 用于编辑谱面的vue组件，显示在界面右侧
- `myElements\`: 一些自定义的vue组件
- `views\`: 界面的各个页面，目前只有`HomePage.vue`和`EditorPage.vue`两个页面
- `eventEmitter.ts`: 用于分发事件，实现发布订阅模式（一般都是一些用户操作的事件，比如按下鼠标）
- `store.ts`: 数据集中管理，用于在各个managers和vue组件中传递数据
- `background.ts`: Electron的主线程，用于处理一些文件操作，如添加谱面、打开谱面、删除谱面等
- `preload.ts`: Electron的预加载线程，定义了window.electronAPI，用于把添加谱面、打开谱面、删除谱面等操作转发给渲染线程
- `main.ts`: Electron的渲染线程
- 其他文件: 都是一些比较杂乱的文件，正在考虑优化

（这些文件都是在src目录下的，你不会还在根目录下找文件吧？不会吧？）


## 一些未修复的bug和未实现的功能
- 不能编辑特殊事件，但显示谱面是支持特殊事件的
- 我打算以后给这个项目增加游玩谱面的功能，但这不是主要功能，所以没做
- 性能差，FPS经常掉到30以下
- 向后拖进度条会发出炸裂的打击音效
- 不支持判定线的`bpmfactor`、`alphaControl`、`posControl`、`sizeControl`、`skewControl`、`yControl`，因为不清楚这几个属性的含义
- 不支持资源包的`holdCompact`
- 还有一些未发现的bug，如果你发现了bug或者有好的建议，请在issue中提出！