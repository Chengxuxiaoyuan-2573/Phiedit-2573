import { Box } from "@/tools/box";
import { RGBAcolor, RGBcolor } from "@/tools/color";
import { Point } from "@/tools/mathUtils";

/* eslint-disable no-magic-numbers */

/** 一些常量，每个属性都必须是 static readonly 的 */
export default class Constants {
    /** canvas 的宽度 */
    static readonly CANVAS_WIDTH = 1350;

    /** canvas 的高度 */
    static readonly CANVAS_HEIGHT = 900;

    /** 横线竖线的宽度 */
    static readonly EDITOR_VIEW_LINE_WIDTH = 5;

    /** 整拍上横线的颜色 */
    static readonly EDITOR_VIEW_HORIZONTAL_MAIN_LINE_COLOR: RGBAcolor = [255, 255, 255, 0.2] as const;

    /** 横线的颜色 */
    static readonly EDITOR_VIEW_HORIZONTAL_LINE_COLOR: RGBAcolor = [255, 255, 255, 0.1] as const;

    /** 最中间那一条竖线的颜色 */
    static readonly EDITOR_VIEW_VERTICAL_MAIN_LINE_COLOR: RGBAcolor = [255, 255, 255, 0.2] as const;

    /** 竖线的颜色 */
    static readonly EDITOR_VIEW_VERTICAL_LINE_COLOR: RGBAcolor = [255, 255, 255, 0.1] as const;

    /** 边框颜色 */
    static readonly EDITOR_VIEW_BORDER_COLOR: RGBcolor = [255, 255, 0] as const;

    /** 背景颜色 */
    static readonly EDITOR_VIEW_BACKGROUND_COLOR: RGBcolor = [30, 30, 30] as const;

    /** 音符或事件被选中时显示的颜色 */
    static readonly EDITOR_VIEW_SELECTION_COLOR: RGBAcolor = [70, 100, 255, 0.6] as const;

    /** 音符或事件被鼠标悬停时显示的颜色 */
    static readonly EDITOR_VIEW_HOVER_COLOR: RGBAcolor = [70, 100, 255, 0.3] as const;

    /** 事件的颜色 */
    static readonly EDITOR_VIEW_EVENT_COLOR: RGBAcolor = [255, 255, 255, 0.6] as const;

    /** 被禁用的事件显示的颜色 */
    static readonly EDITOR_VIEW_EVENT_DISABLED_COLOR: RGBAcolor = [255, 0, 0, 0.6] as const;

    /** 事件两端所标的文字的颜色 */
    static readonly EDITOR_VIEW_EVENT_TEXT_COLOR: RGBcolor = [255, 165, 0] as const;

    /** 事件两端所标的文字的字体大小 */
    static readonly EDITOR_VIEW_EVENT_FONT_SIZE = 30;

    /** 事件两端所标的文字的阴影范围 */
    static readonly EDITOR_VIEW_EVENT_TEXT_SHADOW_BLUR = 10;

    /** 事件的缓动曲线的颜色 */
    static readonly EDITOR_VIEW_EVENT_LINE_COLOR: RGBcolor = [0, 205, 255] as const;

    /** 音符编辑区域的视口 */
    static readonly EDITOR_VIEW_NOTES_VIEWBOX = new Box(0, 800, 50, 650);

    /** 事件编辑区域的视口 */
    static readonly EDITOR_VIEW_EVENTS_VIEWBOX = new Box(0, 800, 700, 1300);

    /** 一个事件所占的宽度，单位为像素 */
    static readonly EDITOR_VIEW_EVENT_WIDTH = 80;

    /** 在用鼠标拖动事件的头尾时，可拖动的区域宽度为多少像素 */
    static readonly EDITOR_VIEW_SELECT_PADDING = 20;

    /** 显示事件的缓动曲线时，每多少秒画一个点 */
    static readonly EDITOR_VIEW_EVENT_LINE_PRECISION = 0.01;

