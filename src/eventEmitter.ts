/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import type { Beats } from "./models/beats";
import type { NoteType } from "./models/note";
import EventEmitter from "./tools/eventEmitter";
export type PositionX = number;
export type PositionY = number;
export type DeltaY = number;
export type KeyOptions = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
}

/**
 * 历史记录类型可以是六种类型的数组，表示本历史记录包含哪些类型，
 * 也可以是 "UNDO"、"REDO" 等
 */
export type HistoryType = ("ADD_NOTE" | "MODIFY_NOTE" | "REMOVE_NOTE" | "ADD_EVENT" | "MODIFY_EVENT" | "REMOVE_EVENT")[] | "UNDO" | "REDO" | "CLEAR";

export interface VideoRenderingProgress {

    /** 渲染状态信息 */
    status: string;

    /** 已经处理的音效或画面数量 */
    processed: number;

    /** 总的音效或画面数量 */
    total: number;

    /** 处理时所花费的时间，以秒为单位 */
    time: number;

    /** 状态码 */
    code: "MERGING_HITSOUNDS" | "RENDERING_FRAMES"
}

/**
 * 事件名称列表
 * 如要添加新事件，请在此添加，并在数组中规定每个参数的类型
 */
export interface GlobalEventMap {
    MOUSE_LEFT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_RIGHT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_MOVE: [PositionX, PositionY, KeyOptions]
    MOUSE_UP: [PositionX, PositionY, KeyOptions]
    MOUSE_ENTER: []
    MOUSE_LEAVE: []
    WHEEL: [DeltaY]
    CTRL_WHEEL: [DeltaY]
    RENDER_FRAME: []
    RENDER_CHART: []
    RENDER_EDITOR: []
    AUTOPLAY: []
    TOGGLE_PLAY: []
    CUT: []
    COPY: []
    PASTE: [Beats?]
    PASTE_MIRROR: [Beats?]
    DELETE: []
    SELECT_ALL: []
    UNSELECT_ALL: []
    MOVE_LEFT: []
    MOVE_RIGHT: []
    MOVE_UP: []
    MOVE_DOWN: []
    NEXT_JUDGE_LINE: []
    PREVIOUS_JUDGE_LINE: []
    CHANGE_JUDGE_LINE: []
    CHANGE_TYPE: [NoteType]
    PREVIEW: [boolean]
    STOP_PREVIEW: [boolean]
    TOGGLE_PREVIEW: []
    MOVE_TO_JUDGE_LINE: [number?]
    MOVE_TO_PREVIOUS_JUDGE_LINE: []
    MOVE_TO_NEXT_JUDGE_LINE: []
    REPEAT: []
    CLONE: []
    UNDO: []
    REDO: []
    SAVE: []
    EXPORT: [string | null]
    REPEAT_PARAGRAPH: []
    REVERSE: []
    SWAP: []
    STICK: []
    RANDOM: []
    DISABLE: []
    ENABLE: []
    FILL_NOTES: []
    FILL_EVENTS: []
    BIND_LINE: []
    CHECK_ERRORS: []
    AUTO_FIX_ERRORS: []
    MUTIPLE_EDIT: []
    SAVE_SETTINGS: []
    ADD_JUDGE_LINE: []
    DELETE_JUDGE_LINE: [number]

    SELECTION_UPDATE: []
    HISTORY_UPDATE: [HistoryType]
    ERRORS_FIXED: [number]
    ELEMENT_DRAGGED: []
    JUDGE_LINE_COUNT_CHANGED: [number]
    SETTINGS_LOADED: []
    VIDEO_RENDERING_PROGRESS: [VideoRenderingProgress]
}

class GlobalEventEmitter extends EventEmitter<GlobalEventMap> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly map = new Map<(...args: any[]) => void, (...args: any[]) => void>();
    onIpc<K extends keyof GlobalEventMap>(event: K, handler: (...args: GlobalEventMap[K]) => void, priority = 0) {
        const wrapper = (event: unknown, ...args: GlobalEventMap[K]) => handler(...args);
        window.electronAPI.on(event, wrapper);
        this.map.set(handler, wrapper);
        super.on(event, handler, priority);
    }
    offIpc<K extends keyof GlobalEventMap>(event: K, handler: (...args: GlobalEventMap[K]) => void) {
        const wrapper = this.map.get(handler);
        if (wrapper) {
            window.electronAPI.off(event, wrapper);
        }
        super.off(event, handler);
    }
}

const globalEventEmitter = new GlobalEventEmitter();
export default globalEventEmitter;
