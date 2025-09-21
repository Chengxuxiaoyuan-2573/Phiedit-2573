<template>
    <div class="number-event-panel left-inner">
        <Teleport :to="props.titleTeleport">
            {{ model.type }}事件编辑
        </Teleport>
        事件ID： {{ model.id }}
        <em v-if="model.type == 'paint'">
            暂不支持paint事件，该事件的所有编辑都是无效的
        </em>
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
                数值
                <MyQuestionMark>
                    输入开始数值和结束数值，以空格隔开。<br>
                    如果只输入一个数值，就代表开始数值与结束数值相同。<br>
                    <template v-if="model.type == 'moveX'">
                        该事件为moveX事件，用来控制判定线锚点的X坐标。<br>
                        当X坐标为正数时，判定线锚点在屏幕右半边，为负数时，判定线锚点在屏幕左半边。<br>
                        屏幕可以显示的X、Y坐标范围分别为[-675, 675]和[-450,450]，但你可以设置超出屏幕的moveX或moveY事件。<br>
                        若设置了超出屏幕的moveX或moveY事件，判定线及其上面的音符超出屏幕的部分会被隐藏。<br>
                        判定线锚点的作用：判定线本体一定经过判定线锚点。使用moveX、moveY和rotate三种事件可以唯一确定判定线的位置。<br>
                    </template>
                    <template v-else-if="model.type == 'moveY'">
                        该事件为moveY事件，用来控制判定线锚点的Y坐标。<br>
                        当Y坐标为正数时，判定线锚点在屏幕上半边，为负数时，判定线锚点在屏幕下半边。<br>
                        屏幕可以显示的X、Y坐标范围分别为[-675, 675]和[-450,450]，但你可以设置超出屏幕的moveX或moveY事件。<br>
                        若设置了超出屏幕的moveX或moveY事件，判定线及其上面的音符超出屏幕的部分会被隐藏。<br>
                        判定线锚点的作用：判定线本体一定经过判定线锚点。使用moveX、moveY和rotate三种事件可以唯一确定判定线的位置。<br>
                    </template>
                    <template v-else-if="model.type == 'rotate'">
                        该事件为rotate事件，用来控制判定线的角度。<br>
                        当角度为0时，判定线与X轴平行。当角度为90时，判定线与Y轴平行。<br>
                        角度增大会让判定线绕锚点顺时针旋转，角度减小判定线则绕锚点逆时针旋转。<br>
                        角度可以超过360度或低于-360度。<br>
                        判定线锚点的作用：判定线本体一定经过判定线锚点。使用moveX、moveY和rotate三种事件可以唯一确定判定线的位置。<br>
                    </template>
                    <template v-else-if="model.type == 'alpha'">
                        该事件为alpha事件，用于控制判定线透明度。<br>
                        当透明度为0时，判定线将完全透明，也就是看不见。当透明度为255时，判定线将完全不透明。<br>
                        透明度不能超过255或低于0。<br>
                        如果判定线隐形了，很有可能是透明度为0的原因。<br>
                    </template>
                    <template v-else-if="model.type == 'speed'">
                        该事件为speed事件，用于控制判定线上面音符的流速。<br>
                        流速越大，音符下落的速度就越快，音符之间的间隔也会越大。<br>
                        当流速为0时，判定线上面的音符会完全相对于判定线静止，<br>
                        这时你可以把判定线透明度设为0并控制其移动、旋转来做到“音符自己动”的效果。<br>
                        <em>在同一条判定线上，不论流速是多少，如何变，只要两个音符的速度和方向一致，这两个音符之间的相对位置永远不会改变</em><br>
                    </template>
                    <template v-else-if="model.type == 'scaleX'">
                        该事件为scaleX事件，用于控制判定线的宽度。<br>
                        设置为1表示宽度正常，设置为0.5表示宽度缩小一半。<br>
                        如果判定线有贴图，贴图的宽度就是判定线正常的宽度。<br>
                        如果判定线有文字，文字的宽度就是判定线正常的宽度。<br>
                        如果判定线绑定了UI，UI的宽度就是判定线正常的宽度。<br>
                        如果都没有，判定线的长度就是判定线正常的宽度，为4000。<br>
                    </template>
                    <template v-else-if="model.type == 'scaleY'">
                        该事件为scaleY事件，用于控制判定线的高度。<br>
                        设置为1表示高度正常，设置为0.5表示高度缩小一半。<br>
                        如果判定线有贴图，贴图的高度就是判定线正常的高度。<br>
                        如果判定线有文字，文字的高度就是判定线正常的高度。<br>
                        如果判定线绑定了UI，UI的高度就是判定线正常的高度。<br>
                        如果都没有，判定线的粗细就是判定线正常的高度，为5。<br>
                    </template>
                    <template v-else-if="model.type == 'paint'">
                        该事件为paint事件，我也不知道它代表啥意思，所以不支持。
                    </template>
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
                        取反
                    </MyButton>
                </template>
                <template #content>
                    把事件的开始值和结束值都变为原来的相反数<br>
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
                    把这个事件的值设为一个随机值<br>
                    快捷键：Alt + R<br>
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
import { Bezier, IEvent, NumberEvent } from "../models/event";
import MyInput from "../myElements/MyInput.vue";
import MySwitch from "../myElements/MySwitch.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import { addBeats, beatsCompare, formatBeats, isEqualBeats, isLessThanOrEqualBeats, parseBeats, makeSureBeatsValid } from "@/models/beats";
import { onBeforeUnmount, onMounted, reactive, useTemplateRef } from "vue";
import { Ref, watch } from "vue";
import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import { ElTooltip } from "element-plus";
import MyInputBezier from "@/myElements/MyInputBezier.vue";
import MyEasing from "@/myElements/MyEasing.vue";
import MathUtils from "@/tools/mathUtils";
const model = defineModel<NumberEvent>({
    required: true,
}) as Ref<NumberEvent>;
const props = defineProps<{
    titleTeleport: string;
}>();
const inputStartEndTime = useTemplateRef("inputStartEndTime");
const inputStartEnd = useTemplateRef("inputStartEnd");
const switchBezier = useTemplateRef("switchBezier");
const inputBezier = useTemplateRef("inputBezier");
const inputEasing = useTemplateRef("inputEasing");
const selectEasing = useTemplateRef("selectEasing");
const switchDisabled = useTemplateRef("switchDisabled");
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
const canvas = store.useCanvas();

