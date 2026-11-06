/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *
 * 噪域的几何变换与区域合成。
 *
 * 本模块的所有坐标都在谱面坐标系（RPE 坐标，y 轴向上）中，由调用方负责与画布坐标的相互转换。
 *
 * 变换模型（与 RPE Next 的噪域实现一致）：
 *  - 形状：以基准矩形中心为支点按缩放值缩放，再按旋转值旋转；
 *  - 中心轨迹：缩放与旋转的首段确定尺寸与方向，后续各段以「倍率比」（缩放）或
 *    「角度差」（旋转）围绕该段的锚点累计变换基准中心，得到中心轨迹点；
 *  - 移动：最后叠加移动事件相对基准中心的坐标偏移。
 *
 * 关键帧之间的跳变（官方 Zero / One 缓动或同刻关键帧产生的瞬时跳变）由事件的
 * transformStart / transformEnd 元数据显式记录（见转换器），渲染时以「跳变前值 → 跳变目标值」
 * 绕锚点折进中心轨迹——官谱 ha te 的放射段（出生即旋转）正是靠这条规则把方块甩到
 * 锚点周围的放射位置上。没有跳变元数据的事件（例如单个普通关键帧）只表达数值本身，
 * 不会移动中心：方块以该旋转角 / 缩放值出生，中心仍在移动事件给定的位置上。
 *
 * 锚点是 RPE 事件自带的 anchor 字段，缩放事件与旋转事件各带各的锚点；
 * 事件没有该字段（早期谱面）时锚点取噪域中心，
 * 整体退化为「以中心缩放、绕中心旋转、中心移动到目标位置」。
 */

import { difference, union, xor, type MultiPolygon, type Pair, type Polygon } from "polygon-clipping";
import type { Point } from "./mathUtils";

/** 噪域事件通道需要提供的最小字段（NumberEvent 满足该结构） */
export interface BlockAreaGeometryEvent {

    /** 事件开始时间，单位为秒 */
    cachedStartSeconds: number

    start: number

    end: number

    /** 事件的锚点，即这一段缩放 / 旋转的支点，格式为 { x, y }（Point）。没有该字段时取噪域中心 */
    anchor?: Point

    /** 显式跳变（官方 Zero / One 缓动、同刻关键帧）的起始值，没有时视为没有跳变 */
    transformStart?: number

