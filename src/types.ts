import type { Note } from "@/models/note";
import type { NumberEvent } from "./models/event";
export enum RightPanelState {
    Default, Settings, BPMList, Meta, JudgeLine, History
}
export enum MouseMoveMode {
    None, AddHold, Drag, Select
}
export type SelectedElement = Note | NumberEvent;