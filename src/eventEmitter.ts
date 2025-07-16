import { Beats } from "./models/beats";
import { EasingType } from "./models/easing";
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

interface GlobalEventMap {
    MOUSE_LEFT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_RIGHT_CLICK: [PositionX, PositionY, KeyOptions]
    MOUSE_MOVE: [PositionX, PositionY, KeyOptions]
    MOUSE_UP: [PositionX, PositionY, KeyOptions]
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
    SAVE_FAST_EDIT: [string, string]
    EVALUATE_CODE: [string]
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

    SELECTION_UPDATE: []
    HISTORY_UPDATE: []
}
class GlobalEventEmitter extends EventEmitter<GlobalEventMap> {}
const globalEventEmitter = new GlobalEventEmitter();
export default globalEventEmitter;
