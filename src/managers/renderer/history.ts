/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import { eventAttributes, IEvent } from "@/models/rpe/event";
import { INote, noteAttributes } from "@/models/rpe/note";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";
import { toUnique } from "@/tools/algorithm";
import { IActiveInterval, IBlockArea } from "@/models/rpe/blockArea";

const NAME_MAP = {
    addNote: "ADD_NOTE",
    addEvent: "ADD_EVENT",
    removeNote: "REMOVE_NOTE",
    removeEvent: "REMOVE_EVENT",
    modifyNote: "MODIFY_NOTE",
    modifyEvent: "MODIFY_EVENT",
    modifyBlockArea: "MODIFY_BLOCK_AREA",
    removeBlockArea: "REMOVE_BLOCK_AREA",
    addActiveInterval: "ADD_ACTIVE_INTERVAL",
    removeActiveInterval: "REMOVE_ACTIVE_INTERVAL",
    modifyActiveInterval: "MODIFY_ACTIVE_INTERVAL",
} as const;

/** 可以通过历史记录修改的噪域属性 */
export type BlockAreaEditableAttribute = "appearTime" | "disappearTime" | "editorPositionX";

/** 可以通过历史记录修改的激活区间属性 */
export type ActiveIntervalEditableAttribute = "startTime" | "endTime" | "readyFlash";

export default class HistoryManager extends Manager {
    /** 撤销栈，最先被执行的操作在最前面 */
    undoStack: HistoryRecord[] = [];

