import { getBeatsValue } from "@/models/beats";
import { easingFuncs } from "@/models/easing";
import { baseEventTypes, extendedEventTypes } from "@/models/eventLayer";
import { NoteFake, NoteAbove, INote, INoteExtendedOptions, isNoteLike } from "@/models/note";
import store from "@/store";
import { RGBcolor, invert } from "@/tools/color";
import Manager from "./abstract";
import { NoteNumberAttrs } from "./state";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { IEvent, IEventExtendedOptions, isColorEventLike, isEventLike, isNumberEventLike, isTextEventLike } from "@/models/event";

export default class MutipleEditManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("MUTIPLE_EDIT", createCatchErrorByMessage(() => {
            this.mutipleEdit();
        }, "批量编辑"));
    }
    mutipleEdit() {
        const selectionManager = store.useManager("selectionManager");
        const stateManager = store.useManager("stateManager");
        const historyManager = store.useManager("historyManager");
        const mouseManager = store.useManager("mouseManager");
        function modifyNoteWithNumber(note: INote & INoteExtendedOptions, attr: NoteNumberAttrs, value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
            let newValue: number;
            const randomRange = stateManager.cache.mutipleEdit.isRandom ? stateManager.cache.mutipleEdit.paramRandom : 0;
            const randomNumber = Math.random() * randomRange * 2 - randomRange;
            switch (mode) {
                case "to":
                    newValue = value + randomNumber;
                    break;
                case "by":
                    newValue = note[attr] + value + randomNumber;
                    break;
                case "times":
                    newValue = note[attr] * (value + randomNumber);
                    break;
                case "invert":
                    newValue = -note[attr];
                    break;
                default:
                    newValue = note[attr];
            }
            historyManager.recordModifyNote(note.id, attr, newValue, note[attr]);
            note[attr] = newValue;
        }

        function modifyEventWithNumber(event: IEvent<number> & IEventExtendedOptions, attr: "start" | "end" | "both", value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
            if (attr === "both") {
                modifyEventWithNumber(event, "start", value, mode);
                modifyEventWithNumber(event, "end", value, mode);
                return;
            }

            let newValue: number;
            const randomRange = stateManager.cache.mutipleEdit.isRandom ? stateManager.cache.mutipleEdit.paramRandom : 0;
            const randomNumber = Math.random() * randomRange * 2 - randomRange;
            switch (mode) {
                case "to":
                    newValue = value + randomNumber;
                    break;
                case "by":
                    newValue = event[attr] + value + randomNumber;
                    break;
                case "times":
                    newValue = event[attr] * (value + randomNumber);
                    break;
                case "invert":
                    newValue = -event[attr];
                    break;
                default:
                    newValue = event[attr];
            }
            historyManager.recordModifyEvent(event.id, attr, newValue, event[attr]);
            event[attr] = newValue;
        }

        function modifyEventWithColor(event: IEvent<RGBcolor> & IEventExtendedOptions, attr: "start" | "end" | "both", value: RGBcolor, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
            if (attr === "both") {
                modifyEventWithColor(event, "start", value, mode);
                modifyEventWithColor(event, "end", value, mode);
                return;
            }

            let newValue: RGBcolor;
            switch (mode) {
                case "to":
                    newValue = value;
                    break;
                case "invert":
                    newValue = invert(event[attr]);
                    break;
                default:
                    newValue = event[attr];
            }
            historyManager.recordModifyEvent(event.id, attr, newValue, event[attr]);
            event[attr] = newValue;
        }

        function modifyEventWithText(event: IEvent<string> & IEventExtendedOptions, attr: "start" | "end" | "both", value: string, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
            if (attr === "both") {
                modifyEventWithText(event, "start", value, mode);
                modifyEventWithText(event, "end", value, mode);
                return;
            }

            let newValue: string;
            switch (mode) {
                case "to":
                    newValue = value;
                    break;
                default:
                    newValue = event[attr];
            }
            historyManager.recordModifyEvent(event.id, attr, newValue, event[attr]);
            event[attr] = newValue;
        }
        mouseManager.checkMouseUp();
        historyManager.group("批量编辑");
        if (stateManager.cache.mutipleEdit.type === "note") {
            const notes = selectionManager.selectedElements.filter(element => isNoteLike(element)).sort((a, b) => {
                const beatsA = getBeatsValue(a.startTime);
                const beatsB = getBeatsValue(b.startTime);
                if (beatsA !== beatsB) {
                    return beatsA - beatsB;
                }
                else {
                    return a.judgeLineNumber - b.judgeLineNumber;
                }
            });
            const length = notes.length;
            if (length === 0) {
                historyManager.ungroup();
                throw new Error(`当前没有选中音符`);
            }
            notes.forEach((note, i) => {
                const value = stateManager.cache.mutipleEdit.isDynamic ?
                    stateManager.cache.mutipleEdit.paramStart + easingFuncs[stateManager.cache.mutipleEdit.paramEasing](length === 1 ? 0 : i / (length - 1)) * (stateManager.cache.mutipleEdit.paramEnd - stateManager.cache.mutipleEdit.paramStart) :
                    stateManager.cache.mutipleEdit.param;
                const attrName = stateManager.cache.mutipleEdit.attributeNote;
                if (attrName === "isFake") {
                    if (stateManager.cache.mutipleEdit.mode === "invert") {
                        historyManager.recordModifyNote(note.id, "isFake", note.isFake === NoteFake.Fake ? NoteFake.Real : NoteFake.Fake, note.isFake);
                        note.isFake = note.isFake === NoteFake.Fake ? NoteFake.Real : NoteFake.Fake;
                    }
                    else {
                        historyManager.recordModifyNote(note.id, "isFake", stateManager.cache.mutipleEdit.paramBoolean ? NoteFake.Fake : NoteFake.Real, note.isFake);
                        note.isFake = stateManager.cache.mutipleEdit.paramBoolean ? NoteFake.Fake : NoteFake.Real;
                    }
                }
                else if (attrName === "above") {
                    if (stateManager.cache.mutipleEdit.mode === "invert") {
                        historyManager.recordModifyNote(note.id, "above", stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Below : NoteAbove.Above, note.above);
                        note.above = note.above === NoteAbove.Above ? NoteAbove.Below : NoteAbove.Above;
                    }
                    else {
                        historyManager.recordModifyNote(note.id, "above", stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Above : NoteAbove.Below, note.above);
                        note.above = stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Above : NoteAbove.Below;
                    }
                }
                else if (attrName === "type") {
                    historyManager.recordModifyNote(note.id, "type", stateManager.cache.mutipleEdit.paramNoteType, note.type);
                    note.type = stateManager.cache.mutipleEdit.paramNoteType;
                }
                else {
                    modifyNoteWithNumber(note, attrName, value, stateManager.cache.mutipleEdit.mode);
                }
            });
        }
        else {
            const eventTypes = stateManager.cache.mutipleEdit.eventTypes.length === 0 ?
                [...baseEventTypes, ...extendedEventTypes] :
                stateManager.cache.mutipleEdit.eventTypes;
            let isSucceeded = false;
            for (const eventType of eventTypes) {
                const events = selectionManager.selectedElements.filter(element => isEventLike(element) && element.type === eventType).sort((a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime)) as (IEvent & IEventExtendedOptions)[];
                const length = events.length;
                if (length > 0) {
                    isSucceeded = true;
                }
                else {
                    continue;
                }
                events.forEach((event, i) => {
                    const attrName = stateManager.cache.mutipleEdit.attributeEvent;
                    if (attrName === "easingType") {
                        historyManager.recordModifyEvent(event.id, "easingType", stateManager.cache.mutipleEdit.paramEasing, event.easingType);
                        event.easingType = stateManager.cache.mutipleEdit.paramEasing;
                    }
                    else if (isNumberEventLike(event)) {
                        const start = stateManager.cache.mutipleEdit.paramStart;
                        const end = stateManager.cache.mutipleEdit.paramEnd;
                        const param = stateManager.cache.mutipleEdit.param;
                        const easing = stateManager.cache.mutipleEdit.paramEasing;

                        const value = stateManager.cache.mutipleEdit.isDynamic ?
                            easingFuncs[easing](length === 1 ? 0 : i / (length - 1)) * (end - start) + start :
                            param;

                        modifyEventWithNumber(event, attrName, value, stateManager.cache.mutipleEdit.mode);
                    }
                    else if (isColorEventLike(event)) {
                        const param: RGBcolor = stateManager.cache.mutipleEdit.paramColor;
                        const easing = stateManager.cache.mutipleEdit.paramEasing;
                        const value = stateManager.cache.mutipleEdit.isDynamic ?
                            ([0, 1, 2] as const).map(num => {
                                const start = stateManager.cache.mutipleEdit.paramStartColor[num];
                                const end = stateManager.cache.mutipleEdit.paramEndColor[num];
                                return easingFuncs[easing](length === 1 ? 0 : i / (length - 1)) * (end - start) + start;
                            }) as RGBcolor : param;

                        modifyEventWithColor(event, attrName, value, stateManager.cache.mutipleEdit.mode);
                    }
                    else if (isTextEventLike(event)) {
                        const param = stateManager.cache.mutipleEdit.paramText;
                        const value = param;

                        modifyEventWithText(event, attrName, value, stateManager.cache.mutipleEdit.mode);
                    }
                });
            }

            if (!isSucceeded) {
                throw new Error(`当前没有选中${stateManager.cache.mutipleEdit.eventTypes.join("、")}事件`);
            }
        }
        historyManager.ungroup();
    }
}