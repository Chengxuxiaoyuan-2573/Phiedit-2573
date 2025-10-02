/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter, { GlobalEventMap } from "./eventEmitter";
import { NoteType } from "./models/note";
import { isArray, isObject, isString } from "lodash";
import KeyboardUtils from "./tools/keyboardUtils";

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
    if (key.startsWith("Ctrl")) {
        if (key !== "Ctrl R" && key !== "Ctrl Shift I") {
            e.preventDefault();
        }
    }

    const EMPTY_FUNCTION = () => { };

    if (!(key in keyConfigs)) {
        return EMPTY_FUNCTION;
    }

    let keyConfig: B = keyConfigs[key as keyof typeof keyConfigs];

    if (isObject(keyConfig) && !isArray(keyConfig)) {
        keyConfig = keyConfig[type];
    }
    else {
        if (type === "keyup") {
            return EMPTY_FUNCTION;
        }
    }

    if (isString(keyConfig)) {
        return () => {
            globalEventEmitter.emit(keyConfig);
        };
    }
    else {
        const eventName = keyConfig[0];
        return () => {
            globalEventEmitter.emit(eventName, ...keyConfig.slice(1) as never);
        };
    }
}