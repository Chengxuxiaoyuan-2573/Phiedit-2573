import globalEventEmitter from "@/eventEmitter";
import Manager from "./abstract";
import store from "@/store";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { isEventLike } from "@/models/event";

export default class EventAbillitiesManager extends Manager {
    constructor() {
        super();
        globalEventEmitter.on("DISABLE", createCatchErrorByMessage(() => {
            this.disable();
        }, "禁用事件"));
        globalEventEmitter.on("ENABLE", createCatchErrorByMessage(() => {
            this.enable();
        }, "启用事件"));
    }
    disable() {
        const selectionManager = store.useManager("selectionManager");
        for (const selectedElement of selectionManager.selectedElements) {
            if (isEventLike(selectedElement)) {
                selectedElement.isDisabled = true;
            }
        }
    }
    enable() {
        const selectionManager = store.useManager("selectionManager");
        for (const selectedElement of selectionManager.selectedElements) {
            if (isEventLike(selectedElement)) {
                selectedElement.isDisabled = false;
            }
        }
    }
}