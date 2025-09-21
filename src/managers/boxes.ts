import Constants from "@/constants";
import { NoteType } from "@/models/note";
import store from "@/store";
import { BoxWithData } from "@/tools/box";
import { NoteOrEvent } from "@/models/event";
import Manager from "./abstract";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/eventLayer";

export default class BoxesManager extends Manager {
    /**
     * 获取碰撞箱。使用绝对坐标。
     * 绝对坐标的上下和相对坐标是相反的，也就是说，虽然返回的碰撞箱top会比bottom小，但转换成相对坐标后top就会比bottom大了
     */
    calculateBoxes(): BoxWithData<NoteOrEvent>[] {
        const settingsManager = store.useManager("settingsManager");
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");
        const boxes = [];
        const canvas = store.useCanvas();
        const resourcePackage = store.useResourcePackage();

        const baseNoteSize = Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width * settingsManager._settings.noteSize;

        for (const note of stateManager.currentJudgeLine.notes) {
            const noteX = note.positionX * (Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / canvas.width) + Constants.EDITOR_VIEW_NOTES_VIEWBOX.left + Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / 2;
            if (note.type === NoteType.Hold) {
                const noteSkin = resourcePackage.getSkin(note.type, note.highlight);
                const noteScale = baseNoteSize / resourcePackage.getSkin(note.type, false).body.width;
                const noteWidth = noteSkin.body.width * note.size * noteScale;
                const noteStartY = coordinateManager.getAbsolutePositionYOfSeconds(note.cachedStartSeconds);
                const noteEndY = coordinateManager.getAbsolutePositionYOfSeconds(note.cachedEndSeconds);
                const box = new BoxWithData(noteEndY + noteSkin.end.height * noteScale, noteStartY - noteSkin.head.height * noteScale, noteX - noteWidth / 2, noteX + noteWidth / 2, note);
                boxes.push(box);
            }
            else {
                const noteSkin = resourcePackage.getSkin(note.type, note.highlight);
                const noteY = coordinateManager.getAbsolutePositionYOfSeconds(note.cachedStartSeconds);
                const noteScale = baseNoteSize / resourcePackage.getSkin(note.type, false).width;
                const noteWidth = noteSkin.width * note.size * noteScale;
                const box = new BoxWithData(noteY + noteSkin.height * noteScale / 2, noteY - noteSkin.height * noteScale / 2, noteX - noteWidth / 2, noteX + noteWidth / 2, note);
                boxes.push(box);
            }
        }

        const types = (() => {
            const eventLayer = stateManager.currentEventLayer;
            if (eventLayer instanceof BaseEventLayer) {
                return baseEventTypes;
            }
            else {
                return extendedEventTypes;
            }
        })();
        for (const [column, type] of Object.entries(types)) {
            const events = stateManager.currentEventLayer.getEventsByType(type);
            const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (+column + 0.5) / types.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;
            for (const event of events) {
                const eventStartY = coordinateManager.getAbsolutePositionYOfSeconds(event.cachedStartSeconds);
                const eventEndY = coordinateManager.getAbsolutePositionYOfSeconds(event.cachedEndSeconds);
                boxes.push(new BoxWithData(
                    eventEndY,
                    eventStartY,
                    eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                    eventX + Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                    event));
            }
        }
        return boxes;
    }
}