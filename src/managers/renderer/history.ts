/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import { cloneDeep } from "lodash";
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

    /** 历史记录条数：每个撤销单元（单条记录或一个分组）算一条，与历史面板的行数一致 */
    getSize() {
        return this.undoStack.length + this.redoStack.length;
    }
    clearRedoStack() {
        this.redoStack = [];
        globalEventEmitter.emit("HISTORY_UPDATE", "CLEAR");
    }
    private addRecord<C extends HistoryRecord>(record: C) {
        // 新操作会使所有重做记录过期，必须清空重做栈，
        // 否则撤销后进行新操作再重做，会重放过期的记录导致状态错乱
        this.redoStack = [];
        const lastRecord = this.undoStack[this.undoStack.length - 1];
        const mergeKey = record.getMergeKey();

        // 面板里连续编辑同一个对象的属性：并入同一个合并组，只占一条历史记录
        if (this.groupDepth === 0 &&
            this.mergingRecord &&
            mergeKey !== null &&
            mergeKey === this.mergingKey &&
            lastRecord === this.mergingRecord) {
            this.mergingRecord.records.push(record);
            globalEventEmitter.emit("HISTORY_UPDATE", [NAME_MAP[record.type as keyof typeof NAME_MAP]]);
            return;
        }

        if (this.groupDepth > 0 && lastRecord instanceof RecordGroup) {
            // 在组内的时候不触发 HISTORY_UPDATE 事件
            // 而是在组结束的时候触发，以免重复触发
            lastRecord.records.push(record);
        }
        else {
            // 其他任何操作都会打断当前的合并会话，避免把不同操作混进同一条历史记录
            this.endMerge();
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

    /** 未关闭的分组数量。支持嵌套分组（例如“移到判定线”内部会嵌套“删除”分组） */
    private groupDepth = 0;

    /** 正在合并的历史记录：面板里对同一个对象的连续编辑会并进这一条 */
    private mergingRecord: RecordGroup | null = null;

    /** 正在合并的对象的标识，例如 note:0-0-note-1、event:0-0-timeX-2 */
    private mergingKey: string | null = null;

    /**
     * 开始（或继续）合并同一个对象的编辑。
     * 同一个 key 连续调用只会复用同一个合并组；key 变化则先结束上一个合并组。
     * 期间只要发生其他任何操作（拖动、增删、撤销等），合并会话都会被自动结束。
     */
    beginMerge(key: string, name: string) {
        if (this.groupDepth > 0) {
            // 分组操作（批量编辑等）自成一组，不参与面板合并
            return;
        }

        const lastRecord = this.undoStack[this.undoStack.length - 1];
        if (this.mergingRecord && this.mergingKey === key && lastRecord === this.mergingRecord) {
            return;
        }

        this.endMerge();
        this.redoStack = [];
        this.mergingKey = key;
        this.mergingRecord = new RecordGroup([], name);
        this.undoStack.push(this.mergingRecord);
    }

    /** 结束当前的合并会话，没有记录的空组会被直接丢弃 */
    endMerge() {
        const group = this.mergingRecord;
        this.mergingRecord = null;
        this.mergingKey = null;
        if (!group) {
            return;
        }

        if (group.records.length === 0) {
            const index = this.undoStack.lastIndexOf(group);
            if (index !== -1) {
                this.undoStack.splice(index, 1);
            }
            return;
        }
        globalEventEmitter.emit("HISTORY_UPDATE", toUnique(group.records).map(record => NAME_MAP[record.type as keyof typeof NAME_MAP]));
    }

    /** 新增的命令是否加入到组中 */
    get grouped() {
        return this.groupDepth > 0;
    }
    group(name: string) {
        // 开启分组前先结束面板合并会话，避免两种记录混在一起
        this.endMerge();
        if (this.groupDepth > 0) {
            // 已经处于分组中（嵌套分组），嵌套的分组不再单独入栈，
            // 记录继续并入外层组，保证整个操作只占用一次撤销
            this.groupDepth++;
            return;
        }
        this.groupDepth = 1;
        this.redoStack = [];
        this.undoStack.push(new RecordGroup([], name));
    }
    ungroup() {
        if (this.groupDepth === 0) {
            // throw new Error("没有处于分组状态，无法取消分组");
            return;
        }
        this.groupDepth--;
        if (this.groupDepth > 0) {
            // 内层分组已关闭，但外层分组还会继续记录，等最外层关闭时再通知
            return;
        }

        const group = this.undoStack[this.undoStack.length - 1];
        if (!(group instanceof RecordGroup)) {
            // throw new Error("没有处于分组状态，无法取消分组");
            return;
        }

        if (group.records.length === 0) {
            // 空组直接从撤销栈中丢弃，不留下撤销/重做都无效的“死记录”
            this.undoStack.pop();
            return;
        }
        globalEventEmitter.emit("HISTORY_UPDATE", toUnique(group.records).map(record => NAME_MAP[record.type as keyof typeof NAME_MAP]));
    }
    undo() {
        // 防御：分组未正常关闭时（例如操作中途抛出异常），强制结束分组状态
        this.groupDepth = 0;

        // 先结束面板合并会话，让同一对象的编辑作为一个完整的撤销单元
        this.endMerge();
        const record = this.undoStack[this.undoStack.length - 1];
        if (!record) {
            throw new Error("没有可撤销的操作");
        }

        // 先执行撤销再移动记录。如果撤销执行失败，记录仍留在撤销栈中，状态不会被破坏
        record.undo();
        this.undoStack.pop();
        this.redoStack.push(record);
        globalEventEmitter.emit("HISTORY_UPDATE", "UNDO");
    }
    redo() {
        this.groupDepth = 0;
        this.endMerge();
        const record = this.redoStack[this.redoStack.length - 1];
        if (!record) {
            throw new Error("没有可重做的操作");
        }

        record.redo();
        this.redoStack.pop();
        this.undoStack.push(record);
        globalEventEmitter.emit("HISTORY_UPDATE", "REDO");
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

    /**
     * 返回这条记录所属对象的标识，用于把面板里对同一个对象的连续编辑合并成一条历史记录。
     * 返回 null 表示这条记录不参与合并（新增、删除等操作）
     */
    getMergeKey(): string | null {
        return null;
    }
}

/**
 * 深拷贝历史记录中保存的值。
 * Beats 是数组、RGBcolor 等是对象，元素的一些操作（如 makeSureBeatsValid）会原地修改它们，
 * 如果历史记录直接保存引用，记录中的新旧值会被后续操作污染，导致撤销/重做回到错误的状态
 */
function copyHistoryValue<T>(value: T): T {
    return cloneDeep(value);
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

        const note = store.addNote(copyHistoryValue(this.noteObject), this.judgeLineNumber, this.id);
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
        this.noteObject = copyHistoryValue(note.toObject());
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
        this.newValue = copyHistoryValue(newValue);
        this.oldValue = copyHistoryValue(oldValue ?? note[attribute]);
    }
    redo() {
        super.redo();
        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (note as any)[this.attribute] = copyHistoryValue(this.newValue);
    }
    undo() {
        super.undo();
        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (note as any)[this.attribute] = copyHistoryValue(this.oldValue);
    }
    getMergeKey(): string {
        return `note:${this.id}`;
    }
    getDescription(): string {
        return `将音符${this.id}的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

class RemoveNoteRecord extends HistoryRecord {
    readonly type = "removeNote";
    constructor(private noteObject: INote, private judgeLineNumber: number, private id: string) {
        super();
        this.noteObject = copyHistoryValue(noteObject);
    }
    redo() {
        super.redo();
        if (this.id === undefined) {
            throw new Error("RemoveNoteRecord: id is undefined");
        }

        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        this.noteObject = copyHistoryValue(note.toObject());
        this.judgeLineNumber = note.judgeLineNumber;
        store.removeNote(this.id);
    }
    undo() {
        super.undo();
        if (this.noteObject === undefined || this.judgeLineNumber === undefined) {
            throw new Error("AddNoteRecord: noteObject or judgeLineNumber is undefined");
        }

        const note = store.addNote(copyHistoryValue(this.noteObject), this.judgeLineNumber, this.id);
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

        const event = store.addEvent(copyHistoryValue(this.eventObject), this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
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
        this.eventObject = copyHistoryValue(event.toObject());
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
        this.newValue = copyHistoryValue(newValue);
        this.oldValue = copyHistoryValue(oldValue ?? event[attribute]);
    }
    redo(): void {
        super.redo();
        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} 不存在`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event as any)[this.attribute] = copyHistoryValue(this.newValue);
    }
    undo(): void {
        super.undo();
        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} 不存在`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event as any)[this.attribute] = copyHistoryValue(this.oldValue);
    }
    getMergeKey(): string {
        return `event:${this.id}`;
    }
    getDescription(): string {
        return `将事件${this.id}的${this.attribute}从${this.oldValue}修改为${this.newValue}`;
    }
}

class RemoveEventRecord extends HistoryRecord {
    readonly type = "removeEvent";
    constructor(private eventObject: IEvent<unknown>, private eventType: string, private eventLayerId: string, private judgeLineNumber: number, private id: string) {
        super();
        this.eventObject = copyHistoryValue(eventObject);
    }
    redo() {
        super.redo();
        if (this.id === undefined) {
            throw new Error("RemoveEventRecord: id is undefined");
        }

        const event = store.getEventById(this.id);
        if (!event) throw new Error(`Event ${this.id} not found`);
        this.eventObject = copyHistoryValue(event.toObject());
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

        const event = store.addEvent(copyHistoryValue(this.eventObject), this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
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
        (blockArea as any)[this.attribute] = copyHistoryValue(value);
    }
    getMergeKey(): string {
        return `blockArea:${this.blockAreaIndex}`;
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
        this.blockAreaObject = copyHistoryValue(blockAreaObject);
    }
    redo() {
        super.redo();
        const chart = store.useChart();
        const blockArea = chart.blockAreaList.find(blockArea => blockArea.index === this.blockAreaIndex);
        if (!blockArea) {
            throw new Error(`噪域${this.blockAreaIndex}不存在`);
        }
        this.blockAreaObject = copyHistoryValue(blockArea.toObject());
        this.position = chart.blockAreaList.indexOf(blockArea);
        store.removeBlockArea(blockArea);
        store.useManager("stateManager").notifyBlockAreaListChanged({ removedPosition: this.position });
    }
    undo() {
        super.undo();
        const blockArea = store.insertBlockArea(copyHistoryValue(this.blockAreaObject), this.position, this.blockAreaIndex);
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
        this.intervalObject = copyHistoryValue(intervalObject);
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
        const interval = blockArea.insertActiveInterval(copyHistoryValue(this.intervalObject), this.position);
        this.position = blockArea.activeIntervals.indexOf(interval);
    }
    private remove() {
        const blockArea = store.getBlockAreaById(this.blockAreaIndex);
        const interval = blockArea.activeIntervals[this.position];
        if (!interval) {
            throw new Error(`噪域${this.blockAreaIndex}中不存在第${this.position}个激活区间`);
        }
        this.intervalObject = copyHistoryValue(interval.toObject());
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
        this.newValue = copyHistoryValue(newValue);
        this.oldValue = copyHistoryValue(oldValue ?? interval[attribute]);
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
        (interval as any)[this.attribute] = copyHistoryValue(value);
    }
    getMergeKey(): string {
        return `interval:${this.blockAreaIndex}:${this.intervalIndex}`;
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