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
                <MyButton
                    type="primary"
                    @click="globalEventEmitter.emit('MOVE_TO_JUDGE_LINE', targetJudgeLineNumber), close()"
                >
                    确定
                </MyButton>
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
                <MyButton
                    type="primary"
                    @click="clone(), close()"
                >
                    确定
                </MyButton>
            </template>
        </MyDialog>
        <MyButton
            v-if="numOfEvents > 0"
            @click="globalEventEmitter.emit('DISABLE')"
        >
            禁用选中的{{ numOfEvents }}个事件（Ctrl+D）
        </MyButton>
        <MyButton
            v-if="numOfEvents > 0"
            @click="globalEventEmitter.emit('ENABLE')"
        >
            启用选中的{{ numOfEvents }}个事件（Ctrl+E）
        </MyButton>
        <ElSelect v-model="stateManager.cache.mutipleEdit.type">
            <ElOption
                label="编辑对象: 音符"
                value="note"
            />
            <ElOption
                label="编辑对象: 事件"
                value="event"
            />
        </ElSelect>
        <template v-if="stateManager.cache.mutipleEdit.type == 'event'">
            <ElSelect v-model="stateManager.cache.mutipleEdit.eventType">
                <ElOption
                    v-for="(value, key) in eventTypes"
                    :key="key"
                    :label="'事件类型: ' + value"
                    :value="value"
                />
            </ElSelect>
        </template>
        <ElSelect
            v-if="stateManager.cache.mutipleEdit.type == 'note'"
            v-model="stateManager.cache.mutipleEdit.attributeNote"
        >
            <ElOption
                label="目标属性: X坐标"
                value="positionX"
            />
            <ElOption
                label="目标属性: 速度"
                value="speed"
            />
            <ElOption
                label="目标属性: 大小"
                value="size"
            />
            <ElOption
                label="目标属性: 类型"
                value="type"
            />
            <ElOption
                label="目标属性: 透明度"
                value="alpha"
            />
            <ElOption
                label="目标属性: Y轴偏移"
                value="yOffset"
            />
            <ElOption
                label="目标属性: 可见时间"
                value="visibleTime"
            />
            <ElOption
                label="目标属性: 真假"
                value="isFake"
            />
            <ElOption
                label="目标属性: 方向"
                value="above"
            />
        </ElSelect>
        <ElSelect
            v-else
            v-model="stateManager.cache.mutipleEdit.attributeEvent"
        >
            <ElOption
                label="目标属性: 事件值"
                value="both"
            />
            <ElOption
                label="目标属性: 事件开始值"
                value="start"
            />
            <ElOption
                label="目标属性: 事件结束值"
                value="end"
            />
            <ElOption
                label="目标属性: 事件缓动"
                value="easingType"
            />
        </ElSelect>
        <ElSelect v-model="stateManager.cache.mutipleEdit.mode">
            <ElOption
                v-for="mode in validModes"
                :key="mode"
                :label="`修改模式：${getModeLabel(mode)}`"
                :value="mode"
            />
        </ElSelect>
        <template
            v-if="paramType == 'number' && (stateManager.cache.mutipleEdit.mode == 'to' || stateManager.cache.mutipleEdit.mode == 'by' || stateManager.cache.mutipleEdit.mode == 'times')"
        >
            <MySwitch v-model="stateManager.cache.mutipleEdit.isDynamic">
                启用动态参数
            </MySwitch>
            <template v-if="stateManager.cache.mutipleEdit.isDynamic">
                <MyInputNumber v-model="stateManager.cache.mutipleEdit.paramStart">
                    <template #prepend>
                        参数开始值
                    </template>
                </MyInputNumber>
                <MyInputNumber v-model="stateManager.cache.mutipleEdit.paramEnd">
                    <template #prepend>
                        参数结束值
                    </template>
                </MyInputNumber>
                <MySelectEasing v-model="stateManager.cache.mutipleEdit.paramEasing" />
            </template>
            <MyInputNumber
                v-else
                v-model="stateManager.cache.mutipleEdit.param"
            >
                <template #prepend>
                    参数值
                </template>
            </MyInputNumber>
        </template>
        <template v-else-if="paramType == 'boolean'">
            <MySwitch v-model="stateManager.cache.mutipleEdit.paramBoolean">
                <template v-if="stateManager.cache.mutipleEdit.attributeNote == 'isFake'">
                    是否为假音符
                </template>
                <template v-else>
                    是否为正落音符
                </template>
            </MySwitch>
        </template>
        <template v-else-if="paramType == 'NoteType'">
            <MySelectNoteType v-model="stateManager.cache.mutipleEdit.paramNoteType" />
        </template>
        <template v-else>
            <MySelectEasing v-model="stateManager.cache.mutipleEdit.paramEasing" />
        </template>
        按下该按钮会{{ description }}
        <MyButton
            type="primary"
            @click="catchErrorByMessage(run, '操作')"
        >
            确定
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import { Note, NoteAbove, NoteFake, NoteType } from '@/models/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import { ElSelect, ElOption } from 'element-plus';
import MyButton from '@/myElements/MyButton.vue';
import { computed, ref, watch } from 'vue';
import MyDialog from '@/myElements/MyDialog.vue';
import globalEventEmitter from '@/eventEmitter';
import store from '@/store';
import MyInputBeats from '@/myElements/MyInputBeats.vue';
import { eventTypes, NumberEvent } from '@/models/event';
import MySwitch from '@/myElements/MySwitch.vue';
import { easingFuncs, EasingType } from '@/models/easing';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
import { catchErrorByMessage } from '@/tools/catchError';
import { NoteNumberAttrs, EventNumberAttrs } from '@/managers/state';
import MySelectNoteType from '@/myElements/MySelectNoteType.vue';
import { getBeatsValue } from '@/models/beats';
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const selectionManager = store.useManager("selectionManager");
const cloneManager = store.useManager("cloneManager");
const historyManager = store.useManager("historyManager");
const mouseManager = store.useManager("mouseManager");
const stateManager = store.useManager("stateManager");

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


