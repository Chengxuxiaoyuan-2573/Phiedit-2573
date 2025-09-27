<template>
    <div class="number-event-panel left-inner">
        <Teleport :to="props.titleTeleport">
            {{ model.type }}事件编辑
        </Teleport>
        事件ID： {{ model.id }}
        <MyInput
            ref="inputStartEndTime"
            v-model="inputEvent.startEndTime"
            @change="createHistory()"
            @input="updateModel('startTime', 'endTime')"
        >
            <template #prepend>
                时间
                <MyQuestionMark>
                    输入开始时间和结束时间，以空格隔开。<br>
                    开始时间和结束时间的格式都要满足“a.b/c”，<br>
                    其中a、b、c均为整数，表示第a又c分之b拍。<br>
                    特殊的，如果b=0，则c必须等于1，表示第a拍。<br>
                    因此，只能输入有理数时间。<br>
                </MyQuestionMark>
            </template>
        </MyInput>
        <MyInput
            ref="inputStartEnd"
            v-model="inputEvent.startEnd"
            @change="createHistory()"
            @input="updateModel('start', 'end')"
        >
            <template #prepend>
                颜色
                <MyQuestionMark>
                    请输入两个RGB颜色值，中间用空格隔开，R、G、B三个颜色分量用英文的逗号隔开。<br>
                    也可以输入形如“#rrggbb”形式的颜色值。请把“rrggbb”替换为实际的颜色分量值。<br>
                    该事件为color事件，用来控制判定线的颜色。<br>
                    如果判定线有贴图，控制的就是贴图的颜色。（采用正片叠底的混合模式）<br>
                    如果判定线有文字，控制的就是文字的颜色。<br>
                    如果判定线绑定了UI，控制的就是UI的颜色。<br>
                    如果都没有，控制的就是判定线本身的颜色。<br>
                </MyQuestionMark>
            </template>
        </MyInput>
        <MySwitch
            ref="switchBezier"
            v-model="inputEvent.bezier"
            :active-value="Bezier.On"
            :inactive-value="Bezier.Off"
            @change="updateModel('bezier'), createHistory()"
        >
            使用Bezier曲线
        </MySwitch>
        <MyInputBezier
            v-if="model.bezier"
            ref="inputBezier"
            v-model="inputEvent.bezierPoints"
            @change="createHistory()"
            @input="updateModel('bezierPoints')"
        >
            <template #prepend>
                控制点坐标
            </template>
        </MyInputBezier>
        <MySelectEasing
            v-else
            ref="selectEasing"
            v-model="inputEvent.easingType"
            @change="updateModel('easingType'), createHistory()"
        >
            缓动类型
        </MySelectEasing>
        <MySwitch
            ref="switchDisabled"
            v-model="inputEvent.isDisabled"
            @change="updateModel('isDisabled'), createHistory()"
        >
            禁用
        </MySwitch>
        <MyGridContainer :columns="3">
            <ElTooltip placement="top">
                <template #default>
                    <MyButton @click="reverse">
                        反色
                    </MyButton>
                </template>
                <template #content>
                    把事件的开始值和结束值都变为原来的反色<br>
                    快捷键：Alt + A<br>
                </template>
            </ElTooltip>
            <ElTooltip placement="top">
                <template #default>
                    <MyButton @click="swap">
                        交换
                    </MyButton>
                </template>
                <template #content>
                    把事件的开始值和结束值交换<br>
                    快捷键：Alt + S<br>
                </template>
            </ElTooltip>
            <ElTooltip placement="top">
                <template #default>
                    <MyButton @click="stick">
                        粘合
                    </MyButton>
                </template>
                <template #content>
                    把这个事件的起始值设为和上一个事件的结束值相同<br>
                    快捷键：Alt + D<br>
                </template>
            </ElTooltip>
            <ElTooltip placement="bottom">
                <template #default>
                    <MyButton @click="random">
                        随机
                    </MyButton>
                </template>
                <template #content>
                    把这个事件的起始值和结束值都设为随机的颜色<br>
                    快捷键：Alt + D<br>
                </template>
            </ElTooltip>
        </MyGridContainer>
        <MyEasing
            ref="inputEasing"
            v-model="inputEvent"
            :zoom-out="1.25"
            @bezier-input="updateModel('bezierPoints'), inputBezier?.updateShowedValue()"
            @bezier-change="createHistory()"
            @easing-lr-input="updateModel('easingLeft', 'easingRight')"
            @easing-lr-change="createHistory()"
        />
    </div>
