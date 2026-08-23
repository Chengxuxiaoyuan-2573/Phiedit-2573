/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import globalEventEmitter from "@/eventEmitter";
import { Note, NoteType } from "@/models/note";
import store from "@/store";
import Manager from "./abstract";
import Constants from "@/constants";
import MathUtils, { Point } from "@/tools/mathUtils";

const HOLD_PREUNTOUCH = 0.22;

export enum LineColor {
    AP, FC, Normal
}

export default class JudgeManager extends Manager {
    combo: number = 0;
    score: number = 0;
    lineColor: LineColor = LineColor.AP;
    private cachedAllNotes: Note[];
    constructor() {
        super();
        const chart = store.useChart();
        this.cachedAllNotes = chart.getAllNotes();

        globalEventEmitter.on("HISTORY_UPDATE", () => {
            this.cachedAllNotes = chart.getAllNotes();
        });

        globalEventEmitter.on("RENDER_FRAME", () => {
            this.resetHitState();
            this.calculateScore();
            const stateManager = store.useManager("stateManager");
            if (!stateManager._state.isPreviewing) {
                return;
            }

            if (stateManager._state.autoplay) {
                return;
            }
            this.framely();
        });

        globalEventEmitter.on("KEYDOWN", () => {
            this.click();
        });
    }
    resetHitState() {
        const seconds = store.getSeconds();
        for (const note of this.cachedAllNotes) {
            // 如果当前时间小于击打时间，说明用户在音符被击打以后把进度条往回拖动了，重新把该音符设置为未击打状态
            if (note.hitSeconds && seconds < note.hitSeconds) {
                note.unhit();
                note.prejudgedSeconds = undefined;
            }

            if (note.type === NoteType.Hold) {
                const range = note.getJudgementRange();
                if (seconds < note.cachedStartSeconds - range.bad) {
                    note.missed = false;
                }
            }
            else {
                if (seconds < note.cachedStartSeconds) {
                    note.missed = false;
                }
            }
        }
    }
    calculateScore() {
        const seconds = store.getSeconds();
        let perfect = 0, good = 0, bad = 0, miss = 0, realNotes = 0;
        for (const note of this.cachedAllNotes) {
            const endSeconds = note.cachedEndSeconds;
            if (!note.isFake) {
                realNotes++;
                if (note.type !== NoteType.Hold || endSeconds - seconds <= HOLD_PREUNTOUCH) {
                    switch (note.getJudgement()) {
                        case "perfect":
                            perfect++;
                            break;
                        case "good":
                            good++;
                            break;
                        case "bad":
                            bad++;
                            break;
                        case "none":
                            if (note.missed) {
                                miss++;
                            }
                            break;
                    }
                }
            }
        }

        if (good === 0 && bad === 0 && miss === 0) {
            this.lineColor = LineColor.AP;
        }
        else if (bad === 0 && miss === 0) {
            this.lineColor = LineColor.FC;
        }
        else {
            this.lineColor = LineColor.Normal;
        }
        this.score = (perfect + good * Constants.CHART_VIEW_GOOD_RATE) / realNotes * Constants.CHART_VIEW_PERFECT_SCORE;
    }
    framely() {
        const resourcePackage = store.useResourcePackage();
        const settingsManager = store.useManager("settingsManager");
        const mouseManager = store.useManager("mouseManager");
        const coordinateManager = store.useManager("coordinateManager");
        const seconds = store.getSeconds();

        for (const note of this.cachedAllNotes) {
            if (note.isFake) {
                continue;
            }

            if (note.missed) {
                continue;
            }

            const startSeconds = note.cachedStartSeconds;
            const endSeconds = note.cachedEndSeconds;

            const threshold = settingsManager._settings.noteSize * note.size;
            const delta = startSeconds - seconds;
            const range = note.getJudgementRange();

            const distance = pointToLineDistance(
                note.cachedPosX,
                note.cachedPosY,
                note.cachedDir,
                coordinateManager.convertXToChart(mouseManager.mouseX),
                coordinateManager.convertYToChart(mouseManager.mouseY)
            );

            const timeValid = Math.abs(delta) <= range.bad;

            /** 按照 Drag 的判定，该音符是否能被鼠标判定上 */
            const mouseJudgeSucceed = mouseManager.mousePressed && distance <= threshold;

            /** 按照 Drag 的判定，该音符是否能被键盘判定上 */
            const keyboardJudgeSucceed = store.pressedKeys.size > 0;

            if (delta < -range.bad && note.hitSeconds === undefined && !note.missed) {
                note.missed = true;
                this.combo = 0;
                continue;
            }

            if (note.type === NoteType.Drag) {
                if (note.hitSeconds === undefined && note.prejudgedSeconds === undefined && timeValid && mouseJudgeSucceed) {
                    note.prejudgedSeconds = seconds;
                }
            }

            if (note.type === NoteType.Drag || note.type === NoteType.Flick) {
                if (note.hitSeconds === undefined && note.prejudgedSeconds === undefined && timeValid && keyboardJudgeSucceed) {
                    note.prejudgedSeconds = seconds;
                }
            }

            if (note.type === NoteType.Hold) {
                if (note.hitSeconds !== undefined) {
                    if (endSeconds - seconds > HOLD_PREUNTOUCH && !mouseJudgeSucceed && !keyboardJudgeSucceed) {
                        note.unhit();
                        note.missed = true;
                        this.combo = 0;
                    }
                }
            }

            if (note.type === NoteType.Drag || note.type === NoteType.Flick) {
                if (note.hitSeconds === undefined && note.prejudgedSeconds !== undefined && seconds >= startSeconds) {
                    note.hit(seconds);
                    resourcePackage.playSound(store.audioContext, note.type);
                    this.combo++;
                }
            }
        }
    }
    move(x: number, y: number) {
        const stateManager = store.useManager("stateManager");
        const mouseManager = store.useManager("mouseManager");
        const settingsManager = store.useManager("settingsManager");
        const coordinateManager = store.useManager("coordinateManager");
        const seconds = store.getSeconds();

        if (!stateManager._state.autoplay) {
            for (const note of this.cachedAllNotes) {
                if (note.isFake) {
                    continue;
                }

                if (note.missed) {
                    continue;
                }

                if (note.hitSeconds !== undefined || note.prejudgedSeconds !== undefined) {
                    continue;
                }

                if (note.type === NoteType.Flick) {
                    const startSeconds = note.cachedStartSeconds;

                    const range = note.getJudgementRange();
                    const delta = startSeconds - seconds;

                    if (Math.abs(delta) > range.bad) {
                        continue;
                    }

                    const threshold = settingsManager._settings.noteSize * note.size;

                    const distance = MathUtils.distance(x, y, coordinateManager.convertXToChart(mouseManager.mouseX), coordinateManager.convertYToChart(mouseManager.mouseY));

                    const judgeSucceed = distance >= 10 && existsPointOnSegmentWithinDistance(
                        { x: coordinateManager.convertXToChart(mouseManager.mouseX), y: coordinateManager.convertYToChart(mouseManager.mouseY) },
                        { x, y },
                        { x: note.cachedPosX, y: note.cachedPosY },
                        note.cachedDir,
                        threshold
                    );

                    if (mouseManager.mousePressed && judgeSucceed) {
                        note.prejudgedSeconds = seconds;
                    }
                }
            }
        }
    }
    click(x?: number, y?: number) {
        const stateManager = store.useManager("stateManager");
        const resourcePackage = store.useResourcePackage();
        const settingsManager = store.useManager("settingsManager");
        const seconds = store.getSeconds();
        if (!stateManager._state.autoplay) {
            for (const note of this.cachedAllNotes) {
                if (note.isFake) {
                    continue;
                }

                if (note.missed) {
                    continue;
                }

                if (!(note.type === NoteType.Tap || note.type === NoteType.Hold)) {
                    continue;
                }

                if (note.hitSeconds !== undefined) {
                    continue;
                }

                const startSeconds = note.cachedStartSeconds;
                const range = note.getJudgementRange();
                const delta = startSeconds - seconds;
                if (Math.abs(delta) > range.bad) {
                    continue;
                }

                const distance = x !== undefined && y !== undefined ?
                    pointToLineDistance(
                        note.cachedPosX,
                        note.cachedPosY,
                        note.cachedDir,
                        x,
                        y) :
                    0;

                if (distance <= settingsManager._settings.noteSize * note.size) {
                    note.hit(seconds);
                    resourcePackage.playSound(store.audioContext, note.type);
                    const judgement = note.getJudgement();
                    if (judgement === "bad") {
                        this.combo = 0;
                    }
                    else {
                        this.combo++;
                    }
                    break;
                }
            }
        }
    }
}
function pointToLineDistance(px: number, py: number, dir: number, qx: number, qy: number) {
    const vx = Math.sin(dir);
    const vy = Math.cos(dir);

    const dx = qx - px;
    const dy = qy - py;

    // 二维叉积的绝对值
    return Math.abs(dx * vy - dy * vx);
}