    /** 显式跳变的目标值，与 transformStart 配对，没有时视为等于 end */
    transformEnd?: number

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
 * 取事件的锚点。
 *
 * RPE 中 anchor 是事件自带的字段（Point 格式 { x, y }）：一段缩放 / 旋转以该事件的 anchor 为支点。
 * 事件没有该字段时取噪域中心，与加入 anchor 字段之前的「绕噪域中心缩放 / 旋转」一致。
 */
function anchorOfEvent<Event extends BlockAreaGeometryEvent>(event: Event, fallback: Pair): Pair {
    const anchor = event.anchor;
    if (anchor === undefined) {
        return [fallback[0], fallback[1]];
    }
    return [anchor.x, anchor.y];
}

/**
 * 取事件这一段的有效起始值与结束值。
 *
 * 带 transformStart / transformEnd 元数据的事件（官方 Zero / One 跳变、同刻关键帧）
 * 的「段」是跳变本身：起始值是跳变前的值、结束值是跳变目标值；
 * 普通事件就是事件自身的 start / end。
 */
function segmentOfEvent<Event extends BlockAreaGeometryEvent>(event: Event): { startValue: number; endValue: number } {
    return {
        startValue: event.transformStart ?? event.start,
        endValue: event.transformEnd ?? event.end
    };
}

/**
 * 把中心轨迹点沿某一条通道从谱面开始累计到当前时刻。
 *
 * 对当前时刻之前的每一段，依次施加：
 *  1. 该段的完整变换（有效起始值 → 有效结束值，含 Zero / One / 同刻关键帧的显式跳变）；
 *  2. 该段结束值到下一段起始值之间的跳变（事件间数值不连续时，连续段为恒等）；
 * 最后对当前段施加有效起始值到当前采样值的部分变换。
 *
 * 注意：只有显式记录的跳变才会移动中心。官方文档中「第一个关键帧之前数值保持默认值」
 * 只影响数值本身（旋转角的绝对值），不会产生绕锚点的中心轨迹变换——
 * 没有跳变元数据的噪域以其旋转角 / 缩放值直接出生，中心不离开移动事件的位置。
 * 每次变换都以该段所属事件的锚点为支点，事件没有锚点时以 fallbackAnchor（噪域中心）为支点。
 */
function accumulateChannel<Event extends BlockAreaGeometryEvent>(
    point: TrajectoryPoint,
    kind: ChannelKind,
    events: Event[],
    seconds: number,
    fallbackAnchor: Pair,
    findEventIndex: (events: Event[], seconds: number) => number,
    sample: (event: Event, seconds: number) => number
): void {
    const currentIndex = findEventIndex(events, seconds);
    if (currentIndex === -1) {
        return;
    }

    let previous: Event | null = null;
    let previousSegment: { startValue: number; endValue: number } | null = null;
    let collapsedOffset: number | undefined;
    const step = (start: number, end: number, anchor: Pair) => {
        if (kind !== "rotate") {
            const axis = kind === "scaleX" ? "x" : "y";
            const pivot = anchor[axis === "x" ? 0 : 1];
            if (start !== 0 && end === 0) {
                collapsedOffset = (point[axis] - pivot) / start;
            }
            else if (start === 0 && end !== 0 && collapsedOffset !== undefined) {
                point[axis] = pivot + collapsedOffset * end;
                collapsedOffset = undefined;
                return;
            }
        }
        applyChannelStep(point, kind, start, end, anchor);
    };

    for (let i = 0; i <= currentIndex; i++) {
        const event = events[i];
        if (event.isDisabled) {
            continue;
        }

        const segment = segmentOfEvent(event);
        if (previous !== null && previousSegment !== null) {
            const anchor = anchorOfEvent(previous, fallbackAnchor);

            // 上一段的完整变换（含显式跳变），以及上一段结束值到本段起始值之间的跳变
            // （事件间数值不连续，连续段为恒等）
            step(previousSegment.startValue, previousSegment.endValue, anchor);
            step(previousSegment.endValue, segment.startValue, anchor);
        }

        previous = event;
        previousSegment = segment;
    }

    if (previous !== null && previousSegment !== null) {
        step(previousSegment.startValue, sample(previous, seconds), anchorOfEvent(previous, fallbackAnchor));
    }
}

/**
 * 计算噪域在某一时刻的四个角。
 *
 * @param input 变换参数，所有坐标都在谱面坐标系中
 * @returns 依次为左上、右上、右下、左下的四个角（谱面坐标）
 */
export function getBlockAreaCorners<Event extends BlockAreaGeometryEvent>(input: BlockAreaGeometryInput<Event>): Pair[] {
    const { seconds, baseCenter, halfSize, position, radians, scale, findEventIndex, sample } = input;

    // 中心轨迹：基准中心依次经过 缩放 X → 缩放 Y → 旋转 的累计变换，
    // 每一段都以该段事件的 anchor 为支点，事件没有 anchor 时以噪域中心为支点
    const trajectory: TrajectoryPoint = { x: baseCenter[0], y: baseCenter[1] };
    accumulateChannel(trajectory, "scaleX", input.scaleXEvents, seconds, baseCenter, findEventIndex, sample);
    accumulateChannel(trajectory, "scaleY", input.scaleYEvents, seconds, baseCenter, findEventIndex, sample);
    accumulateChannel(trajectory, "rotate", input.rotateEvents, seconds, baseCenter, findEventIndex, sample);

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

/** 计算多边形的有向面积（外环） */
function signedAreaOf(polygon: Polygon): number {
    const ring = polygon[0];
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return area / 2;
}

/** 面积小于该值的多边形视为退化多边形（例如缩放到 0 时四个角重合的噪域） */
const DEGENERATE_AREA_EPSILON = 1e-9;

/** 剔除面积为 0 的退化多边形，避免布尔运算报错 */
function removeDegeneratePolygons(polygons: Polygon[]): Polygon[] {
    return polygons.filter(polygon => Math.abs(signedAreaOf(polygon)) > DEGENERATE_AREA_EPSILON);
}

/** 安全地求并集，报错时返回 null */
function unionSafe(polygons: Polygon[]): MultiPolygon | null {
    if (polygons.length === 0) {
        return [];
    }

    try {
        return union(polygons[0], ...polygons.slice(1));
    }
    catch {
        // polygon-clipping 的扫描线在大量近乎重合的多边形上可能抛错，交给分批重试
        return null;
    }
}

/**
 * 分批求并集：整批失败时二分重试，极端情况下保留未合并的分块。
 *
 * 保留分块意味着返回的区域可能存在相互重叠的部分，
 * 渲染时必须用 nonzero 规则填充（重叠部分不会被挖出空洞）。
 */
function unionBatched(polygons: Polygon[], batchSize = 32): MultiPolygon {
    if (polygons.length === 1) {
        // 单个多边形也报错时（数值异常导致的退化），直接丢弃
        return unionSafe(polygons) ?? [];
    }

    const pieces: Polygon[] = [];
    for (let i = 0; i < polygons.length; i += batchSize) {
        const chunk = polygons.slice(i, i + batchSize);
        const merged = unionSafe(chunk);
        if (merged !== null) {
            pieces.push(...merged);
            continue;
        }

        if (chunk.length <= 2) {
            // 两个都合不来，保留原始多边形
            pieces.push(...chunk);
            continue;
        }
        pieces.push(...unionBatched(chunk, Math.max(2, Math.floor(chunk.length / 2))));
    }

    const finalMerged = unionSafe(pieces);
    return finalMerged ?? pieces;
}

/** 安全地求差集，报错时返回 null */
function differenceSafe(minuend: Polygon, subtrahend: MultiPolygon): MultiPolygon | null {
    try {
        return difference(minuend, ...subtrahend);
    }
    catch {
        return null;
    }
}

/** 安全地求异或，报错时返回 null */
function xorSafe(a: MultiPolygon, b: MultiPolygon): MultiPolygon | null {
    if (a.length === 0) {
        return b;
    }

    if (b.length === 0) {
        return a;
    }

    try {
        return xor(a[0], ...a.slice(1), b[0], ...b.slice(1));
    }
    catch {
        return null;
    }
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

        const othersUnion = unionBatched(overlappingOthers);
        const remainder = differenceSafe(area, othersUnion);
        if (remainder !== null) {
            pieces.push(...remainder);
        }

        // 差集报错时宁可少反转也不能让整个噪域图层崩溃，跳过这一块
    }

    if (pieces.length === 0) {
        return [];
    }
    return unionBatched(pieces);
}

/**
 * 判断点是否在凸四边形内（含边界）。
 *
 * 噪域是矩形的仿射变换，结果一定是凸四边形（可能有向相反或退化），因此可以用叉积同号性判断。
 * 面积为 0 的退化四边形不包含任何点。
 *
 * @param point 测试点
 * @param corners 依次相连的四个顶点
 */
export function isPointInConvexQuad(point: Pair, corners: Pair[]): boolean {
    if (corners.length !== 4) {
        return false;
    }

    // 退化检查：面积为 0 的四边形（缩放到 0、所有角重合等）不包含任何点
    const [a, b, c] = corners;
    const area2 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (!(Math.abs(area2) > Number.EPSILON)) {
        return false;
    }

    let sign = 0;
    for (let i = 0; i < 4; i++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[(i + 1) % 4];
        const cross = (x2 - x1) * (point[1] - y1) - (y2 - y1) * (point[0] - x1);
        if (cross === 0) {
            // 恰好在边上，视为在内
            continue;
        }

        const currentSign = Math.sign(cross);
        if (sign === 0) {
            sign = currentSign;
        }
        else if (currentSign !== sign) {
            return false;
        }
    }
    return true;
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
    // 先剔除退化多边形：缩放到 0 的噪域四个角重合，会让 polygon-clipping 的扫描线抛错
    const normal = removeDegeneratePolygons(normalAreas);
    const subtract = removeDegeneratePolygons(subtractAreas);

    let region: MultiPolygon | null = null;
    if (normal.length > 0) {
        region = unionBatched(normal);
    }

    if (subtract.length === 0) {
        return region;
    }

    const invertRegion = computeExactlyOnceRegion(subtract);
    if (region === null) {
        return invertRegion;
    }

    // 异或失败时保留普通噪域区域（少反转），保证噪域图层永远能画出来
    return xorSafe(region, invertRegion) ?? region;
}