const paramType = computed(() => {
    if (stateManager.cache.mutipleEdit.type == "note") {
        return stateManager.cache.mutipleEdit.attributeNote == "isFake" || stateManager.cache.mutipleEdit.attributeNote == "above" ? "boolean" : stateManager.cache.mutipleEdit.attributeNote == "type" ? "NoteType" : "number";
    }
    else {
        return stateManager.cache.mutipleEdit.attributeEvent == "easingType" ? "easing" : "number";
    }
})

const validModes = computed((): readonly ('to' | 'by' | 'times' | 'invert')[] => {
    const mapping = {
        'boolean': ['to', 'invert'],
        'NoteType': ['to'],
        'easing': ['to'],
        'number': ['to', 'by', 'times', 'invert']
    } as const;
    return mapping[paramType.value] || ['to'] as const;
});

function getModeLabel(mode: string) {
    const labels: Record<string, string> = {
        'to': '设置为指定值',
        'by': '增加指定值',
        'times': '变为指定倍数',
        'invert': '取反'
    };
    return labels[mode] || mode;
}

function ensureModeValid() {
    if (!validModes.value.includes(stateManager.cache.mutipleEdit.mode)) {
        stateManager.cache.mutipleEdit.mode = validModes.value[0];
    }
}

watch(() => stateManager.cache.mutipleEdit.type, ensureModeValid);
watch(() => stateManager.cache.mutipleEdit.attributeNote, ensureModeValid);
watch(() => stateManager.cache.mutipleEdit.attributeEvent, ensureModeValid);

