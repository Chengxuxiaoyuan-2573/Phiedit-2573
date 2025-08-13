<template>
    <div class="note-panel">
        <Teleport :to="props.titleTeleport">
            {{ model.typeString }}音符编辑
        </Teleport>
        音符ID： {{ model.id }}
        <MySelectNoteType
            ref="inputType"
            v-model="inputNote.type"
            :options="[
                {
                    value: NoteType.Tap,
                    label: '音符类型：Tap',
                    text: 'Tap',
                },
                {
                    value: NoteType.Drag,
                    label: '音符类型：Drag',
                    text: 'Drag',
                },
                {
                    value: NoteType.Flick,
                    label: '音符类型：Flick',
                    text: 'Flick',
                },
                {
                    value: NoteType.Hold,
                    label: '音符类型：Hold',
                    text: 'Hold',
                }
            ]"
            @change="updateModel('type'), createHistory()"
        />
        <MyInput
            ref="inputStartEndTime"
            v-model="inputNote.startEndTime"
            @change="createHistory()"
            @input="updateModel('startTime', 'endTime')"
        >
            <template #prepend>
                时间
            </template>
        </MyInput>
        <MySwitch
            ref="inputIsFake"
            v-model="inputNote.isFake"
            :active-value="NoteFake.Fake"
            :inactive-value="NoteFake.Real"
            @change="updateModel('isFake'), createHistory()"
        >
            假音符
        </MySwitch>
        <MySwitch
            ref="inputAbove"
            v-model="inputNote.above"
            :active-value="NoteAbove.Below"
            :inactive-value="NoteAbove.Above"
            @change="updateModel('above'), createHistory()"
        >
            反向音符
        </MySwitch>
        <MyInputNumber
            ref="inputPositionX"
            v-model="inputNote.positionX"
            @change="createHistory()"
            @input="updateModel('positionX')"
        >
            <template #prepend>
                X坐标
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="inputSpeed"
            v-model="inputNote.speed"
            @change="createHistory()"
            @input="updateModel('speed')"
        >
            <template #prepend>
                速度倍率
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="inputSize"
            v-model="inputNote.size"
            :min="0"
            @change="createHistory()"
            @input="updateModel('size')"
        >
            <template #prepend>
                大小
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="inputAlpha"
            v-model="inputNote.alpha"
            :min="0"
            :max="255"
            @change="createHistory()"
            @input="updateModel('alpha')"
        >
            <template #prepend>
                透明度
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="inputYOffset"
            v-model="inputNote.yOffset"
            @change="createHistory()"
            @input="updateModel('yOffset')"
        >
            <template #prepend>
                纵向偏移
            </template>
        </MyInputNumber>
        <MyInputNumber
            ref="inputVisibleTime"
            v-model="inputNote.visibleTime"
            :min="0"
            @change="createHistory()"
            @input="updateModel('visibleTime')"
        >
            <template #prepend>
                可见时间
            </template>
        </MyInputNumber>
        <MyButton @click="reverse">
            X坐标镜像（Alt + A）
        </MyButton>
    </div>
