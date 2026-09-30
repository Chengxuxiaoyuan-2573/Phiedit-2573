/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter, { GlobalEventMap } from "./eventEmitter";
import { NoteType } from "./models/note";
import { isArray, isObject, isString } from "lodash";
import KeyboardUtils from "./tools/keyboardUtils";
import store from "./store";

const keyConfigs = {
    Space: "TOGGLE_PLAY",
    Q: ["CHANGE_TYPE", NoteType.Tap] as ["CHANGE_TYPE", NoteType],
    W: ["CHANGE_TYPE", NoteType.Drag] as ["CHANGE_TYPE", NoteType],
    E: ["CHANGE_TYPE", NoteType.Flick] as ["CHANGE_TYPE", NoteType],
    R: ["CHANGE_TYPE", NoteType.Hold] as ["CHANGE_TYPE", NoteType],
    I: "TOGGLE_PREVIEW",
    "[": "PREVIOUS_JUDGE_LINE",
    "]": "NEXT_JUDGE_LINE",
    A: "PREVIOUS_JUDGE_LINE",
    D: "NEXT_JUDGE_LINE",
    Esc: "UNSELECT_ALL",
    Del: "DELETE",
    Backspace: "DELETE",
    Up: "MOVE_UP",
    Down: "MOVE_DOWN",
    Left: "MOVE_LEFT",
    Right: "MOVE_RIGHT",
    T: {
        keydown: ["PREVIEW", true] as ["PREVIEW", boolean],
        keyup: "STOP_PREVIEW"
    },
    U: {
        keydown: ["PREVIEW", false] as ["PREVIEW", boolean],
        keyup: "STOP_PREVIEW"
    },

    // Ctrl
    "Ctrl B": "PASTE_MIRROR",
    "Ctrl S": "SAVE",
    "Ctrl A": "SELECT_ALL",
    "Ctrl X": "CUT",
    "Ctrl C": "COPY",
    "Ctrl V": "PASTE",
    "Ctrl M": "MOVE_TO_JUDGE_LINE",
    "Ctrl [": "MOVE_TO_PREVIOUS_JUDGE_LINE",
    "Ctrl ]": "MOVE_TO_NEXT_JUDGE_LINE",
    "Ctrl Shift V": "REPEAT",
    "Ctrl Z": "UNDO",
    "Ctrl Y": "REDO",

    // Meta（macOS Command 键）
    "Meta Z": "UNDO",
    "Meta Y": "REDO",
    "Meta Shift Z": "REDO",
    "Meta A": "SELECT_ALL",
    "Meta C": "COPY",
    "Meta V": "PASTE",
    "Meta X": "CUT",
    "Meta S": "SAVE",
    "Ctrl D": "DISABLE",
    "Ctrl E": "ENABLE",

    // Alt
    "Alt A": "REVERSE",
    "Alt S": "SWAP",
    "Alt D": "STICK",
    "Alt R": "RANDOM"
} as const;

type A = keyof GlobalEventMap | [keyof GlobalEventMap, ...Exclude<GlobalEventMap[keyof GlobalEventMap], []>];
type B = A | {
    keydown: A;
    keyup: A;
}
export default function getKeyHandler(e: KeyboardEvent, type: "keydown" | "keyup") {
    const key = KeyboardUtils.formatKey(e);

    const keydownup = (() => {
        if (type === "keydown") {
            return () => {
                store.pressedKeys.add(e.key);
                globalEventEmitter.emit("KEYDOWN", e.key);
            };
        }
        else {
            return () => {
                store.pressedKeys.delete(e.key);
                globalEventEmitter.emit("KEYUP", e.key);
            };
        }
    })();

    // 焦点位于输入框/文本框内时，保留浏览器与输入框的原生行为（文本撤销、删除字符等），
    // 不触发谱面快捷键，以免误删选中的 note 或误撤销画布
    if (KeyboardUtils.isEditableTarget(e)) {
        return keydownup;
    }

    if (key.startsWith("Ctrl") || key.startsWith("Meta")) {
        if (key !== "Ctrl R" && key !== "Ctrl Shift I" && key !== "Meta R" && key !== "Meta Shift I") {
            e.preventDefault();
        }
    }

    const stateManager = store.useManager("stateManager");

    if (!stateManager._state.autoplay) {
        return keydownup;
    }

    if (!(key in keyConfigs)) {
        return keydownup;
    }

    let keyConfig: B = keyConfigs[key as keyof typeof keyConfigs];

    if (isObject(keyConfig) && !isArray(keyConfig)) {
        keyConfig = keyConfig[type];
    }
    else {
        if (type === "keyup") {
            return keydownup;
        }
    }

    if (isString(keyConfig)) {
        return () => {
            keydownup();
            globalEventEmitter.emit(keyConfig);
        };
    }
    else {
        const eventName = keyConfig[0];
        return () => {
            keydownup();
            globalEventEmitter.emit(eventName, ...keyConfig.slice(1) as never);
        };
    }
}