<template>
    <div class="mutiple-editor">
        <Teleport :to="props.titleTeleport">
            批量音符/事件编辑
        </Teleport>
        <em v-if="numOfNotes == 0">
            已选中{{ numOfEvents }}个事件
        </em>
        <em v-else-if="numOfEvents == 0">
            已选中{{ numOfNotes }}个音符
        </em>
        <em v-else>
            已选中{{ numOfNotes }}个音符和{{ numOfEvents }}个事件
        </em>
        <MyDialog open-text="移动到判定线">
            <MyInputNumber
                v-model="targetJudgeLineNumber"
                :min="0"
                :max="chart.judgeLineList.length - 1"
            >
                <template #prepend>
                    移动到
                </template>
                <template #append>
                    号判定线
                </template>
            </MyInputNumber>
            <template #footer="{ close }">
                <ElButton
                    type="primary"
                    @click="globalEventEmitter.emit('MOVE_TO_JUDGE_LINE', targetJudgeLineNumber), close()"
                >
                    确定
                </ElButton>
            </template>
        </MyDialog>
        <MyDialog open-text="克隆">
            请选择克隆的目标判定线：{{ cloneManager.options.targetJudgeLines }}
            <ElCheckboxGroup v-model="cloneManager.options.targetJudgeLines">
                <ElCheckboxButton
                    v-for="(_, index) in chart.judgeLineList.length"
                    :key="index"
                    :value="index"
                    :label="index"
                >
                    {{ index }}
                </ElCheckboxButton>
            </ElCheckboxGroup>
            <MyInputBeats v-model="cloneManager.options.timeDuration">
                <template #prepend>
                    持续时间
                </template>
            </MyInputBeats>
            <MyInputBeats v-model="cloneManager.options.timeDelta">
                <template #prepend>
                    克隆时间差
                </template>
            </MyInputBeats>
            <template #footer="{ close }">
                <ElButton
                    type="primary"
                    @click="clone(), close()"
                >
                    确定
                </ElButton>
            </template>
        </MyDialog>
        <h1>编辑对象</h1>
        <ElSelect v-model="type">
            <ElOption
                label="音符"
                value="note"
            />
            <ElOption
                label="事件"
                value="event"
            />
        </ElSelect>
        <template v-if="type == 'event'">
            <h1>事件类型</h1>
            <ElSelect v-model="eventType">
                <ElOption
                    v-for="(value, key) in eventTypes"
                    :key="key"
                    :label="value"
                    :value="value"
                />
            </ElSelect>
        </template>
        <h1>目标属性</h1>
        <ElSelect
            v-if="type == 'note'"
            v-model="attributeNote"
        >
            <ElOption
                label="位置"
                value="positionX"
            />
            <ElOption
                label="速度"
                value="speed"
            />
            <ElOption
                label="大小"
                value="size"
            />
            <ElOption
                label="透明度"
                value="alpha"
            />
            <ElOption
                label="Y轴偏移"
                value="yOffset"
            />
            <ElOption
                label="可见时间"
                value="visibleTime"
            />
        </ElSelect>
        <ElSelect
            v-else
            v-model="attributeEvent"
        >
            <ElOption
                label="事件值"
                value="both"
            />
            <ElOption
                label="事件开始值"
                value="start"
            />
            <ElOption
                label="事件结束值"
                value="end"
            />
            <ElOption
                label="事件缓动"
                value="easingType"
            />
        </ElSelect>
        <h1>修改模式</h1>
        <ElSelect v-model="mode">
            <ElOption
                label="设置为指定值"
                value="to"
            />
            <ElOption
                label="增加指定值"
                value="by"
            />
            <ElOption
                label="变为指定倍数"
                value="times"
            />
            <ElOption
                label="变为相反数"
                value="invert"
            />
            <ElOption
                label="随机值"
                value="random"
            />
        </ElSelect>
        <template v-if="mode == 'to' || mode == 'by' || mode == 'times'">
            <MySwitch v-model="isDynamic">
                启用动态参数
            </MySwitch>
            <template v-if="isDynamic">
                <MyInputNumber v-model="paramStart">
                    <template #prepend>
                        参数开始值
                    </template>
                </MyInputNumber>
                <MyInputNumber v-model="paramEnd">
                    <template #prepend>
                        参数结束值
                    </template>
                </MyInputNumber>
                <MySelectEasing v-model="paramEasing" />
            </template>
            <MyInputNumber
                v-else
                v-model="param"
            >
                <template #prepend>
                    参数值
                </template>
            </MyInputNumber>
        </template>
        <ElButton
            type="primary"
            @click="catchErrorByMessage(run, '操作')"
        >
            运行
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { Note } from '@/models/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import { ElButton, ElMessage, ElSelect, ElOption } from 'element-plus';
import { computed, ref } from 'vue';
import MyDialog from '@/myElements/MyDialog.vue';
import selectionManager from '@/services/managers/selection';
import globalEventEmitter from '@/eventEmitter';
import store from '@/store';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import cloneManager, { CloneValidStateCode } from '@/services/managers/clone';
import { eventTypes, NumberEvent } from '@/models/event';
import MySwitch from '@/myElements/MySwitch.vue';
import { easingFuncs, EasingType } from '@/models/easing';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
import { catchErrorByMessage } from '@/tools/catchError';
type NoteAttrs = "size" | "alpha" | "speed" | "positionX" | "yOffset" | "visibleTime";
type EventAttrs = "start" | "end" | "easingType";
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();

