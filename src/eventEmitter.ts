import type { Beats } from "./models/beats";
import type { EasingType } from "./models/easing";
import type { NoteType } from "./models/note";
import EventEmitter from "./tools/eventEmitter";
type PositionX = number;
type PositionY = number;
type KeyOptions = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
}
/**
 * 事件管理器的事件名称列表
 * 如要添加新事件，请在此添加，并在数组中规定每个参数的类型
 */
interface GlobalEventMap {
    MOUSE_LEFT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_RIGHT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_MOVE: [PositionX, PositionY, KeyOptions]
    MOUSE_UP: [PositionX, PositionY, KeyOptions]
    RENDER_CHART: []
    RENDER_EDITOR: []
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
    CHANGE_JUDGE_LINE: [number]
    CHANGE_TYPE: [NoteType]
    PREVIEW: []
    STOP_PREVIEW: []
    MOVE_TO_JUDGE_LINE: [number]
    MOVE_TO_PREVIOUS_JUDGE_LINE: []
    MOVE_TO_NEXT_JUDGE_LINE: []
    SAVE_FAST_EDIT: [string, string]
    EVALUATE_CODE: [string]
    REPEAT: []
    CLONE: []
    UNDO: []
    REDO: []
    EXIT: []
    SAVE: []
    EXPORT: [string]
    REPEAT_PARAGRAPH: []
    REVERSE: []
    SWAP: []
    DISABLE: []
    ENABLE: []
    FILL_NOTES: [NoteType, EasingType, number]
    FILL_EVENTS: [Beats | undefined, Beats | undefined, number, string]
    BIND_LINE: [number[], Beats | undefined, number]

    SELECTION_UPDATE: []
    HISTORY_UPDATE: []
}
class GlobalEventEmitter extends EventEmitter<GlobalEventMap> {}
const globalEventEmitter = new GlobalEventEmitter();
export default globalEventEmitter;
