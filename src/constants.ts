/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Box } from "@/tools/box";
import { RGBAcolor, RGBcolor } from "@/tools/color";
import { Point } from "@/tools/mathUtils";

/* eslint-disable no-magic-numbers */

/** 一些常量，每个属性都必须是 static readonly 的 */
export default class Constants {
    /** 编码格式 */
    static readonly ENCODING = "utf-8";

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

    /** 事件边框的颜色 */
    static readonly EDITOR_VIEW_EVENT_BORDER_COLOR: RGBAcolor = [255, 255, 255, 1] as const;

    /** 被禁用的事件边框的颜色 */
    static readonly EDITOR_VIEW_EVENT_DISABLED_BORDER_COLOR: RGBAcolor = [255, 0, 0, 1] as const;

    /** 事件边框的宽度 */
    static readonly EDITOR_VIEW_EVENT_BORDER_WIDTH = 2;

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
}