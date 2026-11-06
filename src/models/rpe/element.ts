/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { addBeats, Beats } from "./beats";
import { ActiveInterval, BlockArea } from "./blockArea";
import { AbstractEvent } from "./event";
import { Note } from "./note";

/**
 * 可以被选中的元素。
 *
 * 包括音符、事件，以及在噪域编辑界面中选中整个噪域 / 某个激活区间。
 */
export type SelectableElement = Note | AbstractEvent | BlockArea | ActiveInterval;

/** 起止时间用 startTime / endTime 表示的可选中元素 */
export type TimedSelectableElement = Note | AbstractEvent | ActiveInterval;

/** 噪声类元素，即噪域与激活区间（它们不是音符也不是事件） */
export type BlockAreaLikeElement = BlockArea | ActiveInterval;

export function isBlockArea(element: unknown): element is BlockArea {
    return element instanceof BlockArea;
}

export function isActiveInterval(element: unknown): element is ActiveInterval {
    return element instanceof ActiveInterval;
}

/** 是否为噪域或激活区间 */
export function isBlockAreaLike(element: unknown): element is BlockAreaLikeElement {
    return isBlockArea(element) || isActiveInterval(element);
}

/** 是否带有可比对、可移动的起止时间（噪域的起止时间叫 appearTime / disappearTime，因此不算在内） */
export function isTimedElement(element: unknown): element is TimedSelectableElement {
    return (element as Partial<TimedSelectableElement> | null)?.startTime !== undefined &&
        (element as Partial<TimedSelectableElement> | null)?.endTime !== undefined;
}

/** 读取元素的起始拍数。噪域的起始拍数是 appearTime */
export function getElementStartTime(element: SelectableElement): Beats {
    return isBlockArea(element) ? element.appearTime : element.startTime;
}

/** 读取元素的结束拍数。噪域的结束拍数是 disappearTime */
export function getElementEndTime(element: SelectableElement): Beats {
    return isBlockArea(element) ? element.disappearTime : element.endTime;
}

/** 写入元素的起始拍数 */
export function setElementStartTime(element: SelectableElement, beats: Beats) {
    if (isBlockArea(element)) {
        element.appearTime = beats;
    }
    else {
        element.startTime = beats;
    }
}

/** 写入元素的结束拍数 */
export function setElementEndTime(element: SelectableElement, beats: Beats) {
    if (isBlockArea(element)) {
        element.disappearTime = beats;
    }
    else {
        element.endTime = beats;
    }
}

/** 确保元素的结束时间不早于开始时间 */
export function makeSureElementTimeValid(element: SelectableElement) {
    element.makeSureTimeValid();
}

/** 把元素整体沿时间轴移动 delta 拍 */
export function moveElementByBeats(element: SelectableElement, delta: Beats) {
    setElementStartTime(element, addBeats(getElementStartTime(element), delta));
    setElementEndTime(element, addBeats(getElementEndTime(element), delta));
    element.makeSureTimeValid();
}
