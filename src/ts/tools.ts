import { BPM, Beats, RGBAcolor } from "@/ts/typeDefinitions";
export function moveAndRotate(x1: number, y1: number, dir: number, x2: number, y2: number) {
    // 初始方向向量（单位向量）  
    const dx = Math.cos(dir * (Math.PI / 180)); // x方向分量  
    const dy = -Math.sin(dir * (Math.PI / 180)); // y方向分量  
    // 计算初始移动后的坐标  
    const x2_new = x1 + x2 * dx;
    const y2_new = y1 + x2 * dy;
    // 左转90度后的新方向向量  
    const newDx = -dy; // 原来的y分量变成新的-x分量  
    const newDy = dx;  // 原来的x分量变成新的y分量  
    // 计算最终坐标  
    const x_final = x2_new + y2 * newDx;
    const y_final = y2_new + y2 * newDy;
    return { x: x_final, y: y_final };
}
export function convertBeatsToSeconds(BPMList: BPM[], beats: Beats) {
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
export function convertSecondsToBeatsValue(BPMList: BPM[], seconds: number) {
    let beatsValue = 0;
    for (let i = 0; i < BPMList.length; i++) {
        const thisBpm = BPMList[i];
        const nextBpm = BPMList[i + 1];
        const thisSeconds = convertBeatsToSeconds(BPMList, thisBpm.startTime);
        const nextSeconds = i == BPMList.length - 1 ? Infinity : convertBeatsToSeconds(BPMList, nextBpm.startTime);
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
export function convertPositionX(x: number) {
    return x + 675;
}
export function convertPositionY(y: number) {
    return 450 - y;
}
export function data(bytes: number, p = 2) {
    if (!isFinite(bytes) || isNaN(bytes)) {
        throw new Error("Invalid number: " + bytes);
    }
    if (bytes < 1024) {
        return bytes + "B";
    }
    else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(p) + "KB";
    }
    else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(p) + "MB";
    }
    else if (bytes < 1024 * 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(p) + "GB";
    }
    else {
        return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(p) + "TB";
    }
}
export function color(num: number): RGBAcolor {
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff, (num >> 24) & 0xff];
}
export function playSound(audioContext: AudioContext, audioBuffer: AudioBuffer) {
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioContext.destination);
    bufferSource.start();
}
export function mod(x: number, y: number) {
    return (x % y + y) % y;
}