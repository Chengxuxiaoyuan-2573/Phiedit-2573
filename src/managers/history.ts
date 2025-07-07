import globalEventEmitter from "@/eventEmitter";
import { IEvent } from "@/models/event";
import { INote } from "@/models/note";
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
    clearRedoStack() {
        this.redoStack = [];
    }
    addNote(noteObject: INote, judgeLineNumber: number) {
        const command = new AddNoteCommand(noteObject, judgeLineNumber);
        const note = command.execute();
        this.undoStack.push(command);
        return note;
    }
    removeNote(id: string) {
        const command = new RemoveNoteCommand(id);
        command.execute();
        this.undoStack.push(command);
    }
    addEvent(eventObject: IEvent<unknown>, eventType: string, eventLayerId: string, judgeLineNumber: number) {
        const command = new AddEventCommand(eventObject, eventType, eventLayerId, judgeLineNumber);
        const event = command.execute();
        this.undoStack.push(command);
        return event;
    }
    removeEvent(id: string) {
        const command = new RemoveEventCommand(id);
        command.execute();
        this.undoStack.push(command);
    }
    undo() {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
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
        }
        else {
            throw new Error("没有可重做的操作")
        }
    }
}
abstract class Command {
    private isExecuted = false;
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