    /** 在编辑器界面中，鼠标悬停下的虚拟音符（用于提示音符将要被放置的位置）的透明度 */
    static readonly EDITOR_VIEW_IMAGINARY_ALPHA = 0.5;

    /** 颜色事件的渐变条是事件宽度的多少倍 */
    static readonly EDITOR_VIEW_COLOR_EVENT_GRADIENT_WIDTH = 0.5;

    /** 界面底部第一行的 Y 坐标 */
    static readonly EDITOR_VIEW_FIRST_LINE_Y = 830;

    /** 界面底部第二行的 Y 坐标 */
    static readonly EDITOR_VIEW_SECOND_LINE_Y = 870;

    /** 拍数数字的字体大小 */
    static readonly EDITOR_VIEW_BEATS_NUMBER_FONT_SIZE = 20;

    /** 用于定义一些普通文字的字体大小 */

    /** 小号字体 25px */
    static readonly EDITOR_VIEW_FONT_SIZE_SMALL = 25;

    /** 中号字体 30px */
    static readonly EDITOR_VIEW_FONT_SIZE_MEDIUM = 30;

    /** 大号字体 35px */
    static readonly EDITOR_VIEW_FONT_SIZE_LARGE = 35;

    /** 连击数显示在界面的哪个位置 */
    static readonly CHART_VIEW_COMBO_NUMBER_POSITION: Point = { x: 0, y: 410 };

    /** 分数显示在界面的哪个位置 */
    static readonly CHART_VIEW_SCORE_POSITION: Point = { x: 520, y: 400 };

    /** 连击数的"COMBO"或"AUTOPLAY"的字样显示在界面的哪个位置 */
    static readonly CHART_VIEW_COMBO_POSITION: Point = { x: 0, y: 360 };

    /** 曲名显示在界面的哪个位置 */
    static readonly CHART_VIEW_NAME_POSITION: Point = { x: -640, y: -400 };

    /** 难度显示在界面的哪个位置 */
    static readonly CHART_VIEW_LEVEL_POSITION: Point = { x: 640, y: -400 };

    /** 暂停键显示在界面的哪个位置 */
    static readonly CHART_VIEW_PAUSE_POSITION: Point = { x: -620, y: 400 };

    /** 进度条显示在界面的哪个位置 */
    static readonly CHART_VIEW_BAR_POSITION: Point = { x: -675, y: 447 };

    /** 连击数字体大小 */
    static readonly CHART_VIEW_COMBO_NUMBER_SIZE = 70;

    /** "COMBO"或"AUTOPLAY"的字样字体大小 */
    static readonly CHART_VIEW_COMBO_SIZE = 30;

    /** 分数的字体大小 */
    static readonly CHART_VIEW_SCORE_SIZE = 50;

    /** 曲名的字体大小 */
    static readonly CHART_VIEW_NAME_SIZE = 35;

    /** 难度的字体大小 */
    static readonly CHART_VIEW_LEVEL_SIZE = 35;

    /** 连击数下面显示的字 */
    static readonly CHART_VIEW_COMBO_TEXT = "AUTOPLAY";

    /** 暂停按钮的宽度 */
    static readonly CHART_VIEW_PAUSE_WIDTH = 30;

    /** 暂停按钮的高度 */
    static readonly CHART_VIEW_PAUSE_HEIGHT = 40;

    /** 进度条的粗细 */
    static readonly CHART_VIEW_BAR_THICKNESS = 6;

    /** 连击数从多少开始显示 */
    static readonly CHART_VIEW_MIN_VISIBLE_COMBO = 3;

    /** 满分是多少 */
    static readonly CHART_VIEW_PERFECT_SCORE = 10 ** 6;

    /** 线号数字的字体大小 */
    static readonly CHART_VIEW_JUDGE_LINE_NUMBER_FONT_SIZE = 30;

