import type { Note } from "@/classes/note";
import type { NumberEvent } from "./classes/event";
export enum RightPanelState {
    Default, Settings, BPMList, Meta, JudgeLine, Effect
}
export enum MouseMoveMode {
    None, AddHold, Drag, Select
}
export type SelectedElement = Note | NumberEvent;