    /** 重做栈，最先被撤销的操作在最前面 */
    redoStack: HistoryRecord[] = [];
    constructor() {
        super();
        globalEventEmitter.on("UNDO", createCatchErrorByMessage(() => {
            this.undo();
        }, "撤销"));
        globalEventEmitter.on("REDO", createCatchErrorByMessage(() => {
            this.redo();
        }, "重做"));
        globalEventEmitter.on("HISTORY_UPDATE", () => {
            const chart = store.useChart();
            const settingsManager = store.useManager("settingsManager");
            for (const judgeLine of chart.judgeLineList) {
                judgeLine.recalculateSpeedQZH();
            }

            if (settingsManager._settings.autoHighlight) {
                chart.highlightNotes();
            }
        });

        // 拖动元素时 startTime 会实时变化但不产生历史记录，
        // 需要把速度事件的位移缓存标记为失效，渲染时才会按新时间重算
        globalEventEmitter.on("ELEMENT_DRAGGED", () => {
            const chart = store.useChart();
            for (const judgeLine of chart.judgeLineList) {
                for (const eventLayer of judgeLine.eventLayers) {
                    eventLayer.isSpeedQZHCacheValid = false;
                }
            }
        });
    }
    getSize() {
        function _getSize(stack: HistoryRecord[]) {
            let sum = 0;
            for (const record of stack) {
                if (record instanceof RecordGroup) {
                    sum += _getSize(record.records);
                }
                else {
                    sum++;
                }
            }
            return sum;
        }
        return _getSize(this.undoStack) + _getSize(this.redoStack);
    }
    clearRedoStack() {
        this.redoStack = [];
        globalEventEmitter.emit("HISTORY_UPDATE", "CLEAR");
    }
    private addRecord<C extends HistoryRecord>(record: C) {
        const lastRecord = this.undoStack[this.undoStack.length - 1];
        if (this.grouped && lastRecord instanceof RecordGroup) {
            // 在组内的时候不触发 HISTORY_UPDATE 事件
            // 而是在组结束的时候触发，以免重复触发
            lastRecord.records.push(record);
        }
        else {
            this.undoStack.push(record);
            globalEventEmitter.emit("HISTORY_UPDATE", [NAME_MAP[record.type as keyof typeof NAME_MAP]]);
        }
    }
    recordAddNote(id: string) {
        const record = new AddNoteRecord(id);
        this.addRecord(record);
    }
    recordModifyNote<T extends typeof noteAttributes[number]>(id: string, attribute: T, newValue: INote[T], oldValue?: INote[T]) {
        const record = new ModifyNoteRecord(id, attribute, newValue, oldValue);
        this.addRecord(record);
    }
    recordRemoveNote(noteObject: INote, judgeLineNumber: number, id: string) {
        const record = new RemoveNoteRecord(noteObject, judgeLineNumber, id);
        this.addRecord(record);
    }
    recordAddEvent(id: string) {
        const record = new AddEventRecord(id);
        this.addRecord(record);
    }
    recordModifyEvent<T extends typeof eventAttributes[number]>(id: string, attribute: T, newValue: IEvent<unknown>[T], oldValue?: IEvent<unknown>[T]) {
        const record = new ModifyEventRecord(id, attribute, newValue, oldValue);
        this.addRecord(record);
    }
    recordRemoveEvent(eventObject: IEvent<unknown>, eventType: string, eventLayerId: string, judgeLineNumber: number, id: string) {
        const record = new RemoveEventRecord(eventObject, eventType, eventLayerId, judgeLineNumber, id);
        this.addRecord(record);
    }
    recordModifyBlockArea<T extends BlockAreaEditableAttribute>(blockAreaIndex: number, attribute: T, newValue: IBlockArea[T], oldValue?: IBlockArea[T]) {
        const record = new ModifyBlockAreaRecord(blockAreaIndex, attribute, newValue, oldValue);
        this.addRecord(record);
    }
    recordRemoveBlockArea(blockAreaObject: IBlockArea, blockAreaIndex: number, position: number) {
        const record = new RemoveBlockAreaRecord(blockAreaObject, blockAreaIndex, position);
        this.addRecord(record);
    }
    recordAddActiveInterval(blockAreaIndex: number, intervalObject: IActiveInterval, position: number) {
        const record = new ActiveIntervalListRecord("add", blockAreaIndex, intervalObject, position);
        this.addRecord(record);
    }
    recordRemoveActiveInterval(blockAreaIndex: number, intervalObject: IActiveInterval, position: number) {
        const record = new ActiveIntervalListRecord("remove", blockAreaIndex, intervalObject, position);
        this.addRecord(record);
    }
    recordModifyActiveInterval<T extends ActiveIntervalEditableAttribute>(blockAreaIndex: number, intervalIndex: number, attribute: T, newValue: IActiveInterval[T], oldValue?: IActiveInterval[T]) {
        const record = new ModifyActiveIntervalRecord(blockAreaIndex, intervalIndex, attribute, newValue, oldValue);
        this.addRecord(record);
    }

