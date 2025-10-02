/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { IEvent, IEventExtendedOptions } from "./event";
import { INote, INoteExtendedOptions } from "./note";
import { IObjectizable } from "./objectizable";
import { TimeSegment } from "./timeSegment";

export type FullNote = INote & INoteExtendedOptions & IObjectizable<INote> & TimeSegment;
export type FullEvent<T = unknown> = IEvent<T> & IEventExtendedOptions & IObjectizable<IEvent> & TimeSegment;
export type SelectableElement = FullNote | FullEvent;