const EPSILON = 1e-12;

/**
 * 判断线段上是否存在一点，使其到直线的距离 ≤ maxDist
 * 直线由点 linePoint 和方向角 angleRad 确定
 *
 * @param {{x, y}} segP1 - 线段端点1
 * @param {{x, y}} segP2 - 线段端点2
 * @param {{x, y}} linePoint - 直线上一点
 * @param {number} angleRad - 直线的方向角（弧度）
 * @param {number} maxDist - 距离阈值（非负）
 * @returns {boolean}
 */
function existsPointOnSegmentWithinDistance(segP1: Point, segP2: Point, linePoint: Point, angleRad: number, maxDist: number) {
    if (maxDist < 0) return false;

    // 1. 提取坐标
    const { x: x1, y: y1 } = segP1;
    const { x: x2, y: y2 } = segP2;
    const { x: x0, y: y0 } = linePoint;

    // 2. 构造直线标准方程 Ax + By + C = 0
    // 方向角 θ，方向向量 V = (cosθ, -sinθ)
    // 法向量 N = (sinθ, cosθ)  （确保是单位向量）
    const A = Math.cos(angleRad);
    const B = -Math.sin(angleRad);

    // 将 linePoint 代入求 C： A*x0 + B*y0 + C = 0 => C = -A*x0 - B*y0
    const C = -(A * x0 + B * y0);

    // 3. 计算线段两端点在直线方程中的值（带符号）
    const val1 = A * x1 + B * y1 + C;
    const val2 = A * x2 + B * y2 + C;

    // 4. 因为法向量是单位向量，点到直线的距离就是 |f(P)|
    //    线段上任意点 P(t) = P1 + t*(P2-P1)，其函数值 f(t) = val1 + t*(val2 - val1)
    //    这是一个关于 t 的一次函数（t ∈ [0,1]）

    const diff = val2 - val1;

    // 情况1：函数为常数（线段与直线平行）
    if (Math.abs(diff) < EPSILON) {
        return Math.abs(val1) <= maxDist;
    }

    // 情况2：求一次绝对值函数 |val1 + t*diff| 在 [0,1] 上的最小值
    // 零点位置 t0 = -val1 / diff
    const t0 = -val1 / diff;

    // 最小值只可能出现在三个位置：t=0, t=1, 或 t0（如果 t0 在 0~1 之间）
    let minAbs = Math.min(Math.abs(val1), Math.abs(val2));
    if (t0 >= 0 && t0 <= 1) {
        minAbs = 0;
    }

    return minAbs <= maxDist;
}