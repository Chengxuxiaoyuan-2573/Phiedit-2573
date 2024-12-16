import { gcd } from "../tools";
import { BPM } from "../typeDefinitions";

export type Beats = [number, number, number];

export function beatsToSeconds(BPMList: BPM[], beats: Beats) {
    let seconds = 0;
    const beatsValue = getBeatsValue(beats);
    BPMList.filter(bpm => beatsValue > getBeatsValue(bpm.startTime))
        .toSorted((x, y) => getBeatsValue(x.startTime) - getBeatsValue(y.startTime))
        .forEach((bpm, i, BPMList) => {
            if (i == BPMList.length - 1) {
                seconds += (beatsValue - getBeatsValue(bpm.startTime)) / bpm.bpm * 60;
            }
            else {
                seconds += (getBeatsValue(BPMList[i + 1].startTime) - getBeatsValue(bpm.startTime)) / bpm.bpm * 60;
            }
        });
    return seconds;
}

export function getBeatsValue(beats: Beats) {
    return beats[0] + beats[1] / beats[2];
}

export function validateBeats(beats: Beats) {
    beats[0] += Math.floor(beats[1] / beats[2]);
    beats[1] %= beats[2];
    const g = gcd(beats[1], beats[2]);
    beats[1] /= g;
    beats[2] /= g;
    return beats;
}