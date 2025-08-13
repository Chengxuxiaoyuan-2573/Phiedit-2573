import { Box } from "@/tools/box"
import { RGBAcolor, RGBcolor } from "@/tools/color"

export default class Constants {
    static readonly lineWidth = 5
    static readonly horzionalMainLineColor: RGBAcolor = [255, 255, 255, 0.5] as const
    static readonly horzionalLineColor: RGBAcolor = [255, 255, 255, 0.2] as const
    static readonly verticalMainLineColor: RGBAcolor = [255, 255, 255, 0.5] as const
    static readonly verticalLineColor: RGBAcolor = [255, 255, 255, 0.2] as const
    static readonly borderColor: RGBcolor = [255, 255, 0] as const
    static readonly backgroundColor: RGBcolor = [30, 30, 30] as const
    static readonly selectionColor: RGBAcolor = [70, 100, 255, 0.6] as const
    static readonly hoverColor: RGBAcolor = [70, 100, 255, 0.3] as const
    static readonly eventColor: RGBAcolor = [255, 255, 255, 0.6] as const
    static readonly eventDisabledColor: RGBAcolor = [255, 0, 0, 0.6] as const
    static readonly eventNumberColor: RGBcolor = [255, 165, 0] as const
    static readonly eventLineColor: RGBcolor = [0, 205, 255] as const
    static readonly notesViewBox = new Box(0, 900, 50, 650)
    static readonly eventsViewBox = new Box(0, 900, 700, 1300)
    static readonly eventWidth = 80
    static readonly selectPadding = 20
    static readonly eventLinePrecision = 0.01
    static readonly tips = ([
        // 字字字字字字字字字字字字字字字字字字字字字字字字字字字字字字字，字数只能到箭头这里，不然会显示bug！↓
        "按右键添加音符，按Q、W、E、R键切换音符类型",
        "按A、D键或左右方括号键切换判定线",
        "左键直接拖拽可以框选音符和事件，Ctrl键+左键拖拽可以在保留原有已选中元素的情况下增加元素",
        "鼠标左键和右键分别可以拖拽已选中的音符或事件的头部和尾部",
        "按T、U、I键均可预览谱面，不过有些小区别，你可以自己尝试一下（其实和RPE的用法是一样的啦）",
        "Ctrl+V粘贴，Ctrl+B镜像粘贴，遇到重复段落时可以左右或上下镜像，以免显得太单调",
        "Ctrl+D禁用事件、Ctrl+E启用事件，禁用后的事件将不会再生效",
        "Ctrl+方括号键可以把选中的音符和事件移到上一条或下一条判定线",
        "对于音符，Alt+A可以镜像音符的X坐标；对于事件，Alt+A可以把值变为相反数，Alt+S可以交换起始和结束值",
        "速度事件的单位是×120像素每秒，也就是说速度为10时每秒移动1200像素（可在“设置”中修改）",
        "建议少用Linear缓动，多用Quad缓动，以免显得太僵硬",
        "In缓动表示开始很慢，后来逐渐加速，Out缓动表示开始很快，后来逐渐减速，IO则表示先加速后减速",
        "有想法就大胆写出来，不要怕麻烦",
        "使用速度为0的速度事件会使音符被“绑”在判定线上，称为“绑线”，可以用来做出好看的表演",
        "把一条判定线上的音符分到多条判定线上并加上不同的事件，称为“拆线”，如果你觉得谱面有些单调可以试一试",
        "如果觉得谱面表现力不够，可以添加一些表演，让判定线和音符跟着音乐的节奏移动、旋转、闪烁",
        "想做出谱面倒退的效果？尝试使用值为负数的速度事件吧，不过在音符落下之前记得调回正数哦~",
        "想做出隐形音符？可以把音符透明度改为0，或者把速度改为9999（快到看不清）就可以啦！",
        "想做出闪烁的效果？让透明度事件在-1和255之间反复横跳就可以啦~",
        "不同的缓动可以用来表现不同的音色，可以多尝试一下以达到最好的效果",
        "“谱师是音乐的翻译家”",
        "“谱面”不是“铺面”，不要打错字！",
        "软件完全由一人开发完成！花了差不多一年的时间，希望你喜欢！",
        "DABC ABCD ABCA DBAC DABC ABCD BAAA BDAD DABC ABCD ABCA DBAC DABC ABCD BAAA BDAD",
        "某地铁迷听到两个谱师在聊1号线2号线，以为是同圈人",
        "啊→啊→阿姨↑阿姨↑哦↓啊↑哦↓嗯→",
        "本软件完全免费，请勿用于商业用途！",
        "这个软件的名字还没想好，Phiedit 2573只是一个临时的名字，现在正在征求取名意见",
        "没灵感写不下去了？不如上B站看看别人写的谱吧",
        "除了判定线表演，不如再加一些音符表演吧！",
        "“Phigros里没有曲线，就像Minecraft里没有圆一样”（这时我缓缓掏出了判定线贴图）",
        "有问题欢迎反馈，点左下角链接并粘贴到浏览器，可以给我发私信，或者在我的视频底下发评论",
        "暂不支持故事板和UI绑定",
        "为了防止误删，删除谱面不会删除文件，请自行删除 AppData\\Roaming\\phiedit2573\\charts 下对应的文件夹",
        "本软件不含任何病毒！请忽略杀毒软件的一切提示！"
    ] as const).map(str => `Tip: ${str}` as const)
}