    /** 线号离判定线锚点的距离 */
    static readonly CHART_VIEW_JUDGE_LINE_NUMBER_DISTANCE = 30;

    /** 被判定为 Bad 的音符是普通音符的透明度的多少倍 */
    static readonly CHART_VIEW_BAD_ALPHA = 0.5;

    /** 被判定为 Miss 的 Hold 音符是普通音符的透明度的多少倍 */
    static readonly CHART_VIEW_MISS_ALPHA = 0.5;

    /** Good 判定所获得的分数是 Perfect 的多少倍 */
    static readonly CHART_VIEW_GOOD_RATE = 0.65;

    /** Drag 接 Tap 的时间离多近才会报错，单位为秒 */
    static readonly ERROR_DRAG_TAP_THRESHOLD = 0.2;

    /** Flick 接 Tap 的时间离多近才会报错，单位为秒 */
    static readonly ERROR_FLICK_TAP_THRESHOLD = 0.2;

    /** 在右下角显示的Tips */
    static readonly tips = ([
        // 字字字字字字字字字字字字字字字字字字字字字字字字字字字字字字字，字数只能到箭头这里，不然会显示bug！↓
        "按右键添加音符，按Q、W、E、R键切换音符类型",
        "按A、D键或左右方括号键切换判定线",
        "左键直接拖拽可以框选音符和事件，Ctrl键+左键拖拽可以在保留原有已选中元素的情况下增加元素",
        "鼠标可以直接按住并拖拽音符或事件的头部和尾部",
        "按T、U、I键均可预览谱面，不过有些小区别，你可以自己尝试一下（其实和RPE的用法是一样的啦）",
        "Ctrl+V粘贴，Ctrl+B镜像粘贴，遇到重复段落时可以使用镜像粘贴而非普通粘贴，以免显得太单调",
        "Ctrl+D禁用事件、Ctrl+E启用事件，禁用后的事件将不会再生效",
        "Ctrl+方括号键可以把选中的音符和事件移到上一条或下一条判定线",
        "想把一组事件重复多次？用Ctrl+Shift+V连续粘贴",
        "速度事件的单位是×120像素每秒，也就是说速度为10时每秒移动1200像素",
        "暂不支持paint（画笔）事件",
        "有文字事件的判定线将不会显示判定线，会被文字代替",
        "建议少用Linear缓动，多用Quad缓动，以免显得太僵硬",
        "In缓动表示开始很慢，后来逐渐加速，Out缓动表示开始很快，后来逐渐减速，IO则表示先加速后减速",
        "缓动类型按常用程度排序大概是Quad、Sine、Back、Expo、Elastic、Linear、Bounce等等",
        "你可以在事件的缓动下拉菜单里直接输入缓动的编号或名称以快速查找缓动类型",
        "同一事件层上的事件不允许重叠，可在谱面纠错中检查",
        "谱面纠错中错误信息的颜色代表其重要程度，红色为Error，橙色为Warning，蓝色为Info",
        "断层事件就是前一个事件结束值不等于后一个事件开始值的连续的两个事件，能让判定线出现瞬移的效果",
        "有想法就大胆写出来，不要怕麻烦，如果不会写，可以自己多想想，或者问一问圈子内的大佬",
        "使用速度为0的速度事件会使音符被“绑”在判定线上，称为“绑线”，可以用来做出好看的表演",
        "把一条判定线上的音符分到多条判定线上并加上不同的事件，称为“拆线”，如果你觉得谱面缺少表演可以试一试",
        "如果觉得谱面表现力不够，可以添加一些表演，让判定线和音符跟着音乐的节奏移动、旋转、闪烁",
        "想做出谱面倒退的效果？尝试使用值为负数的速度事件吧，不过在音符落下之前记得调回正数哦~",
        "想做出隐形音符？可以把音符透明度改为0，或者把速度改为9999（快到看不清）就可以啦！",
        "想做出闪烁的效果？让透明度事件在-1和255之间反复横跳就可以啦~",
        "个人观点，建议用交互和楼梯代替纵连，因为纵连比较卡手且难读谱",
        "利用垂直判定可以写出很酷炫的谱面！",
        "Drag或Flick音符快速旋转，快到一定程度时，可以实现（伪）全屏判定",
        "采音就是让你的音符卡上音乐的节奏，是最基本的写谱原则，如果不确定采音是否正确，放慢倍速仔细听一听~",
        "排键就是调整音符的排列，使其更美观且手感更好，好的排键也能使谱面更有表现力",
        "初见杀就是第一次游玩时容易反应不过来漏键的配置，写谱时应避免过多的初见杀",
        "引导就是谱面解法的提示，能够减少或避免初见杀，包括判定线引导、假音符引导、文字引导等等",
        "落在判定线上的音符居然不在这条判定线上？！到其他判定线上找找吧，该音符可能被绑线或拆线了",
        "音符莫名隐形？检查判定线透明度是否为负数，检查判定线速度是否正常，检查音符透明度是否为0",
        "慎用双指多指来回切换的配置，否则游玩时容易反应不过来，建议做好引导",
        "定数就是标难度的意思，给自己的谱面定数时建议找一些官谱做对照",
        "建议先去游玩一些官谱或自制谱，对谱面的理解程度足够高了，再开始上手写谱，否则大概率会写出一坨史",
        "有时一些最简单的表演也能让你的谱面有锦上添花的效果，快去试试吧！",
        "绑线的音符在被判定时不要让判定线瞬移，否则会有概率判定不上，出现bug",
        "建议透明度事件不要非0即255，用一些中间值会更有层次感，效果可能会更好",
        "判定线特效太花，影响游玩体验？除了调低判定线透明度以外，试试用Ctrl+D禁用一些事件吧！",
        "学过音乐、美术等的人可能会更有天赋写谱，写谱也是一种艺术！",
        "写完谱看看谱面纠错，可以避免游玩时出现一些稀奇古怪的bug",
        "如果FPS太低，可能是音符和事件过多引起的",
        "不同的缓动可以用来表现不同的音色，可以多尝试一下以达到最好的效果",
        "个人建议主判定线放在Y坐标为-250的位置比较好",
        "如果判定线有父线，父线编号会显示在预览界面判定线编号后面的括号里",
        "Ctrl+Shift+V可以连续粘贴，但不会影响剪切板",
        "设置判定线名称可能会帮助你快速找到想要找的那条判定线",
        "“谱师是音乐的翻译家”",
        "“谱面”不是“铺面”，不要打错字！",
        "软件完全由一人开发完成！花了差不多一年的时间，希望你喜欢！",
        "DABC ABCD ABCA DBAC DABC ABCD BAAA BDAD DABC ABCD ABCA DBAC DABC ABCD BAAA BDAD",
        "某地铁迷听到谱师们在聊1号线2号线，以为找到同圈人了",
        "啊→啊→阿姨↑阿姨↑哦↓啊↑哦↓嗯→",
        "/* 棍母 */",
        "本软件完全免费，请勿用于商业用途！",
        "这个软件的名字还没想好，Phiedit 2573只是一个临时的名字，现在正在征求取名意见",
        "没灵感写不下去了？不如上B站看看别人写的谱吧",
        "除了判定线表演，不如再加一些音符表演吧！",
        "“Phigros里没有曲线，就像Minecraft里没有圆一样”（这时我缓缓掏出了判定线贴图）",
        "有问题欢迎反馈，点左下角链接并粘贴到浏览器，可以给我发私信，或者在我的视频底下发评论",
        "误删了谱面？进入Appdata\\Roaming\\phiedit2573\\charts，复制文件夹名，并添加到list.json中",
        "本软件不含任何病毒！请忽略杀毒软件关于本软件的一切提示！",
    ] as const).map(str => `Tip: ${str}` as const);
}