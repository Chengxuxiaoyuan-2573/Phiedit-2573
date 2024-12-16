import { Ctx } from "@/ts/typeDefinitions";
import { Beats } from "./classes/beats";
import { clamp } from "lodash";
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
export function convertDegreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
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
export function createObjectURL(blob: Blob) {
    return new Promise<string>((resolve) => {
        const objectUrl = URL.createObjectURL(blob);
        window.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(objectUrl);
        })
        resolve(objectUrl);
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
export function debug<T>(arg: T) {
    console.log(arg);
    return arg;
}
export function debugFunction<T extends unknown[], Q>(func: (...args: T) => Q) {
    return (...args: T) => {
        console.log(args);
        return func(...args);
    }
}
export function getContext(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx;
    else throw new Error("Cannot get the context");
}
export function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
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
    const split = str.split(/\D/g);
    const beats: Beats = [
        Number.isNaN(+split[0]) ? 0 : +split[0],
        Number.isNaN(+split[1]) ? 0 : +split[1],
        Number.isNaN(+split[2]) ? 1 : +split[2]];
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
export function cubicBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
    return function (t: number) {
        // 确保t在0到1之间
        t = clamp(t, 0, 1);
        // 计算贝塞尔曲线的插值
        const x = Math.pow(1 - t, 3) * p1x + 3 * Math.pow(1 - t, 2) * t * p2x + 3 * (1 - t) * Math.pow(t, 2) * (1 - p2x) + Math.pow(t, 3);
        const y = Math.pow(1 - t, 3) * p1y + 3 * Math.pow(1 - t, 2) * t * p2y + 3 * (1 - t) * Math.pow(t, 2) * (1 - p2y) + Math.pow(t, 3);
        // 骗过ts的检查
        if (x == x)
            return y;
        else
            return y;
    };
}
export function gcd(a: number, b: number) {
    for (let i = Math.max(a, b); i >= 1; i--) {
        if (a % i == 0 && b % i == 0) {
            return i;
        }
    }
    return 1;
}