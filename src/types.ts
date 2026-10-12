import type { Note } from "@/models/rpe/note";
import type { NumberEvent } from "./models/rpe/event";
export enum RightPanelState {
    Default, Clipboard, Settings, BPMList, Meta, JudgeLine, History, Calculator, NoteFill, EventFill, FastBind
}
export enum MouseMoveMode {
    None, Drag, DragEnd, Select
}
export type SelectedElement = Note | NumberEvent;