</template>
<script setup lang="ts">
import MyButton from "@/myElements/MyButton.vue";
import { IEvent, Bezier, IEventExtendedOptions } from "../models/event";
import MyInput from "../myElements/MyInput.vue";
import MySwitch from "../myElements/MySwitch.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import { addBeats, beatsCompare, formatBeats, isEqualBeats, isLessThanOrEqualBeats, parseBeats, makeSureBeatsValid } from "@/models/beats";
import { onBeforeUnmount, onMounted, reactive, useTemplateRef } from "vue";
import { watch } from "vue";
import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import { formatRGBcolor, isEqualRGBcolors, parseRGBcolor, RGBcolor } from "@/tools/color";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MathUtils from "@/tools/mathUtils";
import MyEasing from "@/myElements/MyEasing.vue";
import MyInputBezier from "@/myElements/MyInputBezier.vue";
const model = defineModel<IEvent<RGBcolor> & IEventExtendedOptions>({
    required: true,
});
const props = defineProps<{
    titleTeleport: string;
}>();
const inputStartEndTime = useTemplateRef("inputStartEndTime");
const inputStartEnd = useTemplateRef("inputStartEnd");
const switchBezier = useTemplateRef("switchBezier");
const inputEasing = useTemplateRef("inputEasing");
const selectEasing = useTemplateRef("selectEasing");
const switchDisabled = useTemplateRef("switchDisabled");
const inputBezier = useTemplateRef("inputBezier");
interface EventExtends {
    startEndTime: string;
    startEnd: string;
    easingLeftRight: number[];
}
const seperator = " ";
const attributes = [
    "startTime",
    "endTime",
    "start",
    "end",
    "bezier",
    "bezierPoints",
    "easingType",
    "easingLeft",
    "easingRight"
] as const;
const historyManager = store.useManager("historyManager");

// const mouseManager = store.useManager("mouseManager");
watch(model, () => {
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (inputEvent[attr] as any) = model.value[attr];
    }
    inputStartEndTime.value?.updateShowedValue();
    inputStartEnd.value?.updateShowedValue();
    inputEasing.value?.updateShowedValue();
    switchBezier.value?.updateShowedValue();
    selectEasing.value?.updateShowedValue();
    switchDisabled.value?.updateShowedValue();
    inputBezier.value?.updateShowedValue();
});
const inputEvent: IEvent<RGBcolor> & EventExtends = reactive({
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    start: model.value.start,
    end: model.value.end,
    bezier: model.value.bezier,
    bezierPoints: model.value.bezierPoints,
    easingType: model.value.easingType,
    easingLeft: model.value.easingLeft,
    easingRight: model.value.easingRight,
    linkgroup: 0,
    isDisabled: model.value.isDisabled,
    get startEndTime() {
        // 如果开始时间和结束时间相同，返回这个相同的时间
        if (this.startTime === this.endTime) {
            return formatBeats(this.startTime);
        }

        // 否则返回开始时间和结束时间的组合
        return formatBeats(this.startTime) + seperator + formatBeats(this.endTime);
    },
    set startEndTime(value: string) {
        const [start, end] = value.trim().split(seperator);
        if (!start) return;
        this.startTime = makeSureBeatsValid(parseBeats(start));

        // 如果只输入了一个时间，则将结束时间设置为开始时间加1拍
        if (!end) {
            this.endTime = addBeats(this.startTime, [1, 0, 1]);
            return;
        }
        this.endTime = makeSureBeatsValid(parseBeats(end));
    },
    get startEnd() {
        // 如果开始数值和结束数值相同，返回这个相同的数值
        if (isEqualRGBcolors(this.start, this.end)) {
            return formatRGBcolor(this.start);
        }
        return formatRGBcolor(this.start) + seperator + formatRGBcolor(this.end);
    },
    set startEnd(value: string) {
        const [start, end] = value.trim().split(seperator);
        if (!start) return;
        const startValue = parseRGBcolor(start);
        if (startValue === null) return;

        // 如果只输入了一个数值，则将结束数值设置为开始数值
        if (!end) {
            this.start = startValue;
            this.end = this.start;
            return;
        }

        const endValue = parseRGBcolor(end);
        if (endValue === null) return;
        this.start = startValue;
        this.end = endValue;
    },
    get easingLeftRight() {
        return [this.easingLeft, this.easingRight];
    },
    set easingLeftRight(value: number[]) {
        this.easingLeft = value[0];
        this.easingRight = value[1];
    }
});
const oldValues = {
    startTime: model.value.startTime,
    endTime: model.value.endTime,
    start: model.value.start,
    end: model.value.end,
    bezier: model.value.bezier,
    bezierPoints: model.value.bezierPoints,
    easingType: model.value.easingType,
    easingLeft: model.value.easingLeft,
    easingRight: model.value.easingRight,
    linkgroup: model.value.linkgroup,
    isDisabled: model.value.isDisabled
};

