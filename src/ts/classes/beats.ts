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

export function secondsToBeatsValue(BPMList: BPM[], seconds: number) {
    let beatsValue = 0;
    for (let i = 0; i < BPMList.length; i++) {
        const thisBpm = BPMList[i];
        const nextBpm = BPMList[i + 1];
        const thisSeconds = beatsToSeconds(BPMList, thisBpm.startTime);
        const nextSeconds = i == BPMList.length - 1 ? Infinity : beatsToSeconds(BPMList, nextBpm.startTime);
        if (seconds >= thisSeconds && seconds < nextSeconds) {
            beatsValue += thisBpm.bpm * (seconds - thisSeconds) / 60;
            break;
        }
        else if (seconds >= nextSeconds) {
            beatsValue += thisBpm.bpm * (nextSeconds - thisSeconds) / 60;
        }
    }
    return beatsValue;
}