<template>
    <div class="number-event-editor">
        <Teleport :to="props.titleTeleport">
            {{ model.type }}事件编辑
        </Teleport>
        事件ID： {{ model.id }}
        <MyInputBeats v-model="model.startTime">
            <template #prepend>
                开始时间
            </template>
        </MyInputBeats>
        <MyInputBeats v-model="model.endTime">
            <template #prepend>
                结束时间
            </template>
        </MyInputBeats>
        <MyInputNumber v-model="model.start">
            <template #prepend>
                开始值
            </template>
        </MyInputNumber>
        <MyInputNumber v-model="model.end">
            <template #prepend>
                结束值
            </template>
        </MyInputNumber>
        <MySwitch
            v-model="model.bezier"
            :active-value="1"
            :inactive-value="0"
        >
            使用Bezier曲线
        </MySwitch>
        <span v-if="model.bezier">
            不支持Bezier曲线，请关闭Bezier曲线
        </span>
        <template v-else>
            <MySelectEasing v-model="model.easingType" />
            <ElSlider
                v-model="model.easingLeftRight"
                range
                :min="0"
                :max="1"
                :step="0.01"
            />
        </template>
    </div>
</template>
<script setup lang="ts">
import { NumberEvent } from '../models/event';
import MyInputBeats from '../myElements/MyInputBeats.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySwitch from '../myElements/MySwitch.vue';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
const model = defineModel<NumberEvent>({
    required: true
})
const props = defineProps<{
    titleTeleport: string
}>();
</script>
<style scoped>
.number-event-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>