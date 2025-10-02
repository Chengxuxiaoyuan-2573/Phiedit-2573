/**
 * @license
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { isString } from "lodash";

export default class MediaUtils {
    static playSound(this: AudioContext, audioBuffer: AudioBuffer, time = 0, volume = 1) {
        if (time >= audioBuffer.duration) return;
        const bufferSource = this.createBufferSource();
        bufferSource.buffer = audioBuffer;
        const gainNode = this.createGain();
        gainNode.gain.value = volume;
        bufferSource.connect(gainNode);
        gainNode.connect(this.destination);
        bufferSource.start(0, time);
        bufferSource.onended = () => {
            bufferSource.disconnect();
        };
        return bufferSource;
    }
    static async createAudioBuffer(this: AudioContext, arraybuffer: ArrayBuffer) {
        const audioBuffer = await this.decodeAudioData(arraybuffer);
        return audioBuffer;
    }
    static createMutedAudioBuffer(this: AudioContext, duration: number) {
        const sampleRate = this.sampleRate;
        const numberOfChannels = 2;
        const audioBuffer = this.createBuffer(numberOfChannels, sampleRate * duration, sampleRate);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = 0;
            }
        }
        return audioBuffer;
    }
    static createImage(imageData: Blob | ArrayBuffer | string) {
        const objectUrl = (() => {
            if (isString(imageData)) {
                return imageData;
            }

            const blob = imageData instanceof Blob ? imageData : MediaUtils.arrayBufferToBlob(imageData);
            return URL.createObjectURL(blob);
        })();
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.src = objectUrl;
            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            };

            image.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(e);
            };
        });
    }
    static createAudio(audioData: ArrayBuffer | Blob) {
        const blob = audioData instanceof Blob ? audioData : MediaUtils.arrayBufferToBlob(audioData);
        return new Promise<HTMLAudioElement>((resolve, reject) => {
            const objectUrl = URL.createObjectURL(blob);
            const audio = new Audio();
            audio.src = objectUrl;
            audio.oncanplay = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(audio);
            };

            audio.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(e);
            };
        });
    }
    static createObjectURL(data: Blob | ArrayBuffer) {
        const blob = data instanceof Blob ? data : MediaUtils.arrayBufferToBlob(data);
        return new Promise<string>((resolve) => {
            const objectUrl = URL.createObjectURL(blob);
            window.addEventListener("beforeunload", () => {
                URL.revokeObjectURL(objectUrl);
            });
            resolve(objectUrl);
        });
    }
    static togglePlay(audio: HTMLAudioElement) {
        if (audio.paused) {
            audio.play();
        }
        else {
            audio.pause();
        }
    }
    static downloadText(text: string, fileName: string, mime = "text/plain") {
        const blob = new Blob([text], { type: mime });
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
    static arrayBufferToBlob(arrayBuffer: ArrayBuffer) {
        return new Blob([arrayBuffer]);
    }
}