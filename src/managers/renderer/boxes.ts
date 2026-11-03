/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Constants from "@/constants";
import { NoteType } from "@/models/rpe/note";
import store from "@/store";
import { BoxWithData } from "@/tools/box";
import Manager from "./abstract";
import { BaseEventLayer, baseEventTypes, extendedEventTypes } from "@/models/rpe/eventLayer";
import { SelectableElement } from "@/models/rpe/element";
import { blockAreaEventTracks, getBlockAreaEventTypeOfTrack } from "@/models/rpe/blockArea";

export default class BoxesManager extends Manager {
    /**
     * 获取碰撞箱。使用绝对坐标。
     * 绝对坐标的上下和相对坐标是相反的，也就是说，虽然返回的碰撞箱top会比bottom小，但转换成相对坐标后top就会比bottom大了
     */
    calculateBoxes(): BoxWithData<SelectableElement>[] {
        const stateManager = store.useManager("stateManager");
        if (stateManager._state.isEditingBlockArea) {
            return this.calculateBlockAreaModeBoxes();
        }

        const settingsManager = store.useManager("settingsManager");
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

    /**
     * 噪域编辑时的所有碰撞箱：噪域方块、激活区间、噪域事件。
     *
     * 三者的坐标系不同，这里统一换算成绝对坐标，方便鼠标管理器用同一套逻辑处理。
     */
    private calculateBlockAreaModeBoxes(): BoxWithData<SelectableElement>[] {
        return [
            ...this.calculateBlockAreaRegionBoxes(),
            ...this.calculateActiveIntervalBoxes(),
            ...this.calculateBlockAreaEventBoxes()
        ];
    }

    /** 噪域编辑区中噪域事件的碰撞箱，使用绝对坐标 */
    private calculateBlockAreaEventBoxes(): BoxWithData<SelectableElement>[] {
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");
        const blockArea = stateManager.currentBlockArea;
        const boxes: BoxWithData<SelectableElement>[] = [];
        if (!blockArea) {
            return boxes;
        }

        for (const [column, track] of blockAreaEventTracks.entries()) {
            const type = getBlockAreaEventTypeOfTrack(track);
            if (!type) {
                continue;
            }

            const events = blockArea.getEventsByType(type);
            const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (column + 0.5) / blockAreaEventTracks.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;
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

    /** 噪域编辑区中激活区间的碰撞箱，使用绝对坐标 */
    private calculateActiveIntervalBoxes(): BoxWithData<SelectableElement>[] {
        const stateManager = store.useManager("stateManager");
        const coordinateManager = store.useManager("coordinateManager");
        const blockArea = stateManager.currentBlockArea;
        const boxes: BoxWithData<SelectableElement>[] = [];
        if (!blockArea) {
            return boxes;
        }

        const column = blockAreaEventTracks.findIndex(track => getBlockAreaEventTypeOfTrack(track) === null);
        const eventX = Constants.EDITOR_VIEW_EVENTS_VIEWBOX.width * (column + 0.5) / blockAreaEventTracks.length + Constants.EDITOR_VIEW_EVENTS_VIEWBOX.left;
        for (const interval of blockArea.activeIntervals) {
            const startY = coordinateManager.getAbsolutePositionYOfSeconds(interval.cachedStartSeconds);
            const endY = coordinateManager.getAbsolutePositionYOfSeconds(interval.cachedEndSeconds);
            boxes.push(new BoxWithData(
                endY,
                startY,
                eventX - Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                eventX + Constants.EDITOR_VIEW_EVENT_WIDTH / 2,
                interval));
        }
        return boxes;
    }

    /**
     * 噪域编辑区中每个噪域方块的碰撞箱，使用绝对坐标。
     *
     * 绘制噪域方块和点击噪域方块使用同一套坐标计算，避免两边对不上。
     */
    private calculateBlockAreaRegionBoxes(): BoxWithData<SelectableElement>[] {
        const coordinateManager = store.useManager("coordinateManager");
        const chart = store.useChart();
        const boxes: BoxWithData<SelectableElement>[] = [];
        const halfWidth = Constants.EDITOR_VIEW_BLOCK_AREA_WIDTH / 2;
        const viewBox = Constants.EDITOR_VIEW_NOTES_VIEWBOX;
        for (const blockArea of chart.blockAreaList) {
            const x = coordinateManager.scaleX(blockArea.editorPositionX);
            const appearY = coordinateManager.getRelativePositionYOfSeconds(blockArea.cachedStartSeconds);
            const disappearY = coordinateManager.getRelativePositionYOfSeconds(blockArea.cachedEndSeconds);
            const top = Math.min(appearY, disappearY);
            const height = Math.max(Math.abs(disappearY - appearY), Constants.EDITOR_VIEW_BLOCK_AREA_MIN_HEIGHT);
            const clippedTop = Math.max(top, viewBox.top);
            const clippedBottom = Math.min(top + height, viewBox.bottom);
            if (clippedBottom <= clippedTop) {
                continue;
            }

            // 相对坐标下 clippedBottom 比 clippedTop 大，换算成绝对坐标后正好相反
            boxes.push(new BoxWithData(
                coordinateManager.absolute(clippedBottom),
                coordinateManager.absolute(clippedTop),
                x - halfWidth,
                x + halfWidth,
                blockArea));
        }
        return boxes;
    }
}
