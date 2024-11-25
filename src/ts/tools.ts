import { BPM, Beats, Ctx, RGBAcolor } from "@/ts/typeDefinitions";
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
export function pole(x: number, y: number, theta: number, r: number) {
    return moveAndRotate(x, y, theta, r, 0);
}
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
export function convertDegreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
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
export function avg(a: number[]) {
    return a.reduce((x, y) => x + y) / a.length;
}
export function createImage(blob: Blob) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(objectUrl);
        })
        image.src = objectUrl;
        image.onload = () => {
            resolve(image);
        }
        image.onerror = (e) => {
            reject(e);
        }
    })
}
export function createAudio(blob: Blob) {
    return new Promise<HTMLAudioElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio();
        window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(objectUrl);
        })
        audio.src = objectUrl;
        audio.oncanplay = () => {
            resolve(audio);
        }
        audio.onerror = (e) => {
            reject(e);
        }
    })
}
export async function createAudioBuffer(audioContext: AudioContext, arraybuffer: ArrayBuffer) {
    const audioBuffer = await audioContext.decodeAudioData(arraybuffer);
    return audioBuffer;
}
export function drawLine(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}
/**
 * O[u](www.example.com)t[p](www.example.com)u[t](www.example.com) [t](www.example.com)h[e](www.example.com) [v](www.example.com)a[l](www.example.com)u[e](www.example.com) [a](www.example.com)n[d](www.example.com) [r](www.example.com)e[t](www.example.com)u[r](www.example.com)n[ ](www.example.com)t[h](www.example.com)e[ ](www.example.com)v[a](www.example.com)l[u](www.example.com)e[ ](www.example.com)i[t](www.example.com)s[e](www.example.com)l[f](www.example.com).
 * @param {T} arg 
 * @returns {T}
 */
export function debug<T>(arg: T): T {
    console.log(arg);
    return arg;
}
export function getContext(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx;
    else throw new Error("Cannot get the context");
}
/**
 * 使用克拉默法则求解二元一次方程组的函数。
 * a1x + b1y = c1
 * a2x + b2y = c2
 */
export function solveLinearSystem(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) {
    // 计算系数矩阵的行列式
    const D = a1 * b2 - a2 * b1;
    // 如果行列式为零，则方程组没有唯一解或方程组是依赖的
    if (D === 0) throw new Error("方程组没有唯一解或方程组是依赖的。");
    // 计算x的解，通过将常数项替换为第一个方程的常数项后的行列式除以D
    const Dx = (c1 * b2 - c2 * b1) / D;
    // 计算y的解，通过将常数项替换为第二个方程的常数项后的行列式除以D
    const Dy = (a1 * c2 - a2 * c1) / D;
    // 返回解的对象
    return { x: Dx, y: Dy };
}
/**
 * 根据给定的点和角度计算直线的斜率（k）和截距（b）。
 */
export function calculateLineEquation(x1: number, y1: number, angle: number) {
    // 将角度从度转换为弧度
    const radians = angle * (Math.PI / 180);
    // 计算斜率
    const k = Math.tan(radians);
    // 计算截距
    const b = y1 - k * x1;
    // 返回斜率和截距
    return { k, b };
}
export function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
/**
 * 根据谱面坐标系中的X坐标计算Canvas坐标系中的X坐标。
 */
export function convertXToCanvas(x: number) {
    return x + 675;
}
/**
 * 根据谱面坐标系中的Y坐标计算Canvas坐标系中的Y坐标。
 */
export function convertYToCanvas(y: number) {
    return 450 - y;
}
/**
 * 根据Canvas坐标系中的X坐标计算谱面坐标系中的X坐标。
 */
export function convertXToChart(x: number) {
    return x - 675;
}
/**
 * 根据Canvas坐标系中的Y坐标计算谱面坐标系中的Y坐标。
 */
export function convertYToChart(y: number) {
    return 450 - y;
}
/**
 * 将三元组拍数转换成"a.b/c"的格式  
 * 为了方便打字所以把RPE格式拍数中间的冒号换成点了
 */
export function formatBeats(beats: Beats) {
    return beats[0] + '.' + beats[1] + '/' + beats[2];
}
/**
 * 将"a.b/c"格式的字符串转换成三元组  
 * 为了兼容RPE格式的拍数所以三个数字中间以任何符号分隔都可以
 */
export function parseBeats(str: string) {
    let beats: Beats | null = null;
    const beatsRegex = /([0-9]+)\D([0-9]+)\D([0-9]+)/;
    if (!isNaN(+str)) {
        beats = [+str, 0, 1];
    }
    else {
        const match = str.match(beatsRegex);
        if (match) {
            beats = [+match[1], +match[2], +match[3]];
        }
    }
    return beats;
}
export function downloadText(text: string, fileName: string, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}