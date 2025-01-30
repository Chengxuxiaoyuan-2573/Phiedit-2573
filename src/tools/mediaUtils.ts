export default {
    playSound(this: AudioContext, audioBuffer: AudioBuffer, time = 0) {
        if (time >= audioBuffer.duration) return;
        const bufferSource = this.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.destination);
        bufferSource.start(0, time);
        bufferSource.onended = () => {
            bufferSource.disconnect();
        }
        return bufferSource;
    },
    async createAudioBuffer(this: AudioContext, arraybuffer: ArrayBuffer) {
        const audioBuffer = await this.decodeAudioData(arraybuffer);
        return audioBuffer;
    },
    createMutedAudioBuffer(this: AudioContext, duration: number) {
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
    },
    createImage(blob: Blob) {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const objectUrl = URL.createObjectURL(blob);
            const image = new Image();
            image.src = objectUrl;
            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            }
            image.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(e);
            }
        })
    },
    createAudio(blob: Blob) {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
            const objectUrl = URL.createObjectURL(blob);
            const audio = new Audio();
            audio.src = objectUrl;
            audio.oncanplay = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(audio);
            }
            audio.onerror = (e) => {
                URL.revokeObjectURL(objectUrl);
                reject(e);
            }
        })
    },
    createObjectURL(blob: Blob) {
        return new Promise<string>((resolve) => {
            const objectUrl = URL.createObjectURL(blob);
            window.addEventListener('beforeunload', () => {
                URL.revokeObjectURL(objectUrl);
            })
            resolve(objectUrl);
        })
    },
    Image(src: string) {
        const image = new Image();
        image.src = src;
        return image;
    },
    togglePlay(audio: HTMLAudioElement) {
        if (audio.paused) {
            audio.play();
        }
        else {
            audio.pause();
        }
    }
}