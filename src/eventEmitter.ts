import type { NoteType } from "./classes/note";
import EventEmitter from "./tools/eventEmitter";
type PositionX = number;
type PositionY = number;
type Options = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
}

interface GlobalEventMap {
    MOUSE_LEFT_CLICK: [PositionX, PositionY, Options]
    MOUSE_RIGHT_CLICK: [PositionX, PositionY, Options?]
    MOUSE_MOVE: [PositionX, PositionY, Options]
    MOUSE_UP: [PositionX?, PositionY?, Options?]
    CUT: []
    COPY: []
    PASTE: []
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
    CHANGE_TYPE: [keyof typeof NoteType]
    PREVIEW: []
    STOP_PREVIEW: []
}
class GlobalEventEmitter extends EventEmitter<GlobalEventMap> {}
const globalEventEmitter = new GlobalEventEmitter();
export default globalEventEmitter;