const description = computed(() => {
    const subject = "选中的所有" + (stateManager.cache.mutipleEdit.type == 'note' ? "音符" : stateManager.cache.mutipleEdit.eventType + "事件");
    const attribute = (() => {
        if (stateManager.cache.mutipleEdit.type == 'note') {
            switch (stateManager.cache.mutipleEdit.attributeNote) {
                case "positionX":
                    return "X坐标";
                case "size":
                    return "大小";
                case "alpha":
                    return "透明度";
                case "speed":
                    return "速度";
                case "yOffset":
                    return "Y偏移";
                case "visibleTime":
                    return "可见时间";
                case "type":
                    return "类型";
                case "above":
                    return "方向";
                case "isFake":
                    return "真假";
            }
        }
        else {
            switch (stateManager.cache.mutipleEdit.attributeEvent) {
                case "start":
                    return "开始值";
                case "end":
                    return "结束值";
                case "easingType":
                    return "缓动";
                case "both":
                    return "值";
            }
        }
    })();
    const verb = (() => {
        switch (stateManager.cache.mutipleEdit.mode) {
            case "to":
                return "设为";
            case "by":
                return "增加";
            case "times":
                return "乘以";
            case "invert":
                if (paramType.value == "boolean")
                    return "取反";
                else
                    return "取相反数";
        }
    })();
    const value = (() => {
        if (stateManager.cache.mutipleEdit.mode == "invert") {
            return "";
        }
        if (stateManager.cache.mutipleEdit.isDynamic && paramType.value == "number") {
            return `以${EasingType[stateManager.cache.mutipleEdit.paramEasing]}缓动从${stateManager.cache.mutipleEdit.paramStart}到${stateManager.cache.mutipleEdit.paramEnd}的值`;
        }
        else {
            switch (paramType.value) {
                case "number":
                    return `${stateManager.cache.mutipleEdit.param}`;
                case "NoteType":
                    return NoteType[stateManager.cache.mutipleEdit.paramNoteType];
                case "boolean":
                    return stateManager.cache.mutipleEdit.paramBoolean.toString();
                case "easing":
                    return EasingType[stateManager.cache.mutipleEdit.paramEasing];
            }
        }
    })();
    if (stateManager.cache.mutipleEdit.type == 'note') {
        if (stateManager.cache.mutipleEdit.mode == "to") {
            if (stateManager.cache.mutipleEdit.attributeNote == "isFake")
                return `将${subject}变为${stateManager.cache.mutipleEdit.paramBoolean ? "假" : "真"}音符`;
            if (stateManager.cache.mutipleEdit.attributeNote == "above")
                return `将${subject}变为${stateManager.cache.mutipleEdit.paramBoolean ? "正向" : "反向"}音符`;
        }
    }
    return `将${subject}的${attribute}${verb}${value}`;
})
async function clone() {
    // const result = cloneManager.checkIsValid();
    // if (result.code != CloneValidStateCode.OK) {
    //     ElMessage.error(result.message);
    //     return;
    // }
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
            default:
                newValue = note[attr];
        }
        historyManager.recordModifyNote(note.id, attr, newValue, note[attr]);
        note[attr] = newValue;
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
            default:
                newValue = event[attr];
        }
        historyManager.recordModifyEvent(event.id, attr, newValue, event[attr]);
        event[attr] = newValue;
    }
    mouseManager.checkMouseUp();

    historyManager.group("批量编辑");

    if (stateManager.cache.mutipleEdit.type == "note") {
        const notes = selectionManager.selectedElements.filter(element => element instanceof Note).sort((a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime));
        const length = notes.length;
        if (length == 0) {
            throw new Error(`当前没有选中音符`)
        }
        notes.forEach((note, i) => {
            const value = stateManager.cache.mutipleEdit.isDynamic
                ? stateManager.cache.mutipleEdit.paramStart + easingFuncs[stateManager.cache.mutipleEdit.paramEasing](length === 1 ? 0 : i / (length - 1)) * (stateManager.cache.mutipleEdit.paramEnd - stateManager.cache.mutipleEdit.paramStart)
                : stateManager.cache.mutipleEdit.param;
            const attrName = stateManager.cache.mutipleEdit.attributeNote;
            if (attrName === 'isFake') {
                if (stateManager.cache.mutipleEdit.mode == "invert") {
                    historyManager.recordModifyNote(note.id, "isFake", note.isFake == NoteFake.Fake ? NoteFake.Real : NoteFake.Fake, note.isFake);
                    note.isFake = note.isFake == NoteFake.Fake ? NoteFake.Real : NoteFake.Fake;
                }
                else {
                    historyManager.recordModifyNote(note.id, "isFake", stateManager.cache.mutipleEdit.paramBoolean ? NoteFake.Fake : NoteFake.Real, note.isFake);
                    note.isFake = stateManager.cache.mutipleEdit.paramBoolean ? NoteFake.Fake : NoteFake.Real;
                }
            }
            else if (attrName === 'above') {
                if (stateManager.cache.mutipleEdit.mode == "invert") {
                    historyManager.recordModifyNote(note.id, "above", stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Below : NoteAbove.Above, note.above);
                    note.above = note.above == NoteAbove.Above ? NoteAbove.Below : NoteAbove.Above;
                }
                else {
                    historyManager.recordModifyNote(note.id, "above", stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Above : NoteAbove.Below, note.above);
                    note.above = stateManager.cache.mutipleEdit.paramBoolean ? NoteAbove.Above : NoteAbove.Below;
                }
            }
            else if (attrName === 'type') {
                historyManager.recordModifyNote(note.id, "type", stateManager.cache.mutipleEdit.paramNoteType, note.type);
                note.type = stateManager.cache.mutipleEdit.paramNoteType;
            }
            else {
                modifyNoteWithNumber(note, attrName, value, stateManager.cache.mutipleEdit.mode);
            }
        });
    }
    else {
        const events = selectionManager.selectedElements.filter(element => !(element instanceof Note) && element.type == stateManager.cache.mutipleEdit.eventType).sort((a, b) => getBeatsValue(a.startTime) - getBeatsValue(b.startTime)) as NumberEvent[];
        const length = events.length;
        if (length == 0) {
            throw new Error(`当前没有选中${stateManager.cache.mutipleEdit.eventType}事件`)
        }
        events.forEach((event, i) => {
            const value = stateManager.cache.mutipleEdit.isDynamic
                ? stateManager.cache.mutipleEdit.paramStart + easingFuncs[stateManager.cache.mutipleEdit.paramEasing](length === 1 ? 0 : i / (length - 1)) * (stateManager.cache.mutipleEdit.paramEnd - stateManager.cache.mutipleEdit.paramStart)
                : stateManager.cache.mutipleEdit.param;
            const attrName = stateManager.cache.mutipleEdit.attributeEvent;
            if (attrName === 'easingType') {
                historyManager.recordModifyEvent(event.id, "easingType", stateManager.cache.mutipleEdit.paramEasing, event.easingType);
                event.easingType = stateManager.cache.mutipleEdit.paramEasing;
            }
            else {
                modifyEventWithNumber(event, attrName, value, stateManager.cache.mutipleEdit.mode);
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