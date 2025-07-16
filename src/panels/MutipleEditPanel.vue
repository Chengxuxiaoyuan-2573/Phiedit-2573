<template>
    <div class="mutiple-panel">
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
            <ElOption
                label="真假"
                value="isFake"
            />
            <ElOption
                label="方向"
                value="above"
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
        <ElSelect
            v-if="paramType == 'boolean'"
            v-model="mode"
        >
            <ElOption
                label="设置为指定值"
                value="to"
            />
            <ElOption
                label="取反"
                value="invert"
            />
        </ElSelect>
        <ElSelect
            v-else-if="paramType == 'easing'"
            v-model="mode"
        >
            <ElOption
                label="设置为指定值"
                value="to"
            />
        </ElSelect>
        <ElSelect
            v-else
            v-model="mode"
        >
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
        <template v-if="paramType == 'number' && (mode == 'to' || mode == 'by' || mode == 'times')">
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
        <template v-else-if="paramType == 'boolean'">
            <MySwitch v-model="paramBoolean">
                <template v-if="attributeNote == 'isFake'">
                    是否为假音符
                </template>
                <template v-else>
                    是否为正落音符
                </template>
            </MySwitch>
        </template>
        <template v-else>
            <MySelectEasing v-model="paramEasing" />
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
import { Note, NoteAbove } from '@/models/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import { ElButton, ElMessage, ElSelect, ElOption } from 'element-plus';
import { computed, ref } from 'vue';
import MyDialog from '@/myElements/MyDialog.vue';
import globalEventEmitter from '@/eventEmitter';
import store from '@/store';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import { eventTypes, NumberEvent } from '@/models/event';
import MySwitch from '@/myElements/MySwitch.vue';
import { easingFuncs, EasingType } from '@/models/easing';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
import { catchErrorByMessage } from '@/tools/catchError';
import { CloneValidStateCode } from '@/managers/clone';
type NoteNumberAttrs = "size" | "alpha" | "speed" | "positionX" | "yOffset" | "visibleTime";
type EventNumberAttrs = "start" | "end";
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const selectionManager = store.useManager("selectionManager");
const cloneManager = store.useManager("cloneManager");
const historyManager = store.useManager("historyManager");

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
const type = ref<"note" | "event">(numOfNotes.value == 0 ? "event" : "note");
const eventType = ref("moveX");
const attributeNote = ref<NoteNumberAttrs | "isFake" | "above">("positionX");
const attributeEvent = ref<EventNumberAttrs | "both" | "easingType">("both");
const mode = ref<"to" | "by" | "times" | "invert" | "random">("to")
const isDynamic = ref(false);
const param = ref(0);
const paramStart = ref(0);
const paramEnd = ref(0);
const paramBoolean = ref(false);
const paramEasing = ref(EasingType.Linear);

const paramType = computed(() => {
    if (type.value == "note") {
        return attributeNote.value == "isFake" || attributeNote.value == "above" ? "boolean" : "number";
    }
    else {
        return attributeEvent.value == "easingType" ? "easing" : "number";
    }
})

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
    function modifyNoteWithNumber(note: Note, attr: NoteNumberAttrs, value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
        let newValue: number;
        switch (mode) {
            case "to":
                newValue = value;
                break;
            case "by":
                newValue = note[attr] + value;
                break;
            case "times":
                newValue = note[attr] * value;
                break;
            case "invert":
                newValue = -note[attr];
                break;
            case "random":
                switch (attr) {
                    case "positionX":
                        newValue = Math.random() * 1350 - 675;
                        break;
                    case "alpha":
                        newValue = Math.random() * 255;
                        break;
                    case "size":
                        newValue = Math.random() * 6.75;
                        break;
                    case "speed":
                        newValue = Math.random() + 0.5;
                        break;
                    case "yOffset":
                        newValue = Math.random() * 500 - 250;
                        break;
                    case "visibleTime":
                        newValue = Math.random() * 10;
                        break;
                    default:
                        newValue = note[attr];
                }
                break;
            default:
                newValue = note[attr];
        }
        historyManager.modifyNote(note.id, attr, newValue);
    }

    function modifyEventWithNumber(event: NumberEvent, attr: EventNumberAttrs | "both", value: number, mode: "to" | "by" | "times" | "invert" | "random" = "to") {
        if (attr == "both") {
            modifyEventWithNumber(event, "start", value, mode);
            modifyEventWithNumber(event, "end", value, mode);
            return;
        }
        let newValue: number;
        switch (mode) {
            case "to":
                newValue = value;
                break;
            case "by":
                newValue = event[attr] + value;
                break;
            case "times":
                newValue = event[attr] * value;
                break;
            case "invert":
                newValue = -event[attr];
                break;
            case "random":
                switch (event.type) {
                    case "moveX":
                        newValue = Math.random() * 1350 - 675;
                        break;
                    case "moveY":
                        newValue = Math.random() * 900 - 450;
                        break;
                    case "rotate":
                        newValue = Math.random() * 360 - 180;
                        break;
                    case "alpha":
                        newValue = Math.random() * 255;
                        break;
                    case "speed":
                        newValue = Math.random() * 100;
                        break;
                    case "scaleX":
                        newValue = Math.random() * 10;
                        break;
                    case "scaleY":
                        newValue = Math.random() * 10;
                        break;
                    case "paint":
                        newValue = Math.random() * 100;
                        break;
                    default:
                        newValue = event[attr];
                }
                break;
            default:
                newValue = event[attr];
        }
        historyManager.modifyEvent(event.id, attr, newValue);
    }

    historyManager.group("批量编辑");

    if (type.value == "note") {
        const notes = selectionManager.selectedElements.filter(element => element instanceof Note) as Note[];
        const length = notes.length;
        if (length == 0) {
            throw new Error(`当前没有选中音符`)
        }
        notes.forEach((note, i) => {
            const value = isDynamic.value
                ? paramStart.value + easingFuncs[paramEasing.value](length === 1 ? 0 : i / (length - 1)) * (paramEnd.value - paramStart.value)
                : param.value;
            const attrName = attributeNote.value;
            if (attrName === 'isFake') {
                historyManager.modifyNote(note.id, "isFake", paramBoolean.value ? 1 : 0);
            }
            else if (attrName === 'above') {
                historyManager.modifyNote(note.id, "above", paramBoolean.value ? NoteAbove.Above : NoteAbove.Below);
            }
            else {
                modifyNoteWithNumber(note, attrName, value, mode.value);
            }
        });
    }
    else {
        const events = selectionManager.selectedElements.filter(element => !(element instanceof Note) && element.type == eventType.value) as NumberEvent[];
        const length = events.length;
        if (length == 0) {
            throw new Error(`当前没有选中${eventType.value}事件`)
        }
        events.forEach((event, i) => {
            const value = isDynamic.value
                ? paramStart.value + easingFuncs[paramEasing.value](length === 1 ? 0 : i / (length - 1)) * (paramEnd.value - paramStart.value)
                : param.value;
            const attrName = attributeEvent.value;
            if (attrName === 'easingType') {
                historyManager.modifyEvent(event.id, "easingType", paramEasing.value);
            }
            else {
                modifyEventWithNumber(event, attrName, value, mode.value);
            }
        })
    }

    historyManager.ungroup();
}
</script>
<style scoped>
.mutiple-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>