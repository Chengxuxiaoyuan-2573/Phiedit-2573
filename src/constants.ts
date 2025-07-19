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
    static readonly baseEventLayerTypes = ["moveX", "moveY", "rotate", "alpha", "speed"] as const
    static readonly extendedEventLayerTypes = ["scaleX", "scaleY", "color", "paint", "text"] as const
    static readonly tips = [
        "按Q、W、E、R键分别切换为Tap、Drag、Flick、Hold音符",
        "按A、D键或方括号键切换判定线",
        "左键选择右键添加，想加长条直接一拉；左键拖头右键拖尾，不用按着Z键拖泥带水",
        "T、U、I键均可预览谱面，不过有些小区别",
        "Ctrl+V粘贴，Ctrl+B镜像粘贴",
        "Ctrl+D禁用事件、Ctrl+E启用事件，效果就像编程里的注释一样，禁用后的事件将不会再生效",
        "速度事件的单位是×120像素每秒，也就是说速度为10时每秒移动1200像素",
        "建议少用Linear缓动，多用Quad缓动，以免显得太僵硬",
        "有想法就大胆写出来，不要怕麻烦",
        "使用速度为0的速度事件会使音符被“绑”在判定线上，称为“绑线”，可以用来做出表演",
        ""
    ].map(str => "Tip: " + str)
}