<template>
    <div class="music-player">
        <ElButton
            class="play-button"
            type="primary"
            circle
            @click="!audio ? undefined : audio.paused ? audio.play() : audio.pause()"
        >
            <VideoPause v-if="playing" />
            <VideoPlay v-else />
        </ElButton>
        <ElSlider
            v-model="time"
            :min="0"
            :max="audio?.duration || 300"
            :step="0.01"
            :show-input="true"
            input-size="small"
            :format-tooltip="(value) => {
                const seconds = Math.floor(value % 60);
                const minutes = Math.floor(value / 60);
                return `${minutes}:${seconds % 60}`;
            }"
            @change="timeChange"
        />
        <audio
            ref="audio"
            :src="src"
        />
    </div>
</template>
<script setup lang="ts">
import { ElButton, ElSlider } from 'element-plus';
import { VideoPlay, VideoPause } from '@element-plus/icons-vue';
import { onMounted, ref } from 'vue';
defineProps<{
    src: string;
}>();
const time = ref(0);
const playing = ref(false);
const audio = ref<HTMLAudioElement | null>(null);
defineExpose({
    audio: audio.value!
});
function timeChange() {
    audio.value!.currentTime = time.value;
}
onMounted(() => {
    audio.value!.ontimeupdate = () => {
        time.value = audio.value!.currentTime;
    }
})
</script>