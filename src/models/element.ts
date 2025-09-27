import { IEvent, IEventExtendedOptions } from "./event";
import { INote, INoteExtendedOptions } from "./note";
import { IObjectizable } from "./objectizable";
import { TimeSegment } from "./timeSegment";

export type FullNote = INote & INoteExtendedOptions & IObjectizable<INote> & TimeSegment;
export type FullEvent<T = unknown> = IEvent<T> & IEventExtendedOptions & IObjectizable<IEvent> & TimeSegment;
export type SelectableElement = FullNote | FullEvent;