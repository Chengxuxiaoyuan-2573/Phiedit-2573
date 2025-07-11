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
    static readonly eventNumberColor: RGBcolor = [255, 165, 0] as const
    static readonly eventLineColor: RGBcolor = [0, 205, 255] as const
    static readonly notesViewBox = new Box(0, 900, 50, 650)
    static readonly eventsViewBox = new Box(0, 900, 700, 1300)
    static readonly eventWidth = 80
    static readonly selectPadding = 20
    static readonly eventLinePrecision = 0.01
    static readonly baseEventLayerTracks = ["moveX", "moveY", "rotate", "alpha", "speed"] as const
    static readonly extendedEventLayerTracks = ["scaleX", "scaleY", "color", "paint", "text"] as const
}