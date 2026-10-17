/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * 噪域的几何变换与区域合成。
 *
 * 本模块的所有坐标都在谱面坐标系（RPE 坐标，y 轴向上）中，由调用方负责与画布坐标的相互转换。
 *
 * 变换模型（与 RPE Next 等噪域编辑器采用的语义一致）：
 *  - 形状：以基准矩形中心为支点按缩放值缩放，再按旋转值旋转；
 *  - 中心轨迹：缩放与旋转的首段确定尺寸与方向，后续各段以「倍率比」（缩放）或
 *    「角度差」（旋转）围绕该段的锚点累计变换基准中心，得到中心轨迹点；
 *  - 移动：最后叠加移动事件相对基准中心的坐标偏移。
 *
 * 关键帧之间的跳变（官方 Zero / One 缓动产生的瞬时跳变）体现为
 * 「上一段的结束值 → 下一段的起始值」的锚点相对变换；连续段两者相等，变换为恒等。
 * 锚点通道缺失时锚点取基准中心，此时中心轨迹恒为中心，
 * 整体退化为「以中心缩放、绕中心旋转、中心移动到目标位置」。
 */

import { difference, union, xor, type MultiPolygon, type Pair, type Polygon } from "polygon-clipping";

/** 噪域事件通道需要提供的最小字段（NumberEvent 满足该结构） */
export interface BlockAreaGeometryEvent {

    /** 事件开始时间，单位为秒 */
    cachedStartSeconds: number

    start: number

    end: number

    isDisabled: boolean
}

/** 噪域几何变换的输入参数 */
export interface BlockAreaGeometryInput<Event extends BlockAreaGeometryEvent> {

    /** 当前时间，单位为秒 */
    seconds: number

    /** 基准矩形的中心（谱面坐标） */
    baseCenter: Pair

    /** 基准矩形的半宽与半高，即未缩放时尺寸的一半 */
    halfSize: Pair

    /** 移动事件的采样值（谱面坐标） */
    position: Pair

    /** 旋转事件的采样值，单位为弧度。旋转矩阵为 [cos, sin; -sin, cos]（y 轴向上时正角度为顺时针），与谱面坐标系一致 */
    radians: number

    /** 缩放事件的采样值 */
    scale: Pair

    scaleXEvents: Event[]

    scaleYEvents: Event[]

    rotateEvents: Event[]

    scaleAnchorXEvents: Event[]

    scaleAnchorYEvents: Event[]

    rotateAnchorXEvents: Event[]

    rotateAnchorYEvents: Event[]

    /** 对事件在某一时刻采样（与渲染器其余部分使用同一插值逻辑） */
    sample: (event: Event, seconds: number) => number

    /** 选取「开始时间不晚于指定时刻的最后一个未禁用事件」的下标，没有时返回 -1 */
    findEventIndex: (events: Event[], seconds: number) => number
}

/** 通道的种类 */
type ChannelKind = "scaleX" | "scaleY" | "rotate";

/** 可变点，用于累计中心轨迹 */
interface TrajectoryPoint {
    x: number
    y: number
}

/**
 * 对中心轨迹点施加某一段「从 startValue 到 endValue」的锚点相对变换。
 *
 * 缩放段的倍率比为 endValue / startValue（起始值为 0 或结果非有限时取 1，即恒等），
 * 旋转段的角度差为 endValue - startValue；变换以锚点为支点。
 */
function applyChannelStep(
    point: TrajectoryPoint,
    kind: ChannelKind,
    startValue: number,
    endValue: number,
    anchor: Pair
): void {
    if (kind === "rotate") {
        const radians = (endValue - startValue) * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = point.x - anchor[0];
        const dy = point.y - anchor[1];
        point.x = anchor[0] + dx * cos + dy * sin;
        point.y = anchor[1] - dx * sin + dy * cos;
        return;
    }

    let ratio = startValue === 0 ? 1 : endValue / startValue;
    if (!Number.isFinite(ratio)) {
        ratio = 1;
    }

    if (kind === "scaleX") {
        point.x = anchor[0] + (point.x - anchor[0]) * ratio;
    }
    else {
        point.y = anchor[1] + (point.y - anchor[1]) * ratio;
    }
}

/**
 * 把中心轨迹点沿某一条通道从谱面开始累计到当前时刻。
 *
 * 对当前时刻之前的每一段，依次施加：
 *  1. 该段的完整变换（起始值 → 结束值）；
 *  2. 该段结束值到下一段起始值之间的跳变（Zero / One 等瞬时跳变，连续段为恒等）；
 * 最后对当前段施加起始值到当前采样值的部分变换。
 * 每次变换都以该段起始时刻的锚点为支点。
 */
function accumulateChannel<Event extends BlockAreaGeometryEvent>(
    point: TrajectoryPoint,
    kind: ChannelKind,
    events: Event[],
    seconds: number,
    anchorAt: (startSeconds: number) => Pair,
    findEventIndex: (events: Event[], seconds: number) => number,
    sample: (event: Event, seconds: number) => number
): void {
    const currentIndex = findEventIndex(events, seconds);
    if (currentIndex === -1) {
        return;
    }

    let previous: Event | null = null;
    for (let i = 0; i <= currentIndex; i++) {
        const event = events[i];
        if (event.isDisabled) {
            continue;
        }

        if (previous !== null) {
            applyChannelStep(point, kind, previous.start, previous.end, anchorAt(previous.cachedStartSeconds));
            applyChannelStep(point, kind, previous.end, event.start, anchorAt(previous.cachedStartSeconds));
        }
        previous = event;
    }

    if (previous !== null) {
        applyChannelStep(point, kind, previous.start, sample(previous, seconds), anchorAt(previous.cachedStartSeconds));
    }
}