    /** 新增的命令是否加入到组中 */
    grouped = false;
    group(name: string) {
        if (this.grouped) {
            // throw new Error("已经处于分组状态，无法再次分组");
        }
        this.grouped = true;
        this.undoStack.push(new RecordGroup([], name));
    }
    ungroup() {
        if (!this.grouped) {
            // throw new Error("没有处于分组状态，无法取消分组");
            return;
        }

        const group = this.undoStack[this.undoStack.length - 1];
        if (!(group instanceof RecordGroup)) {
            // throw new Error("没有处于分组状态，无法取消分组");
            return;
        }
        this.grouped = false;
        globalEventEmitter.emit("HISTORY_UPDATE", toUnique(group.records).map(record => NAME_MAP[record.type as keyof typeof NAME_MAP]));
    }
    undo() {
        const record = this.undoStack.pop();
        if (record) {
            record.undo();
            this.redoStack.push(record);
            globalEventEmitter.emit("HISTORY_UPDATE", "UNDO");
        }
        else {
            throw new Error("没有可撤销的操作");
        }
    }
    redo() {
        const record = this.redoStack.pop();
        if (record) {
            record.redo();
            this.undoStack.push(record);
            globalEventEmitter.emit("HISTORY_UPDATE", "REDO");
        }
        else {
            throw new Error("没有可重做的操作");
        }
    }
}
abstract class HistoryRecord {
    readonly abstract type: string;
    protected isExecuted = true;
    redo() {
        if (!this.isExecuted) {
            this.isExecuted = true;
        }
        else {
            throw new Error(`${this.constructor.name}: Record already redod`);
        }
    }
    undo() {
        if (this.isExecuted) {
            this.isExecuted = false;
        }
        else {
            throw new Error(`${this.constructor.name}: Record not redod`);
        }
    }
    abstract getDescription(): string;
}
class AddNoteRecord extends HistoryRecord {
    readonly type = "addNote";
    private noteObject: INote | undefined = undefined;
    private judgeLineNumber: number | undefined = undefined;
    constructor(private id: string) {
        super();
    }
    redo() {
        super.redo();
        if (this.noteObject === undefined || this.judgeLineNumber === undefined) {
            throw new Error("AddNoteRecord: noteObject or judgeLineNumber is undefined");
        }

        const note = store.addNote(this.noteObject, this.judgeLineNumber, this.id);
        this.id = note.id;
        return note;
    }
    undo() {
        super.undo();
        if (this.id === undefined) {
            throw new Error("AddNoteRecord: id is undefined");
        }

        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        this.noteObject = note.toObject();
        this.judgeLineNumber = note.judgeLineNumber;
        store.removeNote(this.id);
    }
    getDescription() {
        return `添加音符 ${this.id}`;
    }
}

class ModifyNoteRecord<T extends typeof noteAttributes[number]> extends HistoryRecord {
    readonly type = "modifyNote";
    constructor(private id: string,
        private attribute: T,
        private newValue: INote[T],
        private oldValue?: INote[T]) {
        super();
        const note = store.getNoteById(id);
        if (!note) throw new Error(`Note ${id} not found`);
        this.oldValue = oldValue ?? note[attribute];
    }
    redo() {
        super.redo();
        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (note as any)[this.attribute] = this.newValue;
    }
    undo() {
        super.undo();
        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (note as any)[this.attribute] = this.oldValue;
    }
    getDescription(): string {
        return `将音符${this.id}的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

class RemoveNoteRecord extends HistoryRecord {
    readonly type = "removeNote";
    constructor(private noteObject: INote, private judgeLineNumber: number, private id: string) {
        super();
    }
    redo() {
        super.redo();
        if (this.id === undefined) {
            throw new Error("RemoveNoteRecord: id is undefined");
        }

        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        this.noteObject = note.toObject();
        this.judgeLineNumber = note.judgeLineNumber;
        store.removeNote(this.id);
    }
    undo() {
        super.undo();
        if (this.noteObject === undefined || this.judgeLineNumber === undefined) {
            throw new Error("AddNoteRecord: noteObject or judgeLineNumber is undefined");
        }

        const note = store.addNote(this.noteObject, this.judgeLineNumber, this.id);
        this.id = note.id;
        return note;
    }
    getDescription() {
        return `删除音符 ${this.id}`;
    }
}

class AddEventRecord extends HistoryRecord {
    readonly type = "addEvent";
    private eventObject: IEvent<unknown> | undefined = undefined;
    private judgeLineNumber: number | undefined = undefined;
    private eventLayerId: string | undefined = undefined;
    private eventType: string | undefined = undefined;
    constructor(private id: string) {
        super();
    }
    redo() {
        super.redo();
        if (this.eventObject === undefined || this.judgeLineNumber === undefined || this.eventLayerId === undefined || this.eventType === undefined) {
            throw new Error("AddEventCommand: eventObject, judgeLineNumber, eventLayerId or eventType is undefined");
        }

        const event = store.addEvent(this.eventObject, this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
        this.id = event.id;
        return event;
    }
    undo() {
        super.undo();
        if (this.id === undefined) {
            throw new Error("AddEventRecord: id is undefined");
        }

        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} not found`);
        this.eventObject = event.toObject();
        this.judgeLineNumber = event.judgeLineNumber;
        this.eventLayerId = event.eventLayerId;
        this.eventType = event.type;
        store.removeEvent(this.id);
    }
    getDescription() {
        return `添加事件 ${this.id}`;
    }
}

