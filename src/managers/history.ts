import globalEventEmitter from "@/eventEmitter";
import { eventAttributes, IEvent } from "@/models/event";
import { INote, noteAttributes } from "@/models/note";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
import Manager from "./abstract";

export default class HistoryManager extends Manager {
    /** 撤销栈，最先被执行的操作在最前面 */
    undoStack: Command[] = [];
    /** 重做栈，最先被撤销的操作在最前面 */
    redoStack: Command[] = [];
    constructor() {
        super();
        globalEventEmitter.on("UNDO", createCatchErrorByMessage(() => {
            this.undo();
        }, "撤销"))
        globalEventEmitter.on("REDO", createCatchErrorByMessage(() => {
            this.redo();
        }, "重做"))
    }
    getSize() {
        function _getSize(stack: Command[]) {
            let sum = 0;
            for (const command of stack) {
                if (command instanceof CommandGroup) {
                    sum += _getSize(command.commands);
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
        globalEventEmitter.emit("HISTORY_UPDATE");
    }
    private addCommand<C extends Command>(command: C) {
        const lastCommand = this.undoStack[this.undoStack.length - 1];
        if (this.grouped && lastCommand instanceof CommandGroup) {
            lastCommand.commands.push(command);
        }
        else {
            this.undoStack.push(command);
        }
        globalEventEmitter.emit("HISTORY_UPDATE");
    }
    addNote(noteObject: INote, judgeLineNumber: number) {
        const command = new AddNoteCommand(noteObject, judgeLineNumber);
        const note = command.execute();
        this.addCommand(command);
        return note;
    }
    modifyNote<T extends typeof noteAttributes[number]>(id: string, attribute: T, newValue: INote[T], oldValue?: INote[T]) {
        const command = new ModifyNoteCommand(id, attribute, newValue, oldValue);
        command.execute();
        this.addCommand(command);
    }
    removeNote(id: string) {
        const command = new RemoveNoteCommand(id);
        command.execute();
        this.addCommand(command);
    }
    addEvent(eventObject: IEvent<unknown>, eventType: string, eventLayerId: string, judgeLineNumber: number) {
        const command = new AddEventCommand(eventObject, eventType, eventLayerId, judgeLineNumber);
        const event = command.execute();
        this.addCommand(command);
        return event;
    }
    modifyEvent<T extends typeof eventAttributes[number]>(id: string, attribute: T, newValue: IEvent<unknown>[T], oldValue?: IEvent<unknown>[T]) {
        const command = new ModifyEventCommand(id, attribute, newValue, oldValue);
        command.execute();
        this.addCommand(command);
    }
    removeEvent(id: string) {
        const command = new RemoveEventCommand(id);
        command.execute();
        this.addCommand(command);
    }
    /** 新增的命令是否加入到组中 */
    grouped = false;
    group(name: string) {
        if (this.grouped) {
            throw new Error("已经处于分组状态，无法再次分组");
        }
        this.grouped = true;
        this.undoStack.push(new CommandGroup([], name));
    }
    ungroup() {
        if (!this.grouped) {
            throw new Error("没有处于分组状态，无法取消分组");
        }
        this.grouped = false;
    }
    undo() {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            globalEventEmitter.emit("HISTORY_UPDATE");
        }
        else {
            throw new Error("没有可撤销的操作")
        }
    }
    redo() {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            globalEventEmitter.emit("HISTORY_UPDATE");
        }
        else {
            throw new Error("没有可重做的操作")
        }
    }
}
abstract class Command {
    protected isExecuted = false;
    execute() {
        if (!this.isExecuted) {
            this.isExecuted = true;
        }
        else {
            throw new Error(`${this.constructor.name}: Command already executed`);
        }
    }
    undo() {
        if (this.isExecuted) {
            this.isExecuted = false;
        }
        else {
            throw new Error(`${this.constructor.name}: Command not executed`);
        }
    }
    abstract getDescription(): string;
}
class AddNoteCommand extends Command {
    private id: string | undefined = undefined;
    constructor(private noteObject: INote, private judgeLineNumber: number) {
        super();
    }
    execute() {
        super.execute();
        const note = store.addNote(this.noteObject, this.judgeLineNumber, this.id);
        this.id = note.id;
        return note;
    }
    undo() {
        super.undo();
        if (this.id == undefined) {
            throw new Error(`${this.constructor.name}: id is undefined`);
        }
        store.removeNote(this.id);
    }
    getDescription() {
        return `添加音符 ${this.id}`
    }
}
class ModifyNoteCommand<T extends typeof noteAttributes[number]> extends Command {
    constructor(private id: string,
        private attribute: T,
        private newValue: INote[T],
        private oldValue?: INote[T]) {
        super();
        const note = store.getNoteById(id);
        if (!note) throw new Error(`Note ${id} not found`);
        this.oldValue = oldValue ?? note[attribute];
    }
    execute() {
        super.execute();
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
class RemoveNoteCommand extends Command {
    private noteObject: INote | undefined = undefined;
    private judgeLineNumber: number | undefined = undefined;
    constructor(private id: string) {
        super();
    }
    execute() {
        super.execute();
        const note = store.getNoteById(this.id);
        if (!note) throw new Error(`Note ${this.id} not found`);
        this.noteObject = note.toObject();
        this.judgeLineNumber = note.judgeLineNumber;
        store.removeNote(this.id);
    }
    undo() {
        super.undo();
        if (this.noteObject == undefined || this.judgeLineNumber == undefined) {
            throw new Error(`${this.constructor.name}: noteObject or judgeLineNumber is undefined`);
        }
        const note = store.addNote(this.noteObject, this.judgeLineNumber, this.id);
        this.id = note.id;
        return note;
    }
    getDescription() {
        return `删除音符 ${this.id}`
    }
}
class AddEventCommand extends Command {
    private id: string | undefined = undefined;
    constructor(private eventObject: IEvent<unknown>, private eventType: string, private eventLayerId: string, private judgeLineNumber: number) {
        super();
    }
    execute() {
        super.execute();
        const event = store.addEvent(this.eventObject, this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
        this.id = event.id;
        return event;
    }
    undo() {
        super.undo();
        if (this.id == undefined) {
            throw new Error(`${this.constructor.name}: id is undefined`);
        }
        store.removeEvent(this.id);
    }
    getDescription() {
        return `添加事件 ${this.id}`
    }
}
class ModifyEventCommand<T extends typeof eventAttributes[number]> extends Command {
    constructor(private id: string,
        private attribute: T,
        private newValue: IEvent<unknown>[T],
        private oldValue?: IEvent<unknown>[T]) {
        super();
        const event = store.getEventById(id);
        if (!event) throw new Error(`Event ${id} 不存在`);
        this.oldValue = oldValue ?? event[attribute];
    }
    execute(): void {
        super.execute();
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
class RemoveEventCommand extends Command {
    private eventObject: IEvent<unknown> | undefined = undefined;
    private judgeLineNumber: number | undefined = undefined;
    private eventLayerId: string | undefined = undefined;
    private eventType: string | undefined = undefined;
    constructor(private id: string) {
        super();
    }
    execute() {
        super.execute();
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
        if (this.eventObject == undefined || this.judgeLineNumber == undefined || this.eventLayerId == undefined || this.eventType == undefined) {
            throw new Error(`${this.constructor.name}: eventObject or judgeLineNumber or eventLayerId or eventType is undefined`);
        }
        store.addEvent(this.eventObject, this.eventType, this.eventLayerId, this.judgeLineNumber, this.id);
    }
    getDescription() {
        return `删除事件 ${this.id}`
    }
}
class CommandGroup extends Command {
    constructor(readonly commands: Command[], private readonly name: string) {
        super();
        this.isExecuted = true;
    }
    execute() {
        super.execute();
        for (const command of this.commands) {
            command.execute();
        }
    }
    undo() {
        super.undo();
        for (const command of this.commands.toReversed()) {
            command.undo();
        }
    }
    getDescription() {
        return `${this.name}（包含${this.commands.length}个操作）`;
    }
}