/** 采样某一通道在指定时刻的值，没有事件覆盖时使用 fallback */
function sampleChannelAt<Event extends BlockAreaGeometryEvent>(
    events: Event[],
    seconds: number,
    fallback: number,
    findEventIndex: (events: Event[], seconds: number) => number,
    sample: (event: Event, seconds: number) => number
): number {
    const event = events[findEventIndex(events, seconds)];
    return event ? sample(event, seconds) : fallback;
}

/**
 * 计算噪域在某一时刻的四个角。
 *
 * @param input 变换参数，所有坐标都在谱面坐标系中
 * @returns 依次为左上、右上、右下、左下的四个角（谱面坐标）
 */
export function getBlockAreaCorners<Event extends BlockAreaGeometryEvent>(input: BlockAreaGeometryInput<Event>): Pair[] {
    const { seconds, baseCenter, halfSize, position, radians, scale, findEventIndex, sample } = input;

    // 缩放通道与旋转通道各有自己的锚点，锚点缺失时取基准中心
    const scaleAnchorAt = (startSeconds: number): Pair => [
        sampleChannelAt(input.scaleAnchorXEvents, startSeconds, baseCenter[0], findEventIndex, sample),
        sampleChannelAt(input.scaleAnchorYEvents, startSeconds, baseCenter[1], findEventIndex, sample)
    ];
    const rotateAnchorAt = (startSeconds: number): Pair => [
        sampleChannelAt(input.rotateAnchorXEvents, startSeconds, baseCenter[0], findEventIndex, sample),
        sampleChannelAt(input.rotateAnchorYEvents, startSeconds, baseCenter[1], findEventIndex, sample)
    ];

    // 中心轨迹：基准中心依次经过 缩放 X → 缩放 Y → 旋转 的累计变换
    const trajectory: TrajectoryPoint = { x: baseCenter[0], y: baseCenter[1] };
    accumulateChannel(trajectory, "scaleX", input.scaleXEvents, seconds, scaleAnchorAt, findEventIndex, sample);
    accumulateChannel(trajectory, "scaleY", input.scaleYEvents, seconds, scaleAnchorAt, findEventIndex, sample);
    accumulateChannel(trajectory, "rotate", input.rotateEvents, seconds, rotateAnchorAt, findEventIndex, sample);

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const offsetX = position[0] - baseCenter[0];
    const offsetY = position[1] - baseCenter[1];

    // 相对基准中心的四个角（谱面坐标系中 y 轴向上）
    const localCorners: Pair[] = [
        [-halfSize[0], halfSize[1]],
        [halfSize[0], halfSize[1]],
        [halfSize[0], -halfSize[1]],
        [-halfSize[0], -halfSize[1]]
    ];

    return localCorners.map(([dx, dy]): Pair => [
        trajectory.x + offsetX + dx * scale[0] * cos + dy * scale[1] * sin,
        trajectory.y + offsetY - dx * scale[0] * sin + dy * scale[1] * cos
    ]);
}

/** 计算多边形的外接矩形 */
function boundsOf(polygon: Polygon): { minX: number; maxX: number; minY: number; maxY: number } {
    const ring = polygon[0];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
}

/** 判断两个多边形的外接矩形是否相交（用于跳过明显不相交的布尔运算） */
function boundsIntersect(a: Polygon, b: Polygon): boolean {
    const boundsA = boundsOf(a);
    const boundsB = boundsOf(b);
    return boundsA.minX <= boundsB.maxX && boundsB.minX <= boundsA.maxX &&
        boundsA.minY <= boundsB.maxY && boundsB.minY <= boundsA.maxY;
}

/**
 * 计算「恰好被一个反转噪域覆盖」的区域。
 *
 * 被两个及以上反转噪域同时覆盖的部分不参与反转，
 * 因此不能直接对所有反转噪域取并集，而要对每个反转噪域扣除与其相交的其它反转噪域。
 */
function computeExactlyOnceRegion(subtractAreas: Polygon[]): MultiPolygon {
    if (subtractAreas.length === 1) {
        return [subtractAreas[0]];
    }

    const pieces: Polygon[] = [];
    for (let i = 0; i < subtractAreas.length; i++) {
        const area = subtractAreas[i];
        const others = subtractAreas.filter((_, j) => j !== i);
        const overlappingOthers = others.filter(other => boundsIntersect(area, other));
        if (overlappingOthers.length === 0) {
            // 与其它反转噪域都不相交，整体都是「恰好一次」覆盖
            pieces.push(area);
            continue;
        }

        const othersUnion = union(overlappingOthers[0], ...overlappingOthers.slice(1));
        pieces.push(...difference(area, othersUnion));
    }

    if (pieces.length === 0) {
        return [];
    }
    return union(pieces[0], ...pieces.slice(1));
}

/**
 * 合成噪域的可见区域。
 *
 * 普通噪域至少被一个覆盖即有效；反转噪域只在恰好被一个覆盖时反转该处
 * （被两个及以上反转噪域覆盖的部分不反转）。没有普通噪域时，反转噪域覆盖的部分仍然显示。
 *
 * @param normalAreas 已激活的普通噪域
 * @param subtractAreas 已激活的反转噪域
 * @returns 可见区域；没有任何噪域可见时返回 null
 */
export function computeBlockAreaRegion(normalAreas: Polygon[], subtractAreas: Polygon[]): MultiPolygon | null {
    let region: MultiPolygon | null = null;
    if (normalAreas.length > 0) {
        region = union(normalAreas[0], ...normalAreas.slice(1));
    }

    if (subtractAreas.length === 0) {
        return region;
    }

    const invertRegion = computeExactlyOnceRegion(subtractAreas);
    if (region === null) {
        return invertRegion;
    }
    return xor(region, invertRegion);
}
