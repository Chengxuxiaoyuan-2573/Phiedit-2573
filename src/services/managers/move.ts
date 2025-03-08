import { addBeats, subBeats } from "@/classes/beats";
import { NumberEvent } from "@/classes/event";
import { Note } from "@/classes/note";
import { SelectedElement } from "@/types";
import Constants from "../constants";
import selectionManager from "./selection";
import stateManager from "./state";
import store from "@/store";
import globalEventEmitter from "@/eventEmitter";

class MoveManager {
    constructor(){
        globalEventEmitter.on("MOVE_LEFT", () => {
            this.moveLeft();
        })
        globalEventEmitter.on("MOVE_RIGHT", () => {
            this.moveRight();
        })
        globalEventEmitter.on("MOVE_UP", () => {
            this.moveUp();
        })
        globalEventEmitter.on("MOVE_DOWN", () =>{
            this.moveDown();
        })
    }
    /**
     * 左移
     */
    moveLeft() {
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX -= Constants.mainViewBox.width / (stateManager.verticalLineCount - 1);
            }
        }
    }
    /**
     * 右移
     */
    moveRight() {
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                element.positionX += Constants.mainViewBox.width / (stateManager.verticalLineCount - 1);
            }
        }
    }
    /**
     * 上移
     */
    moveUp() {
        for (const element of selectionManager.selectedElements) {
            element.startTime = addBeats(element.startTime, [0, 1, stateManager.horizonalLineCount]);
            element.endTime = addBeats(element.endTime, [0, 1, stateManager.horizonalLineCount]);
        }
    }
    /**
     * 下移
     */
    moveDown() {
        for (const element of selectionManager.selectedElements) {
            element.startTime = subBeats(element.startTime, [0, 1, stateManager.horizonalLineCount]);
            element.endTime = subBeats(element.endTime, [0, 1, stateManager.horizonalLineCount]);
        }
    }

    moveToJudgeLine(targetJudgeLineNumber: number) {
        const chart = store.useChart();
        const targetJudgeLine = chart.judgeLineList[targetJudgeLineNumber];
        const elements = new Array<SelectedElement>();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                targetJudgeLine.notes.push(element);
            }
            else if (element instanceof NumberEvent) {
                switch (element.type) {
                    case 'moveX':
                        targetJudgeLine.eventLayers[0].moveXEvents.push(element);
                        break;
                    case 'moveY':
                        targetJudgeLine.eventLayers[0].moveYEvents.push(element);
                        break;
                    case 'rotate':
                        targetJudgeLine.eventLayers[0].rotateEvents.push(element);
                        break;
                    case 'alpha':
                        targetJudgeLine.eventLayers[0].alphaEvents.push(element);
                        break;
                    case 'speed':
                        targetJudgeLine.eventLayers[0].speedEvents.push(element);
                        break;
                }
            }
            elements.push(element);
        }
        selectionManager.deleteSelection();
        stateManager.currentJudgeLineNumber = targetJudgeLineNumber;
        selectionManager.select(...elements);
    }
    copyToJudgeLine(targetJudgeLineNumber: number) {
        const chart = store.useChart();
        const targetJudgeLine = chart.judgeLineList[targetJudgeLineNumber];
        const elements = new Array<SelectedElement>();
        for (const element of selectionManager.selectedElements) {
            if (element instanceof Note) {
                targetJudgeLine.notes.push(new Note(element, chart.BPMList));
            }
            else if (element instanceof NumberEvent) {
                switch (element.type) {
                    case 'moveX':
                        targetJudgeLine.eventLayers[0].moveXEvents.push(new NumberEvent(element, chart.BPMList, 'moveX'));
                        break;
                    case 'moveY':
                        targetJudgeLine.eventLayers[0].moveYEvents.push(new NumberEvent(element, chart.BPMList, 'moveY'));
                        break;
                    case 'rotate':
                        targetJudgeLine.eventLayers[0].rotateEvents.push(new NumberEvent(element, chart.BPMList, 'rotate'));
                        break;
                    case 'alpha':
                        targetJudgeLine.eventLayers[0].alphaEvents.push(new NumberEvent(element, chart.BPMList, 'alpha'));
                        break;
                    case 'speed':
                        targetJudgeLine.eventLayers[0].speedEvents.push(new NumberEvent(element, chart.BPMList, 'speed'));
                        break;
                }
            }
            elements.push(element);
        }
        selectionManager.unselectAll();
        stateManager.currentJudgeLineNumber = targetJudgeLineNumber;
        selectionManager.select(...elements);
    }
}
export default new MoveManager();