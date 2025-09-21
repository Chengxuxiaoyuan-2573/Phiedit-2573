<template>
    <div class="note-panel left-inner">
        <Teleport :to="props.titleTeleport">
            {{ model.typeString }}音符编辑
        </Teleport>
        音符ID： {{ model.id }}
        <MySelectNoteType
            ref="inputType"
            v-model="inputNote.type"
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
                <MyQuestionMark>
                    输入开始时间和结束时间，以空格隔开。<br>
                    非Hold音符只能输入一个时间。<br>
                    开始时间和结束时间的格式都要满足“a.b/c”，<br>
                    其中a、b、c均为整数，表示第a又c分之b拍。<br>
                    特殊的，如果b=0，则c必须等于1，表示第a拍。<br>
                    因此，只能输入有理数时间。<br>
                </MyQuestionMark>
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
            <MyQuestionMark>
                若开启，则该音符为假音符，无法被判定，不计分。<br>
            </MyQuestionMark>
        </MySwitch>
        <MySwitch
            ref="inputAbove"
            v-model="inputNote.above"
            :active-value="NoteAbove.Below"
            :inactive-value="NoteAbove.Above"
            @change="updateModel('above'), createHistory()"
        >
            反向音符
            <MyQuestionMark>
                若开启，则音符会从判定线的反面下落。<br>
                “判定线正反面”的定义：判定线的角度为0时，判定线上面为正面，下面为反面。<br>
                角度为90时，判定线右面为正面，左面为反面。其他角度以此类推。<br>
            </MyQuestionMark>
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
            :min="0"
            @change="createHistory()"
            @input="updateModel('speed')"
        >
            <template #prepend>
                速度倍率
                <MyQuestionMark>
                    1为正常速度，2为双倍速度，0.5为一半速度，以此类推。<br>
                    速度以判定线上speed事件的速度为基准，乘以这个数。<br>
                    在做出差速下落的效果时可能会用到。<br>
                    不能设置为负数。<br>
                </MyQuestionMark>
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
                <MyQuestionMark>
                    1为正常大小。大小越大，横向的拉伸越大。纵向永远不会拉伸。<br>
                    不能设置为负数。<br>
                    在Phira中，大小不会影响判定范围的大小，所以无法还原其他音游中的大小键。<br>
                </MyQuestionMark>
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
                <MyQuestionMark>
                    255为不透明；0为完全透明，也就是隐藏。<br>
                    不能大于255或小于0。<br>
                </MyQuestionMark>
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
                <MyQuestionMark>
                    若不为0，则音符判定的位置会偏离判定线。<br>
                    正数表示向判定线正面的方向偏移，负数表示向判定线反面的方向偏移。<br>
                    “判定线正反面”的定义：判定线的角度为0时，判定线上面为正面，下面为反面。<br>
                    角度为90时，判定线右面为正面，左面为反面。其他角度以此类推。<br>
                </MyQuestionMark>
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
                <MyQuestionMark>
                    该音符在被判定前多少秒会保持显示状态。默认值为一个很大的数，表示持续显示。<br>
                    在做出上隐的效果时可能会用到。不能设置为负数。<br>
                </MyQuestionMark>
            </template>
        </MyInputNumber>
        <MyButton @click="reverse">
            X坐标镜像（Alt + A）
        </MyButton>
    </div>
</template>
<script setup lang='ts'>
import { formatBeats, makeSureBeatsValid, parseBeats } from "@/models/beats";
import { onBeforeUnmount, onMounted, reactive, useTemplateRef, watch } from "vue";
import { INote, Note, NoteAbove, NoteFake } from "../models/note";
import MyInput from "@/myElements/MyInput.vue";
import MyInputNumber from "../myElements/MyInputNumber.vue";
import MySwitch from "../myElements/MySwitch.vue";
import MyButton from "@/myElements/MyButton.vue";
import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import MySelectNoteType from "@/myElements/MySelectNoteType.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
const props = defineProps<{
    titleTeleport: string
}>();
const model = defineModel<Note>({
    required: true
});
const inputStartEndTime = useTemplateRef("inputStartEndTime");
const inputType = useTemplateRef("inputType");
const inputPositionX = useTemplateRef("inputPositionX");
const inputSize = useTemplateRef("inputSize");
const inputAlpha = useTemplateRef("inputAlpha");
const inputSpeed = useTemplateRef("inputSpeed");
const inputYOffset = useTemplateRef("inputYOffset");
const inputVisibleTime = useTemplateRef("inputVisibleTime");
const inputIsFake = useTemplateRef("inputIsFake");
const inputAbove = useTemplateRef("inputAbove");
interface NoteExtends {
    startEndTime: string;
}
const historyManager = store.useManager("historyManager");

// const mouseManager = store.useManager("mouseManager");
const seperator = " ";
const attributes = [
    "startTime",
    "endTime",
    "positionX",
    "speed",
    "size",
    "alpha",
    "yOffset",
    "visibleTime",
    "isFake",
    "above",
    "type"
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
        const startTime = makeSureBeatsValid(parseBeats(start));

        // 如果只输入了一个时间，则将结束时间设置为与开始时间相同
        if (!end) {
            this.startTime = startTime;
            this.endTime = startTime;
            return;
        }

        const endTime = makeSureBeatsValid(parseBeats(end));
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
};
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
    if (store.getNoteById(model.value.id)) {
        createHistory();
    }
    globalEventEmitter.off("REVERSE", reverse);
});
function reverse() {
    inputNote.positionX = -inputNote.positionX;
    updateModel("positionX");
    createHistory();
    inputPositionX.value?.updateShowedValue();
}
</script>