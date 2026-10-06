/**
 * @license MIT
 * Copyright © 2026 ECJKropas. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { reactive } from "vue";
import Manager from "./abstract";
import store from "@/store";
import { SEC_TO_MS } from "@/tools/mathUtils";
import { CALIBRATION_ONSETS_ABSOLUTE } from "@/data/calibrationOnsets";

/** 丢弃最前面的若干次按键（用户还在找节奏，手最不稳） */
const WARMUP = 4;

/** 达到这么多有效内点后才给出实时 offset */
const MIN_SAMPLES = 8;

/** 野值窗：|偏差 - 延迟中心| > 0.5 × onset 中位间隔 视为离群（围绕中位数，而非 0） */
const OUTLIER_RATIO = 0.5;

/**
 * 粗筛窗口（秒）：偏差的绝对值超过它，说明这次按键离任何 onset 都极远
 * （例如落在真值起点之前的死区、或乱按），直接丢弃。
 * 必须显著大于真实音频输出延迟（可达 400ms），否则高延迟设备会被误杀成"无有效样本"。
 */
const COARSE_WINDOW_SECONDS = 0.75;

function median(values: number[]): number {
    if (values.length === 0) return Number.NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** onset 的中位间隔（秒），用作野值窗宽度；数据固定，算一次即可 */
const ONSET_MEDIAN_INTERVAL: number = (() => {
    const iois: number[] = [];
    for (let i = 1; i < CALIBRATION_ONSETS_ABSOLUTE.length; i++) {
        iois.push(CALIBRATION_ONSETS_ABSOLUTE[i] - CALIBRATION_ONSETS_ABSOLUTE[i - 1]);
    }
    return median(iois);
})();

/** 校准过程中的实时状态（供 UI 绑定显示） */
export const calibrationState = reactive({
    active: false,

    /** 实时带符号 offset（毫秒），null=样本还不够 */
    offsetMs: null as number | null,

    /** 总按键数 */
    pressCount: 0,

    /** 参与计算的有效样本数 */
    validCount: 0,

    /** 已保存的最终 offset（毫秒） */
    savedOffsetMs: null as number | null,
});

export default class CalibrationManager extends Manager {
    /** 每个按键相对最近 onset 的有符号偏差（秒） */
    private deviations: number[] = [];

    onStart() {
        this.deviations = [];
        calibrationState.active = true;
        calibrationState.offsetMs = null;
        calibrationState.pressCount = 0;
        calibrationState.validCount = 0;
        calibrationState.savedOffsetMs = null;
    }

    onExit() {
        calibrationState.active = false;
    }

    /** 每次按键采样：t=当前音频时间，找最近 onset，算有符号偏差 */
    onKeyPress() {
        if (!calibrationState.active) return;

        // 防御：音频/谱面尚未就绪时 getSeconds() 会抛错，不能让单次按键异常打断整个采样
        let t: number;
        try {
            t = store.getSeconds();
        }
        catch {
            return;
        }

        let best = Number.POSITIVE_INFINITY;
        for (const onset of CALIBRATION_ONSETS_ABSOLUTE) {
            const d = t - onset;
            if (Math.abs(d) < Math.abs(best)) {
                best = d;
            }
        }
        this.deviations.push(best);
        calibrationState.pressCount = this.deviations.length;
        this.refresh();
    }

    /** 剔除热身与野值后，取带符号中位数作为 offset（秒） */
    private computeOffsetSeconds(): { offset: number; validCount: number } | null {
        const warm = this.deviations.slice(WARMUP);
        if (warm.length === 0) {
            return null;
        }

        // 第一阶段（粗筛）：用宽松的绝对窗口收集候选。
        // 偏差本身天然含系统性的音频输出延迟（可能 250~400ms），
        // 因此这里只剔除「离任意 onset 都极远」的荒谬值（如落在真值区外的死区按键），
        // 不能用窄窗，否则高延迟设备的所有样本都会被误杀。
        const coarseInliers = warm.filter(d => Math.abs(d) <= COARSE_WINDOW_SECONDS);
        if (coarseInliers.length < MIN_SAMPLES) {
            return null;
        }

        // 第二阶段：取粗筛样本的中位数作为延迟中心，再围绕它用窄窗剔除真正的离群点
        const center = median(coarseInliers);
        const fineWindow = ONSET_MEDIAN_INTERVAL * OUTLIER_RATIO;
        const inliers = coarseInliers.filter(d => Math.abs(d - center) <= fineWindow);
        if (inliers.length < MIN_SAMPLES) {
            // 窄窗内点不足时，退化为用全部粗筛样本（宁可不剔离群，也不要没有结果）
            return { offset: center, validCount: coarseInliers.length };
        }
        return { offset: median(inliers), validCount: inliers.length };
    }

    private refresh() {
        const result = this.computeOffsetSeconds();
        if (result === null) {
            calibrationState.offsetMs = null;
            calibrationState.validCount = 0;
            return;
        }
        calibrationState.offsetMs = Math.round(result.offset * SEC_TO_MS);
        calibrationState.validCount = result.validCount;
    }

    /** 退出前调用：若样本足够则写入全局设置 accompanimentLatency（秒） */
    saveIfEnough(): boolean {
        const result = this.computeOffsetSeconds();
        if (result === null) {
            return false;
        }

        const settingsManager = store.useManager("settingsManager");
        settingsManager.setSettings({ accompanimentLatency: result.offset });
        settingsManager.saveSettings();
        calibrationState.savedOffsetMs = Math.round(result.offset * SEC_TO_MS);
        return true;
    }
}
