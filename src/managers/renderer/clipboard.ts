/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { Beats, getBeatsValue, subBeats, addBeats } from "@/models/rpe/beats";
import globalEventEmitter from "@/eventEmitter";
import { createCatchErrorByMessage } from "@/tools/catchError";
import store from "@/store";
import Manager from "./abstract";
import { reactive } from "vue";
import { AbstractEvent, IEvent, isEvent } from "@/models/rpe/event";
import { SelectableElement } from "@/models/rpe/element";
import { INote, isNoteLike } from "@/models/rpe/note";
import { BLOCK_AREA_EVENT_LAYER_ID } from "@/models/rpe/blockArea";
import { cloneDeep } from "lodash";

type ClipboardEntry = { kind: "note", object: INote } | {
    kind: "event"
    object: IEvent<unknown>
    event: Pick<AbstractEvent, "id" | "judgeLineNumber" | "eventLayerId" | "type">
};

export default class ClipboardManager extends Manager {
    readonly clipboard: ClipboardEntry[] = reactive([]);
    constructor() {
        super();
        globalEventEmitter.on("CUT", createCatchErrorByMessage(() => {
            this.cut();
        }, "剪切"));
        globalEventEmitter.on("COPY", createCatchErrorByMessage(() => {
            this.copy();
        }, "复制"));
        globalEventEmitter.on("PASTE", createCatchErrorByMessage((time) => {
            this.paste(time);
        }, "粘贴"));
        globalEventEmitter.on("PASTE_MIRROR", createCatchErrorByMessage((time) => {
            this.pasteMirror(time);
        }, "镜像粘贴"));
    }

    /**
     * 剪切选中的元素
     */
    cut() {
        const mouseManager = store.useManager("mouseManager");
        mouseManager.checkMouseUp();
        const selectionManager = store.useManager("selectionManager");
        if (selectionManager.selectedElements.length === 0) {
            throw new Error("未选择任何元素");
        }

        if (selectionManager.selectedElements.some(element => !isNoteLike(element) && !isEvent(element))) {
            throw new Error("噪域和激活区间不能被剪切");
        }
        this.copy();
        selectionManager.deleteSelection();
    }

    /**
     * 复制选中的元素
     */
    copy() {
        const selectionManager = store.useManager("selectionManager");
        if (selectionManager.selectedElements.length === 0) {
            throw new Error("未选择任何元素");
        }

        // 噪域和激活区间不能复制，只复制音符和事件
        const copied: ClipboardEntry[] = [];
        for (const element of selectionManager.selectedElements) {
            if (isNoteLike(element)) {
                copied.push({ kind: "note", object: cloneDeep(element.toObject()) });
            }
            else if (isEvent(element)) {
                const { id, judgeLineNumber, eventLayerId, type } = element;
                copied.push({
                    kind: "event",
                    object: cloneDeep(element.toObject()),
                    event: { id, judgeLineNumber, eventLayerId, type }
                });
            }
        }

        if (copied.length === 0) {
            throw new Error("噪域和激活区间不能被复制");
        }
        this.clipboard.length = 0;
        this.clipboard.push(...copied);
    }

    /**
     * 把剪切板内的元素粘贴到鼠标位置
     */
    paste(time?: Beats, mirror = false) {
        if (this.clipboard.length === 0) {
            throw new Error("剪切板为空");
        }

        const stateManager = store.useManager("stateManager");
        const selectionManager = store.useManager("selectionManager");
        const mouseManager = store.useManager("mouseManager");
        const historyManager = store.useManager("historyManager");
        const coordinateManager = store.useManager("coordinateManager");
        mouseManager.checkMouseUp();
        const isEditingBlockArea = stateManager.state.isEditingBlockArea;
        const blockArea = stateManager.currentBlockArea;
        if (this.clipboard.some(entry => isEditingBlockArea !==
            (entry.kind === "event" && entry.event.eventLayerId === BLOCK_AREA_EVENT_LAYER_ID))) {
            throw new Error("请在对应的编辑模式下粘贴");
        }

        if (isEditingBlockArea && !blockArea) {
            throw new Error("当前谱面没有可粘贴的噪域");
        }

        const y = mouseManager.mouseY;
        const minStartTime = this.clipboard.reduce<Beats>((min, { object }) => {
            return getBeatsValue(min) < getBeatsValue(object.startTime) ? min : object.startTime;
        }, [Infinity, 0, 1]);
        const pasteTime = time ?? coordinateManager.attatchY(y);
        const delta = subBeats(pasteTime, minStartTime);
        const pasted = this.clipboard.map(entry => {
            const copy = cloneDeep(entry);
            copy.object.startTime = addBeats(copy.object.startTime, delta);
            copy.object.endTime = addBeats(copy.object.endTime, delta);
            return copy;
        });
        const events = pasted.filter(entry => entry.kind === "event");
        store.validateBlockAreaEventTimes(events.map(({ event, object }) => ({
            event, startTime: object.startTime, endTime: object.endTime, insertInto: blockArea?.index
        })));
        const elements = new Array<SelectableElement>();
        const sourceLayer = events[0]?.event.eventLayerId;
        const isSameBaseEventLayer = sourceLayer !== "X" && events.every(({ event }) => event.eventLayerId === sourceLayer);
        historyManager.group(mirror ? "镜像粘贴" : "粘贴");
        try {
            for (const entry of pasted) {
                if (entry.kind === "note") {
                    if (mirror) {
                        entry.object.positionX = -entry.object.positionX;
                    }

                    const note = store.addNote(entry.object, stateManager.state.currentJudgeLineNumber);
                    historyManager.recordAddNote(note.id);
                    elements.push(note);
                }
                else {
                    const { object, event: source } = entry;
                    if (mirror && (source.type === "moveX" || source.type === "moveY" || source.type === "rotate") &&
                        typeof object.start === "number" && typeof object.end === "number") {
                        object.start = -object.start;
                        object.end = -object.end;
                        if (object.transformStart !== undefined) {
                            object.transformStart = -object.transformStart;
                        }

                        if (object.transformEnd !== undefined) {
                            object.transformEnd = -object.transformEnd;
                        }
                    }

                    const layer = isEditingBlockArea || !isSameBaseEventLayer ? source.eventLayerId : stateManager.state.currentEventLayerId;
                    const owner = isEditingBlockArea ? blockArea!.index : stateManager.state.currentJudgeLineNumber;
                    const event = store.addEvent(object, source.type, layer, owner);
                    historyManager.recordAddEvent(event.id);
                    elements.push(event);
                }
            }
        }
        finally {
            historyManager.ungroup();
        }
        selectionManager.select(elements);
    }

    pasteMirror(time?: Beats) {
        this.paste(time, true);
    }
}
