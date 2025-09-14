import { NumberEvent, ColorEvent, TextEvent } from "./event";
import { Note } from "./note";
type ErrorCode = "ChartReadError.TypeError" | "ChartReadError.MissingProperty" | "ChartReadError.OutOfRange" |
    "ChartReadError.FormatError" |
    "ChartEditError.InvalidHoldTime" | "ChartEditError.InvalidNonHoldTime" | "ChartEditError.NoteOutOfRange" |
    "ChartEditError.TapsOverlapped" | "ChartEditError.HoldsOverlapped" | "ChartEditError.TapAndHoldOverlapped" |
    "ChartEditError.InvalidEventTime" | "ChartEditError.EventsOverlapped" | "ChartEditError.EventOutOfRange" |
    "ChartEditError.TapAfterDrag" | "ChartEditError.TapAfterFlick" | "ChartEditError.NotSupported" |
    "ChartEditError.InvalidEasingLeftRight" | "ChartEditError.EventDisabled"
export default class ChartError {
    objects: (NumberEvent | ColorEvent | TextEvent | Note)[];
    constructor(public message: string,
        public code: ErrorCode,
        public level: "error" | "warning" | "info" = "error",
        ...objects: (Note | NumberEvent | ColorEvent | TextEvent)[]) {
        this.objects = objects;
    }
}