/** 检查属性是否被修改过，并记录到历史记录中 */
function createHistory() {
    // 遍历新值和旧值，找到不一样的属性
    for (const attr of attributes) {
        if (attr === "start" || attr === "end") {
            if (isEqualRGBcolors(inputEvent[attr], oldValues[attr])) {
                continue;
            }
        }

        if (attr === "startTime" || attr === "endTime") {
            if (isEqualBeats(inputEvent[attr], oldValues[attr])) {
                continue;
            }
        }

        if (inputEvent[attr] !== oldValues[attr]) {
            // mouseManager.checkMouseUp();
            historyManager.recordModifyEvent(model.value.id, attr, inputEvent[attr], oldValues[attr]);
        }
    }

    // 把旧值更新，以免重复记录
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (oldValues[attr] as any) = inputEvent[attr];
    }
}

function updateModel<K extends keyof IEvent<number>>(...attrNames: K[]) {
    // const oldValues = attrNames.map(attr => model.value[attr]);
    // const newValues = attrNames.map(attr => inputEvent[attr]);
    // const description = `将事件${model.value.id}的属性${attrNames.join(', ')}${attrNames.length > 1 ? "分别" : ""}从${oldValues.join(', ')}修改为${newValues.join(', ')}`;
    // historyManager.group(description);
    for (const attrName of attrNames) {
        // historyManager.modifyEvent(model.value.id, attrName, (inputEvent as any)[attrName]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model.value[attrName] as any) = inputEvent[attrName];
    }

    // historyManager.ungroup();
}

function updateInput<K extends keyof IEvent<number>>(...attrNames: K[]) {
    for (const attr of attrNames) {
        (inputEvent[attr] as unknown) = model.value[attr];
        (oldValues[attr] as unknown) = model.value[attr];
        switch (attr) {
            case "start":
            case "end":
                inputStartEnd.value?.updateShowedValue();
                break;
            case "startTime":
            case "endTime":
                inputStartEndTime.value?.updateShowedValue();
                break;
            case "easingType":
                selectEasing.value?.updateShowedValue();
                break;
            case "easingLeft":
            case "easingRight":
            case "bezier":
            case "bezierPoints":
                inputEasing.value?.updateShowedValue();
                inputBezier.value?.updateShowedValue();
                switchBezier.value?.updateShowedValue();
                break;
        }
    }
}

function updateTime() {
    updateInput("startTime", "endTime");
}
onMounted(() => {
    globalEventEmitter.on("REVERSE", reverse);
    globalEventEmitter.on("SWAP", swap);
    globalEventEmitter.on("STICK", stick);
    globalEventEmitter.on("RANDOM", random);
    globalEventEmitter.on("ELEMENT_DRAGGED", updateTime);
});
onBeforeUnmount(() => {
    if (store.getEventById(model.value.id)) {
        createHistory();
    }
    globalEventEmitter.off("REVERSE", reverse);
    globalEventEmitter.off("SWAP", swap);
    globalEventEmitter.off("STICK", stick);
    globalEventEmitter.off("RANDOM", random);
    globalEventEmitter.off("ELEMENT_DRAGGED", updateTime);
});
function reverse() {
    for (let i = 0; i < 3; i++) {
        inputEvent.start[i] = 255 - inputEvent.start[i];
        inputEvent.end[i] = 255 - inputEvent.end[i];
    }
    updateModel("start", "end");
    createHistory();
    inputStartEnd.value?.updateShowedValue();
}

function swap() {
    [inputEvent.start, inputEvent.end] = [inputEvent.end, inputEvent.start];
    updateModel("start", "end");
    createHistory();
    inputStartEnd.value?.updateShowedValue();
}

function stick() {
    const judgeLine = store.getJudgeLineById(model.value.judgeLineNumber);
    const eventLayer = judgeLine.getEventLayerById(model.value.eventLayerId);
    const events = eventLayer.getEventsByType(model.value.type) as IEvent<RGBcolor>[];
    events.sort((event1, event2) => beatsCompare(event1.endTime, event2.endTime));

    // 找到结束时间小于model的开始时间的最大的事件
    let event = undefined;
    for (let i = events.length - 1; i >= 0; i--) {
        if (isLessThanOrEqualBeats(events[i].endTime, model.value.startTime)) {
            event = events[i];
            break;
        }
    }

    if (!event) {
        throw new Error("当前事件前面没有事件，无法粘合");
    }
    inputEvent.start = event.end;
    updateModel("start", "end");
    createHistory();
    inputStartEnd.value?.updateShowedValue();
}

function random() {
    const randomStart = MathUtils.randomNumbers(3, undefined, 0, 255) as RGBcolor;
    const randomEnd = MathUtils.randomNumbers(3, undefined, 0, 255) as RGBcolor;
    inputEvent.start = randomStart;
    inputEvent.end = randomEnd;
    updateModel("start", "end");
    createHistory();
    inputStartEnd.value?.updateShowedValue();
}
</script>