class ModifyEventRecord<T extends typeof eventAttributes[number]> extends HistoryRecord {
    readonly type = "modifyEvent";
    constructor(private id: string,
        private attribute: T,
        private newValue: IEvent<unknown>[T],
        private oldValue?: IEvent<unknown>[T]) {
        super();
        const event = store.getEventById(id);
        if (!event) throw new Error(`Event ${id} 不存在`);
        this.oldValue = oldValue ?? event[attribute];
    }
    redo(): void {
        super.redo();
        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} 不存在`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event as any)[this.attribute] = this.newValue;
    }
    undo(): void {
        super.undo();
        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} 不存在`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event as any)[this.attribute] = this.oldValue;
    }
    getDescription(): string {
        return `将事件${this.id}的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

class RemoveEventRecord extends HistoryRecord {
    readonly type = "removeEvent";
    constructor(private eventObject: IEvent<unknown>, private eventType: string, private eventLayerId: string, private judgeLineNumber: number, private id: string) {
        super();
    }
    redo() {
        super.redo();
        if (this.id === undefined) {
            throw new Error("RemoveEventRecord: id is undefined");
        }

        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} not found`);
        this.eventObject = event.toObject();
        this.judgeLineNumber = event.judgeLineNumber;
        this.eventLayerId = event.eventLayerId;
        this.eventType = event.type;
        store.removeEvent(this.id);
    }
    undo() {
        super.undo();
        if (this.eventObject === undefined || this.judgeLineNumber === undefined || this.eventLayerId === undefined || this.eventType === undefined) {
            throw new Error("RemoveEventCommand: eventObject, judgeLineNumber, eventLayerId or eventType is undefined");
        }

        const event = store.addEvent(this.eventObject, this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
        this.id = event.id;
        return event;
    }
    getDescription() {
        return `删除事件 ${this.id}`;
    }
}