const numOfSelectedElements = computed(() => {
    return selectionManager.selectedElements.length
});
const numOfNotes = computed(() => {
    return selectionManager.selectedElements.filter(element => element instanceof Note).length
});
const numOfEvents = computed(() => {
    return numOfSelectedElements.value - numOfNotes.value
});

const targetJudgeLineNumber = ref(0);
const type = ref(numOfNotes.value == 0 ? "event" : "note");
const eventType = ref("moveX");
const attributeNote = ref<NoteAttrs>("positionX");
const attributeEvent = ref<EventAttrs | "both">("both");
const mode = ref<"to" | "by" | "times" | "invert" | "random">("to")
const isDynamic = ref(false);
const param = ref(0);
const paramStart = ref(0);
const paramEnd = ref(0);
const paramEasing = ref(EasingType.Linear);



async function clone() {
    const result = cloneManager.checkIsValid();
    if (result.code != CloneValidStateCode.OK) {
        ElMessage.error(result.message);
        return;
    }
    globalEventEmitter.emit('CLONE');
}
/** 
 * 史山警告⚠
 * 本函数含有以下内容：
 * 1. switch里面套if再套switch
 * 2. 奇异古怪的逻辑
 * 3. 魔法一样的数字和字符串常量
 * 5. 别问我为什么没有第四条
 * 6. 写不下去了，______________
 */
function run() {
    function modifyNote(note: Note, attr: NoteAttrs, value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
        switch (mode) {
            case "to":
                note[attr] = value;
                break;
            case "by":
                note[attr] += value;
                break;
            case "times":
                note[attr] *= value;
                break;
            case "invert":
                note[attr] = -note[attr];
                break;
            case "random":
                switch (attr) {
                    case "positionX":
                        note[attr] = Math.random() * 1350 - 675;
                        break;
                    case "alpha":
                        note[attr] = Math.random() * 255;
                        break;
                    case "size":
                        note[attr] = Math.random() * 6.75;
                        break;
                    case "speed":
                        note[attr] = Math.random() + 0.5;
                        break;
                    case "yOffset":
                        note[attr] = Math.random() * 500 - 250;
                        break;
                    case "visibleTime":
                        note[attr] = Math.random() * 10;
                        break;
                }
        }
    }
    function modifyEvent(event: NumberEvent, attr: EventAttrs | "both", value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
        if (attr == "both") {
            modifyEvent(event, "start", value, mode);
            modifyEvent(event, "end", value, mode);
            return;
        }
        switch (mode) {
            case "to":
                event[attr] = value;
                break;
            case "by":
                event[attr] += value;
                break;
            case "times":
                event[attr] *= value;
                break;
            case "invert":
                event[attr] = -event[attr];
                break;
            case "random":
                if (attr == "easingType") {
                    event[attr] = Math.floor(Math.random() * 29);
                }
                else {
                    switch (event.type) {
                        case "moveX":
                            event[attr] = Math.random() * 1350 - 675;
                            break;
                        case "moveY":
                            event[attr] = Math.random() * 900 - 450;
                            break;
                        case "rotate":
                            event[attr] = Math.random() * 360 - 180;
                            break;
                        case "alpha":
                            event[attr] = Math.random() * 255;
                            break;
                        case "speed":
                            event[attr] = Math.random() * 100;
                            break;
                        case "scaleX":
                            event[attr] = Math.random() * 10;
                            break;
                        case "scaleY":
                            event[attr] = Math.random() * 10;
                            break;
                        case "paint":
                            event[attr] = Math.random() * 100;
                            break;
                    }
                }
                break;
        }
    }
    if (type.value == "note") {
        const notes = selectionManager.selectedElements.filter(element => element instanceof Note) as Note[];
        const length = notes.length;
        if (length == 0) {
            throw new Error(`当前没有选中音符`)
        }
        notes.forEach((note, i) => {
            const value = isDynamic.value ? paramStart.value + easingFuncs[paramEasing.value](i / (length - 1)) * (paramEnd.value - paramStart.value) : param.value;
            const attrName = attributeNote.value;
            modifyNote(note, attrName, value, mode.value);
        });
    }
    else {
        const events = selectionManager.selectedElements.filter(element => !(element instanceof Note) && element.type == eventType.value) as NumberEvent[];
        const length = events.length;
        if (length == 0) {
            throw new Error(`当前没有选中${eventType.value}事件`)
        }
        events.forEach((event, i) => {
            const value = isDynamic.value ? paramStart.value + easingFuncs[paramEasing.value](i / (length - 1)) * (paramEnd.value - paramStart.value) : param.value;
            const attrName = attributeEvent.value;
            modifyEvent(event, attrName, value, mode.value);
        })
    }
}
</script>
<style scoped>
.mutiple-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>