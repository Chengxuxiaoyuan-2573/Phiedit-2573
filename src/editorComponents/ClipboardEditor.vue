<template>
    <div class="clipboard-editor">
        <ElButton @click="globalEventEmitter.emit('CUT')">
            剪切
        </ElButton>
        <ElButton @click="globalEventEmitter.emit('COPY')">
            复制
        </ElButton>
        <MyInputBeats v-model="time">
            <template #prepend>
                粘贴时间
            </template>
        </MyInputBeats>
        <ElButton @click="globalEventEmitter.emit('PASTE', time)">
            粘贴
        </ElButton>
        <ElButton @click="globalEventEmitter.emit('PASTE_MIRROR', time)">
            镜像粘贴
        </ElButton>
        <MyDialog open-text="重复段落批量复制">
            <template #default="{ close }">
                <MyInputBeats v-model="paragraphRepeater.startTime">
                    <template #prepend>
                        开始时间
                    </template>
                </MyInputBeats>
                <MyInputBeats v-model="paragraphRepeater.endTime">
                    <template #prepend>
                        结束时间
                    </template>
                </MyInputBeats>
                <MyInputBeats v-model="paragraphRepeater.targetTime">
                    <template #prepend>
                        目标时间
                    </template>
                </MyInputBeats>
                <MySelect
                    v-model="paragraphRepeater.flip"
                    :options="[
                        {
                            label: '不翻转',
                            value: FlipOptions.None,
                            text: '不翻转'
                        },
                        {
                            label: '左右翻转',
                            value: FlipOptions.Horizontal,
                            text: '左右翻转'
                        },
                        {
                            label: '上下翻转',
                            value: FlipOptions.Vertical,
                            text: '上下翻转'
                        },
                        {
                            label: '上下左右翻转',
                            value: FlipOptions.Both,
                            text: '上下左右翻转'
                        }
                    ]"
                />
                <ElButton
                    type="primary"
                    @click="globalEventEmitter.emit('REPEAT_PARAGRAPH'), close()"
                >
                    确定
                </ElButton>
                <p>
                    使用方法：例如开始时间为64:0/1，结束时间为128:0/1，目标时间为192:0/1，
                    则会把谱面中第64拍至第128拍内的所有内容都复制到第192拍至第256拍内。
                    用于在写重复段落时减少工作量
                </p>
            </template>
        </MyDialog>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from '@/eventEmitter';
import { Beats } from '@/models/beats';
import MyDialog from '@/myElements/MyDialog.vue';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import MySelect from '@/myElements/MySelect.vue';
import store from '@/store';
import { ElButton } from 'element-plus';
import { ref } from 'vue';
import { FlipOptions } from '@/managers/paragraphRepeater';

const paragraphRepeater = store.useManager("paragraphRepeater");

const time = ref<Beats>([0, 0, 1]);
</script>
<style scoped>
.clipboard-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>