/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { SelectableElement } from "./element";
type ErrorCode = "ChartReadError.TypeError" | "ChartReadError.MissingProperty" | "ChartReadError.OutOfRange" |
    "ChartReadError.FormatError" |
    "ChartEditError.InvalidHoldTime" | "ChartEditError.InvalidNonHoldTime" | "ChartEditError.NoteOutOfRange" |
    "ChartEditError.TapsOverlapped" | "ChartEditError.HoldsOverlapped" | "ChartEditError.TapAndHoldOverlapped" |
    "ChartEditError.InvalidEventTime" | "ChartEditError.EventsOverlapped" | "ChartEditError.EventOutOfRange" |
    "ChartEditError.TapAfterDrag" | "ChartEditError.TapAfterFlick" | "ChartEditError.NotSupported" |
    "ChartEditError.InvalidEasingLeftRight" | "ChartEditError.EventDisabled"
export default class ChartError {
    objects: SelectableElement[];
    constructor(public message: string,
        public code: ErrorCode,
        public level: "error" | "warning" | "info" = "error",
        ...objects: SelectableElement[]) {
        this.objects = objects;
    }
}