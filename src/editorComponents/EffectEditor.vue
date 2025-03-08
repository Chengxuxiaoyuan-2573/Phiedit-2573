<template>
    <div class="effect-editor">
        <Teleport :to="props.titleTeleport">
            一键生成特效
        </Teleport>
        <MyDialog open-text="震动特效">
            <MyInputBeats v-model="config.vibrate.options.startTime">
                <template #prepend>
                    开始时间
                </template>
            </MyInputBeats>
            <MyInputBeats v-model="config.vibrate.options.space">
                <template #prepend>
                    间隔
                </template>
            </MyInputBeats>
            <MyInputBeats v-model="config.vibrate.options.duration">
                <template #prepend>
                    每个事件长度
                </template>
            </MyInputBeats>
            <MyInputNumber v-model="config.vibrate.options.offsetX">
                <template #prepend>
                    X轴位移
                </template>
            </MyInputNumber>
            <MyInputNumber v-model="config.vibrate.options.offsetY">
                <template #prepend>
                    Y轴位移
                </template>
            </MyInputNumber>
            <MyInputNumber v-model="config.vibrate.options.times">
                <template #prepend>
                    重复次数
                </template>
            </MyInputNumber>
            <MySelectEasing v-model="config.vibrate.options.easing" />
            <template #footer="{ close }">
                <ElButton
                    type="primary"
                    @click="config.vibrate.generate(), close()"
                >
                    生成
                </ElButton>
            </template>
        </MyDialog>
        <MyDialog open-text="旋转摆动特效">
            <MyInputBeats v-model="config.swing.options.startTime">
                <template #prepend>
                    开始时间
                </template>
            </MyInputBeats>
            <MyInputBeats v-model="config.swing.options.cycleLength">
                <template #prepend>
                    周期长度
                </template>
            </MyInputBeats>
            <MyInputNumber v-model="config.swing.options.times">
                <template #prepend>
                    重复次数
                </template>
            </MyInputNumber>
            <MySelectEasingGroup v-model="config.swing.options.easing" />
            <MyInputNumber v-model="config.swing.options.swingAmplitude">
                <template #prepend>
                    摆动幅度
                </template>
            </MyInputNumber>
            <template #footer="{ close }">
                <ElButton
                    type="primary"
                    @click="config.swing.generate(), close()"
                >
                    生成
                </ElButton>
            </template>
        </MyDialog>
    </div>
</template>
<script setup lang="ts">
import MyDialog from '@/myElements/MyDialog.vue';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import MySelectEasing from '@/myElements/MySelectEasing.vue';

import VibrateEffect from '@/services/managers/effects/vibrate';
import SwingEffect from '@/services/managers/effects/swing';
import MySelectEasingGroup from '@/myElements/MySelectEasingGroup.vue';
import { ElButton } from 'element-plus';

const props = defineProps<{
    titleTeleport: string
}>();
const config = {
    vibrate: new VibrateEffect(),
    swing: new SwingEffect(),
};


</script>
<style scoped>
.effect-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>