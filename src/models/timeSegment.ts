import { Beats } from "./beats";

/** 时间段，只要有开始和结束时间就可以 */
export interface ITimeSegment {
    startTime: Beats;
    endTime: Beats;
    cachedStartSeconds: number;
    cachedEndSeconds: number;
}