</template>
<script setup lang='ts'>
import { formatBeats, validateBeats, parseBeats } from '@/models/beats';
import { onBeforeUnmount, onMounted, reactive, useTemplateRef, watch } from 'vue';
import { INote, Note, NoteAbove, NoteFake, NoteType } from '../models/note';
import MyInput from '@/myElements/MyInput.vue';
import MyInputNumber from '../myElements/MyInputNumber.vue';
import MySwitch from '../myElements/MySwitch.vue';
import MyButton from '@/myElements/MyButton.vue';
import globalEventEmitter from '@/eventEmitter';
import store from '@/store';
import MySelectNoteType from '@/myElements/MySelectNoteType.vue';
const props = defineProps<{
    titleTeleport: string
}>();
const model = defineModel<Note>({
    required: true
});
const inputStartEndTime = useTemplateRef('inputStartEndTime');
const inputType = useTemplateRef('inputType');
const inputPositionX = useTemplateRef('inputPositionX');
const inputSize = useTemplateRef('inputSize');
const inputAlpha = useTemplateRef('inputAlpha');
const inputSpeed = useTemplateRef('inputSpeed');
const inputYOffset = useTemplateRef('inputYOffset');
const inputVisibleTime = useTemplateRef('inputVisibleTime');
const inputIsFake = useTemplateRef('inputIsFake');
const inputAbove = useTemplateRef('inputAbove');
interface NoteExtends {
    startEndTime: string;
}
const historyManager = store.useManager("historyManager");
// const mouseManager = store.useManager("mouseManager");
const seperator = " ";
const attributes = [
    'startTime',
    'endTime',
    'positionX',
    'speed',
    'size',
    'alpha',
    'yOffset',
    'visibleTime',
    'isFake',
    'above',
    'type'
] as const;
watch(model, () => {
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (inputNote[attr] as any) = model.value[attr];
    }
    inputStartEndTime.value?.updateShowedValue();
    inputType.value?.updateShowedValue();
    inputPositionX.value?.updateShowedValue();
    inputSize.value?.updateShowedValue();
    inputAlpha.value?.updateShowedValue();
    inputSpeed.value?.updateShowedValue();
    inputYOffset.value?.updateShowedValue();
    inputVisibleTime.value?.updateShowedValue();
    inputIsFake.value?.updateShowedValue();
    inputAbove.value?.updateShowedValue();
}, {
    deep: true
});
const inputNote: INote & NoteExtends = reactive({
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    positionX: model.value.positionX,
    speed: model.value.speed,
    size: model.value.size,
    alpha: model.value.alpha,
    yOffset: model.value.yOffset,
    visibleTime: model.value.visibleTime,
    isFake: model.value.isFake,
    above: model.value.above,
    type: model.value.type,
    get startEndTime() {
        // 如果开始时间和结束时间相同，返回这个相同的时间
        if (this.startTime === this.endTime) {
            return formatBeats(this.startTime);
        }
        // 否则返回开始时间和结束时间的组合
        return formatBeats(this.startTime) + seperator + formatBeats(this.endTime);
    },
    set startEndTime(value: string) {
        const [start, end] = value.split(seperator);
        // 如果连开始时间都没有输入，就不进行任何操作，因为用户可能还没有输入完
        if (!start) return;
        const startTime = validateBeats(parseBeats(start));
        // 如果只输入了一个时间，则将结束时间设置为与开始时间相同
        if (!end) {
            this.startTime = startTime;
            this.endTime = startTime;
            return;
        }
        const endTime = validateBeats(parseBeats(end));
        this.startTime = startTime;
        this.endTime = endTime;
    }
});
const oldValues = {
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    positionX: model.value.positionX,
    speed: model.value.speed,
    size: model.value.size,
    alpha: model.value.alpha,
    yOffset: model.value.yOffset,
    visibleTime: model.value.visibleTime,
    isFake: model.value.isFake,
    above: model.value.above,
    type: model.value.type,
}
function updateModel<K extends keyof INote>(...attrNames: K[]) {
    // const oldValues = attrNames.map(attr => model.value[attr]);
    // const newValues = attrNames.map(attr => inputNote[attr]);
    // const description = `将音符${model.value.id}的属性${attrNames.join(', ')}${attrNames.length > 1 ? "分别" : ""}从${oldValues.join(', ')}修改为${newValues.join(', ')}`;
    // historyManager.group(description);
    for (const attrName of attrNames) {
        // historyManager.modifyNote(model.value.id, attrName, inputNote[attrName]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model.value[attrName] as any) = inputNote[attrName];
    }
    // historyManager.ungroup();
}
function createHistory() {
    // 遍历新值和旧值，找到不一样的属性
    for (const attr of attributes) {
        if (inputNote[attr] !== oldValues[attr]) {
            // mouseManager.checkMouseUp();
            historyManager.recordModifyNote(model.value.id, attr, inputNote[attr], oldValues[attr]);
        }
    }
    // 把旧值更新，以免重复记录
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (oldValues[attr] as any) = inputNote[attr];
    }
}
onMounted(() => {
    globalEventEmitter.on("REVERSE", reverse);
});
onBeforeUnmount(() => {
    // 假如用户没有让输入框失焦就直接退出了，检查一下有没有没记录上的历史记录
    try {
        createHistory();
    }
    catch (e) {
        console.error(e);
    }
    globalEventEmitter.off("REVERSE", reverse);
});
function reverse() {
    model.value.positionX = -model.value.positionX;
}
</script>
<style scoped>
.note-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>