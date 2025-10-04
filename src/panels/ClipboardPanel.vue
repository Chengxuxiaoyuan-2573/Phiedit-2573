<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="clipboard-panel right-inner">
        <Teleport :to="props.titleTeleport">
            剪贴板管理
        </Teleport>
        <em>
            当前剪贴板内有{{ clipboardManager.clipboard.length }}个元素
        </em>
        <MyButton @click="globalEventEmitter.emit('CUT')">
            剪切（Ctrl+X）
        </MyButton>
        <MyButton @click="globalEventEmitter.emit('COPY')">
            复制（Ctrl+C）
        </MyButton>
        <MyInputBeats v-model="time">
            <template #prepend>
                粘贴时间
                <MyQuestionMark>
                    把剪切板里的内容粘贴到指定时间处。剪切板中时间最早的元素会与该时间对齐。<br>
                    如果你使用快捷键 Ctrl+V 粘贴，则剪切板中时间最早的元素会与鼠标位置对齐。<br>
                </MyQuestionMark>
            </template>
        </MyInputBeats>
        <MyButton @click="globalEventEmitter.emit('PASTE', time)">
            粘贴（Ctrl+V）
        </MyButton>
        <MyButton @click="globalEventEmitter.emit('PASTE_MIRROR', time)">
            镜像粘贴（Ctrl+B）
            <MyQuestionMark>
                镜像粘贴会把音符镜像，事件值变为相反数。<br>
                只对moveX、moveY、rotate事件有效。<br>
            </MyQuestionMark>
        </MyButton>
        <MyButton @click="globalEventEmitter.emit('REPEAT')">
            连续粘贴（Ctrl+Shift+V）
            <MyQuestionMark>
                连续粘贴会把选中的音符或事件重复一遍，使新的与原来的首尾相接。<br>
                不会影响剪切板。<br>
            </MyQuestionMark>
        </MyButton>
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
                >
                    复制后是否翻转方向
                </MySelect>
                <MyButton
                    type="primary"
                    @click="globalEventEmitter.emit('REPEAT_PARAGRAPH'), close()"
                >
                    确定
                </MyButton>
                <p>
                    使用方法：例如开始时间为64:0/1，结束时间为128:0/1，目标时间为192:0/1，
                    则会把谱面中第64拍至第128拍之间的所有内容都复制到第192拍至第256拍中。
                    用于在写重复段落时减少工作量
                </p>
            </template>
        </MyDialog>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from "@/eventEmitter";
import { Beats } from "@/models/beats";
import MyDialog from "@/myElements/MyDialog.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MySelect from "@/myElements/MySelect.vue";
import store from "@/store";
import MyButton from "@/myElements/MyButton.vue";
import { ref } from "vue";
import { FlipOptions } from "@/managers/renderer/paragraphRepeater";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
const props = defineProps<{
    titleTeleport: string
}>();

const clipboardManager = store.useManager("clipboardManager");
const paragraphRepeater = store.useManager("paragraphRepeater");

const time = ref<Beats>([0, 0, 1]);
</script>