// const mouseManager = store.useManager("mouseManager");
watch(model, () => {
    for (const attr of attributes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (inputEvent[attr] as any) = model.value[attr];
    }
    inputStartEndTime.value?.updateShowedValue();
    inputStartEnd.value?.updateShowedValue();
    switchBezier.value?.updateShowedValue();
    inputBezier.value?.updateShowedValue();
    inputEasing.value?.updateShowedValue();
    selectEasing.value?.updateShowedValue();
    switchDisabled.value?.updateShowedValue();
});
const inputEvent: Required<IEvent<number>> & EventExtends = reactive({
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
        if (this.start === this.end) {
            return MathUtils.formatDecimal(this.start, 2);
        }

        return `${MathUtils.formatDecimal(this.start, 2)}${seperator}${MathUtils.formatDecimal(this.end, 2)}`;
    },
    set startEnd(value: string) {
        const [start, end] = value.trim().split(seperator);
        if (!start) return;
        const startValue = parseFloat(start);
        if (isNaN(startValue)) return;

        // 如果只输入了一个数值，则将结束数值设置为开始数值
        if (!end) {
            this.start = startValue;
            this.end = this.start;
            return;
        }

        const endValue = parseFloat(end);
        if (isNaN(endValue)) return;
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

function updateModel<K extends keyof IEvent<number>>(...attrNames: K[]) {
    for (const attrName of attrNames) {
        (model.value[attrName] as unknown) = inputEvent[attrName];
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
    inputEvent.start = -inputEvent.start;
    inputEvent.end = -inputEvent.end;
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
    const events = eventLayer.getEventsByType(model.value.type) as NumberEvent[];
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
    let min, max;
    switch (model.value.type) {
        case "moveX":
            min = -canvas.width / 2;
            max = canvas.width / 2;
            break;
        case "moveY":
            min = -canvas.height / 2;
            max = canvas.height / 2;
            break;
        case "rotate":
            min = -180;
            max = 180;
            break;
        case "alpha":
            min = 0;
            max = 255;
            break;
        case "speed":
            min = 0;
            max = 100;
            return;
        case "scaleX":
            min = 0;
            max = 2;
            return;
        case "scaleY":
            min = 0;
            max = 2;
            return;
        default:
            return;
    }

    const randomNumber = Math.random() * (max - min) + min;
    inputEvent.start = randomNumber;
    inputEvent.end = randomNumber;
    updateModel("start", "end");
    createHistory();
    inputStartEnd.value?.updateShowedValue();
}
</script>