/** 修改噪域的属性 */
class ModifyBlockAreaRecord<T extends BlockAreaEditableAttribute> extends HistoryRecord {
    readonly type = "modifyBlockArea";
    constructor(private blockAreaIndex: number,
        private attribute: T,
        private newValue: IBlockArea[T],
        private oldValue?: IBlockArea[T]) {
        super();
        const blockArea = store.getBlockAreaById(blockAreaIndex);
        this.oldValue = oldValue ?? blockArea[attribute];
    }
    redo(): void {
        super.redo();
        this.apply(this.newValue);
    }
    undo(): void {
        super.undo();
        this.apply(this.oldValue);
    }
    private apply(value: IBlockArea[T] | undefined) {
        if (value === undefined) {
            throw new Error(`噪域${this.blockAreaIndex}的${this.attribute}没有旧值`);
        }

        const blockArea = store.getBlockAreaById(this.blockAreaIndex);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (blockArea as any)[this.attribute] = value;
    }
    getDescription(): string {
        return `将噪域${this.blockAreaIndex}的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

/** 删除噪域 */
class RemoveBlockAreaRecord extends HistoryRecord {
    readonly type = "removeBlockArea";
    constructor(private blockAreaObject: IBlockArea,
        private blockAreaIndex: number,
        private position: number) {
        super();
    }
    redo() {
        super.redo();
        const chart = store.useChart();
        const blockArea = chart.blockAreaList.find(blockArea => blockArea.index === this.blockAreaIndex);
        if (!blockArea) {
            throw new Error(`噪域${this.blockAreaIndex}不存在`);
        }
        this.blockAreaObject = blockArea.toObject();
        this.position = chart.blockAreaList.indexOf(blockArea);
        store.removeBlockArea(blockArea);
        store.useManager("stateManager").notifyBlockAreaListChanged({ removedPosition: this.position });
    }
    undo() {
        super.undo();
        const blockArea = store.insertBlockArea(this.blockAreaObject, this.position, this.blockAreaIndex);
        store.useManager("stateManager").notifyBlockAreaListChanged({ insertedPosition: this.position });
        return blockArea;
    }
    getDescription() {
        return `删除噪域 ${this.blockAreaIndex}`;
    }
}

/** 添加 / 删除激活区间。两种操作互为逆操作，因此共用一个记录类 */
class ActiveIntervalListRecord extends HistoryRecord {
    readonly type: string;
    constructor(private action: "add" | "remove",
        private blockAreaIndex: number,
        private intervalObject: IActiveInterval,
        private position: number) {
        super();
        this.type = action === "add" ? "addActiveInterval" : "removeActiveInterval";
    }
    redo() {
        super.redo();
        if (this.action === "add") {
            this.insert();
        }
        else {
            this.remove();
        }
    }
    undo() {
        super.undo();
        if (this.action === "add") {
            this.remove();
        }
        else {
            this.insert();
        }
    }
    private insert() {
        const blockArea = store.getBlockAreaById(this.blockAreaIndex);
        const interval = blockArea.insertActiveInterval(this.intervalObject, this.position);
        this.position = blockArea.activeIntervals.indexOf(interval);
    }
    private remove() {
        const blockArea = store.getBlockAreaById(this.blockAreaIndex);
        const interval = blockArea.activeIntervals[this.position];
        if (!interval) {
            throw new Error(`噪域${this.blockAreaIndex}中不存在第${this.position}个激活区间`);
        }
        this.intervalObject = interval.toObject();
        this.position = blockArea.activeIntervals.indexOf(interval);
        blockArea.removeActiveInterval(interval);
    }
    getDescription() {
        return `${this.action === "add" ? "添加" : "删除"}噪域${this.blockAreaIndex}的激活区间`;
    }
}

/** 修改激活区间的属性 */
class ModifyActiveIntervalRecord<T extends ActiveIntervalEditableAttribute> extends HistoryRecord {
    readonly type = "modifyActiveInterval";
    constructor(private blockAreaIndex: number,
        private intervalIndex: number,
        private attribute: T,
        private newValue: IActiveInterval[T],
        private oldValue?: IActiveInterval[T]) {
        super();
        const interval = store.getBlockAreaById(blockAreaIndex).activeIntervals[intervalIndex];
        if (!interval) {
            throw new Error(`噪域${blockAreaIndex}中不存在第${intervalIndex}个激活区间`);
        }
        this.oldValue = oldValue ?? interval[attribute];
    }
    redo(): void {
        super.redo();
        this.apply(this.newValue);
    }
    undo(): void {
        super.undo();
        this.apply(this.oldValue);
    }
    private apply(value: IActiveInterval[T] | undefined) {
        if (value === undefined) {
            throw new Error(`激活区间的${this.attribute}没有旧值`);
        }

        const interval = store.getBlockAreaById(this.blockAreaIndex).activeIntervals[this.intervalIndex];
        if (!interval) {
            throw new Error(`噪域${this.blockAreaIndex}中不存在第${this.intervalIndex}个激活区间`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (interval as any)[this.attribute] = value;
    }
    getDescription(): string {
        return `将激活区间的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

class RecordGroup extends HistoryRecord {
    readonly type = "group";
    constructor(readonly records: HistoryRecord[], private readonly name: string) {
        super();
        this.isExecuted = true;
    }
    redo() {
        super.redo();
        for (const record of this.records) {
            record.redo();
        }
    }
    undo() {
        super.undo();
        for (const record of this.records.toReversed()) {
            record.undo();
        }
    }
    getDescription() {
        return `${this.name}（包含${this.records.length}个操作）`;
    }
}