# PhiEdit 2573 Online（Made by [@程序小袁_2573](https://space.bilibili.com/522248560)）


## 搭建环境

### 安装依赖

双击运行`install.cmd`，输入要安装的包，然后按回车键。
如果你要安装所有依赖，不用输入任何内容，直接按回车键即可安装所有依赖。

### 运行本地开发服务器

双击运行`dev.cmd`，等待服务器启动，在浏览器中访问`http://localhost:8080`。
如果在开发过程中安装或删除了依赖，或者修改了根目录下的配置文件（比如`vue.config.js`），你需要重新运行`dev.cmd`以应用你的修改。

### 编译为生产环境

双击运行 `build.cmd`，然后将生成的文件部署到你的服务器或托管服务。
编译后的文件通常位于 `dist` 目录中。

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


## 创作原因

### RPE的缺陷
- RPE的bug太多，有时候不知道干了什么就崩了，结果还没保存就直接没了
- RPE学习成本太高，就那个什么数值下界数值上界扰动根本看不懂
- RPE缺少很多方便的功能，比如将一条判定线的note一键转移到另一条判定线

### 相比于RPE的优势
- 界面简单，操作方便，不会出现各种奇怪的bug
- 增加了更方便操作的批量编辑功能，还有自由度极高的代码快速编辑

## 开发注意事项

### 文件目录结构解释
- `chartRenderer.ts`: 有一个`ChartRenderer`类，用于将谱面渲染到canvas上
- `editor.ts`: 有一个`Editor`类，用于编辑谱面
- `eventEmitter.ts`: 用于分发事件，实现发布订阅模式（一般都是一些用户操作的事件，比如按下鼠标）
- `tools\`: 各种工具
- `classes\`: 各种类（一般都与实际业务相关）
- `editorComponents\`: 用于编辑谱面的vue组件，显示在界面右侧
- `myElements\`: 一些自定义的vue组件

### 文件依赖关系（从高到低排序）
- `src`目录下第一层的文件，如`main.ts`、`App.vue`
- `editorComponents`下的文件，是被`App.vue`引入的
- `myElements`下的文件，是一些自定义的vue组件
- `classes`下的文件，是一些业务逻辑的类，被界面所引入
- `tools`下的文件，是工具，跟业务逻辑没啥关系了
- `assets`下的文件，是静态资源，如图片、音频等
**为避免循环依赖和耦合，开发时请不要下层文件引入上层文件！**


## 一些未修复的bug和未实现的功能（只列出部分）
- 不能编辑特殊事件，但显示谱面是支持特殊事件的
- 我打算以后给这个项目增加游玩谱面功能，但这不是主要功能，所以没做（这属于是把制谱器和模拟器合在一起了）
- 向后拖进度条会发出炸裂的打击音效（懒得修了）
- 假note碰到判定线不会立即消失，而是穿过判定线并缓慢消失，感觉这样也挺好，所以没修
- 不支持判定线的`bpmfactor`、`alphaControl`、`posControl`、`sizeControl`、`skewControl`、`yControl`，因为不清楚这几个属性的含义
- 不支持资源包的`holdCompact`，就是懒得支持
