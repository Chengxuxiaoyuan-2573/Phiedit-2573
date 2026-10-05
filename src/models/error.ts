/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { SelectableElement } from "./element";
type ErrorCode = "InvalidHoldTime" | "InvalidNonHoldTime" | "NoteOutOfRange" |
    "TapsOverlapped" | "HoldsOverlapped" | "TapAndHoldOverlapped" |
    "InvalidEventTime" | "EventsOverlapped" | "EventOutOfRange" |
    "TapAfterDrag" | "TapAfterFlick" | "NotSupported" |
    "InvalidEasingLeftRight" | "EventDisabled"
export default class ChartError {
    objects: SelectableElement[];
    constructor(public message: string,
        public code: ErrorCode,
        public level: "error" | "warning" | "info" = "error",
        ...objects: SelectableElement[]) {
        this.objects = objects;
    }
}