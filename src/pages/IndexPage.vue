<template>
    <div class="content">
        <header>
            <label>
                <input ref="fileInput" type="file" @change="upload">
                <ElButton>上传文件</ElButton>
            </label>
            <label>
                <audio ref="audio" :src="data.song.src" controls />
            </label>
            <label>
                <input v-model="settings.lineWidth" type="number" min="0">
            </label>
        </header>
        <div class="canvasWrapper">
            <canvas ref="canvasBackground" width="1350" height="900" />
            <canvas ref="canvasJudgeLine" width="1350" height="900" />
            <canvas ref="canvasNote" width="1350" height="900" />
        </div>
    </div>
</template>
<script setup lang="ts">
import ElButton from '@/components/ElButton.vue';
import { onMounted, onUnmounted, ref, Ref } from 'vue';
import renderChart from '@/ts/render';
import readZipFile, { formatChart } from '@/ts/readFile';
import IntroductionChart from "@/assets/Introduction/Introduction.json";
import IntroductionMusicURL from "@/assets/Introduction/Introduction.mp3";
import IntroductionBackgroundURL from "@/assets/Introduction/Introduction.png";
import TapImageURL from "@/assets/Tap.png";
import TapHLImageURL from "@/assets/TapHL.png";
import DragImageURL from "@/assets/Drag.png";
import DragHLImageURL from "@/assets/DragHL.png";
import FlickImageURL from "@/assets/Flick.png";
import FlickHLImageURL from "@/assets/FlickHL.png";
import HoldHeadImageURL from "@/assets/HoldHead.png";
import HoldEndImageURL from "@/assets/HoldEnd.png";
import HoldBodyImageURL from "@/assets/HoldBody.png";
import HoldHLHeadImageURL from "@/assets/HoldHLHead.png";
import HoldHLEndImageURL from "@/assets/HoldHLEnd.png";
import HoldHLBodyImageURL from "@/assets/HoldHLBody.png";
//console.log(TapImageURL,DragImageURL,FlickImageURL,HoldBodyImageURL,HoldHeadImageURL,HoldEndImageURL);
import { NoteSource } from '@/ts/typeDefinitions';
const TapImage = new Image();
TapImage.src = TapImageURL;
const DragImage = new Image();
DragImage.src = DragImageURL;
const FlickImage = new Image();
FlickImage.src = FlickImageURL;
const HoldHeadImage = new Image();
HoldHeadImage.src = HoldHeadImageURL;
const HoldBodyImage = new Image();
HoldBodyImage.src = HoldBodyImageURL;
const HoldEndImage = new Image();
HoldEndImage.src = HoldEndImageURL;
const TapHLImage = new Image();
TapHLImage.src = TapHLImageURL;
const DragHLImage = new Image();
DragHLImage.src = DragHLImageURL;
const FlickHLImage = new Image();
FlickHLImage.src = FlickHLImageURL;
const HoldHLHeadImage = new Image();
HoldHLHeadImage.src = HoldHLHeadImageURL;
const HoldHLBodyImage = new Image();
HoldHLBodyImage.src = HoldHLBodyImageURL;
const HoldHLEndImage = new Image();
HoldHLEndImage.src = HoldHLEndImageURL;

const noteSource: NoteSource = {
    Tap: TapImage,
    Flick: FlickImage,
    Drag: DragImage,
    HoldHead: HoldHeadImage,
    HoldBody: HoldBodyImage,
    HoldEnd: HoldEndImage,
    TapHL: TapHLImage,
    FlickHL: FlickHLImage,
    DragHL: DragHLImage,
    HoldHLHead: HoldHLHeadImage,
    HoldHLBody: HoldHLBodyImage,
    HoldHLEnd: HoldHLEndImage,
}
console.log(noteSource);

const intervalId: Ref<number | null> = ref(null);
const fileInput: Ref<HTMLInputElement | null> = ref(null);
const canvasBackground: Ref<HTMLCanvasElement | null> = ref(null);
const canvasJudgeLine: Ref<HTMLCanvasElement | null> = ref(null);
const canvasNote: Ref<HTMLCanvasElement | null> = ref(null);
const audio: Ref<HTMLAudioElement | null> = ref(null);
const formattedIntroductionChart = formatChart(IntroductionChart);
const IntroductionSong = new Audio();
IntroductionSong.src = IntroductionMusicURL;
const IntroductionBackground = new Image();
IntroductionBackground.src = IntroductionBackgroundURL;
const data = { chart: formattedIntroductionChart, song: IntroductionSong, background: IntroductionBackground };
IntroductionBackground.onload = () => {
    const ctxBackground = canvasBackground.value!.getContext("2d");
    if (ctxBackground) {
        ctxBackground.drawImage(IntroductionBackground, 0, 0, IntroductionBackground.width, IntroductionBackground.height, 0, 0, 1350, 900);
        ctxBackground.fillStyle = "rgba(0, 0, 0, " + settings.backgroundDarkness + ")";
        ctxBackground.fillRect(0, 0, 1350, 900);
    }
}
const settings = {
    backgroundDarkness: 0.8,
    lineWidth: 5
}
async function upload() {
    if (!fileInput.value?.files) return;
    const { songBlob, backgroundBlob, chartString } = await readZipFile(fileInput.value?.files[0]);
    const chart = formatChart(JSON.parse(chartString));
    const songURL = URL.createObjectURL(songBlob);
    const backgroundURL = URL.createObjectURL(backgroundBlob);
    const song = new Audio();
    song.src = songURL;
    const background = new Image();
    background.src = backgroundURL;
    URL.revokeObjectURL(data.song.src);
    URL.revokeObjectURL(data.background.src);
    data.song = song;
    data.background = background;
    data.chart = chart;
    background.onload = () => {
        const ctxBackground = canvasBackground.value!.getContext("2d");
        if (ctxBackground) {
            ctxBackground.drawImage(background, 0, 0, background.width, background.height, 0, 0, 1350, 900);
            ctxBackground.fillStyle = "rgba(0, 0, 0, " + settings.backgroundDarkness + ")";
            ctxBackground.fillRect(0, 0, 1350, 900);
        }
    }
}
onMounted(() => {
    // @ts-expect-error SB VSCode fuck your mother
    intervalId.value = setInterval(() => {
        if (audio.value!.paused) {
            // do nothing
        }
        else {
            renderChart(canvasJudgeLine.value!, canvasNote.value!, data.chart, audio.value!.currentTime, settings, noteSource);
        }
    }, 16);
})
onUnmounted(() => {
    // @ts-expect-error SB VSCode fuck your mother
    clearInterval(intervalId.value);
    if (data.background) URL.revokeObjectURL(data.background.src);
    if (data.song) URL.revokeObjectURL(data.song.src);
})
</script>
<style scoped>
header {
    height: 50px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 10px;
}

.button {
    width: 50px;
    height: 100%;
}

audio {
    height: 100%;
}

input[type=file] {
    display: none;
}

i {
    font: 1.5em sans-serif;
}

.canvasWrapper {
    position: relative;
    width: 100%;
    height: calc(100% - 50px);
    background: black;
}

canvas {
    object-fit: contain;
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
}
</style>