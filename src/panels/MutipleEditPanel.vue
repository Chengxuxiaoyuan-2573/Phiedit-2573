<template>
    <div class="mutiple-panel left-inner">
        <Teleport :to="props.titleTeleport">
            批量音符/事件编辑
        </Teleport>
        <em v-if="numOfNotes == 0">
            <template v-if="lines > 1">
                已选中{{ lines }}根不同判定线上的{{ numOfEvents }}个事件
            </template>
            <template v-else>
                已选中{{ numOfEvents }}个事件
            </template>
        </em>
        <em v-else-if="numOfEvents == 0">
            <template v-if="lines > 1">
                已选中{{ lines }}根不同判定线上的{{ numOfNotes }}个音符
            </template>
            <template v-else>
                已选中{{ numOfNotes }}个音符
            </template>
        </em>
        <em v-else>
            <template v-if="lines > 1">
                已选中{{ lines }}根不同判定线上的{{ numOfNotes }}个音符和{{ numOfEvents }}个事件
            </template>
            <template v-else>
                已选中{{ numOfNotes }}个音符和{{ numOfEvents }}个事件
            </template>
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
            请选择克隆的目标判定线：{{ stateManager.cache.clone.targetJudgeLines }}
            <ElCheckboxGroup v-model="stateManager.cache.clone.targetJudgeLines">
                <MyGridContainer :columns="10">
                    <ElCheckboxButton
                        v-for="(_, index) in chart.judgeLineList.length"
                        :key="index"
                        :value="index"
                        :label="index"
                    >
                        {{ index }}
                    </ElCheckboxButton>
                </MyGridContainer>
            </ElCheckboxGroup>
            <MyInputBeats v-model="stateManager.cache.clone.timeDuration">
                <template #prepend>
                    持续时间
                </template>
            </MyInputBeats>
            <MyInputBeats v-model="stateManager.cache.clone.timeDelta">
                <template #prepend>
                    克隆时间差
                </template>
            </MyInputBeats>
            <p>
                例如：你选中了1~8号判定线，持续时间为8.0/1（8拍），克隆事件差为0.1/4（1/4拍），<br>
                则会把你选中的音符和事件依次复制到1，2，3，4，5，6，7，8，1，2，3...号判定线上，<br>
                每次复制都会延迟四分之一拍，一共复制32次。（因为8除以1/4等于32）<br>
                <em>注意，选择的判定线过少可能会导致事件重叠</em>
            </p>
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
        <MySelect
            v-model="stateManager.cache.mutipleEdit.type"
            :options="[
                {
                    label: '音符',
                    text: '音符',
                    value: 'note'
                },
                {
                    label: '事件',
                    text: '事件',
                    value: 'event'
                }
            ]"
        >
            编辑对象
        </MySelect>
        <template v-if="stateManager.cache.mutipleEdit.type == 'event'">
            <MySelect
                v-model="stateManager.cache.mutipleEdit.eventTypes"
                multiple
                placeholder="所有种类的事件"
                :options="[...baseEventTypes, ...extendedEventTypes].map(type => {
                    return {
                        label: type,
                        text: type,
                        value: type
                    }
                })"
            >
                事件类型
            </MySelect>
        </template>
        <template v-if="paramType != 'invalid'">
            <MySelect
                v-if="stateManager.cache.mutipleEdit.type == 'note'"
                v-model="stateManager.cache.mutipleEdit.attributeNote"
                :options="noteOptions"
            >
                目标属性
            </MySelect>
            <MySelect
                v-else
                v-model="stateManager.cache.mutipleEdit.attributeEvent"
                :options="eventOptions"
            >
                目标属性
            </MySelect>
            <MySelect
                v-model="stateManager.cache.mutipleEdit.mode"
                :options="modeOptions"
            >
                修改模式
            </MySelect>
            <template v-if="paramType == 'number'">
                <template
                    v-if="(stateManager.cache.mutipleEdit.mode == 'to' || stateManager.cache.mutipleEdit.mode == 'by' || stateManager.cache.mutipleEdit.mode == 'times')"
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
                    <MySwitch v-model="stateManager.cache.mutipleEdit.isRandom">
                        启用随机扰动
                    </MySwitch>
                    <template v-if="stateManager.cache.mutipleEdit.isRandom">
                        <MyInputNumber v-model="stateManager.cache.mutipleEdit.paramRandom">
                            <template #prepend>
                                随机参数值
                            </template>
                        </MyInputNumber>
                    </template>
                </template>
            </template>
            <template v-else-if="paramType == 'color'">
                <template v-if="stateManager.cache.mutipleEdit.mode == 'to'">
                    <MySwitch v-model="stateManager.cache.mutipleEdit.isDynamic">
                        启用动态参数
                    </MySwitch>
                    <template v-if="stateManager.cache.mutipleEdit.isDynamic">
                        <MyInputColor v-model="stateManager.cache.mutipleEdit.paramStartColor">
                            <template #prepend>
                                参数开始值
                            </template>
                        </MyInputColor>
                        <MyInputColor v-model="stateManager.cache.mutipleEdit.paramEndColor">
                            <template #prepend>
                                参数结束值
                            </template>
                        </MyInputColor>
                        <MySelectEasing v-model="stateManager.cache.mutipleEdit.paramEasing" />
                    </template>
                    <MyInputColor
                        v-else
                        v-model="stateManager.cache.mutipleEdit.paramColor"
                    >
                        <template #prepend>
                            参数值
                        </template>
                    </MyInputColor>
                </template>
            </template>
            <template v-else-if="paramType == 'text'">
                <template v-if="stateManager.cache.mutipleEdit.mode == 'to'">
                    <MyInput v-model="stateManager.cache.mutipleEdit.paramText">
                        <template #prepend>
                            参数值
                        </template>
                    </MyInput>
                </template>
            </template>
            <template v-else-if="paramType == 'boolean'">
                <MySwitch
                    v-if="stateManager.cache.mutipleEdit.mode == 'to'"
                    v-model="stateManager.cache.mutipleEdit.paramBoolean"
                >
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
            <template v-else-if="paramType == 'easing'">
                <MySelectEasing v-model="stateManager.cache.mutipleEdit.paramEasing" />
            </template>
            提示：按下确定按钮后会{{ description }}
            <MyButton
                type="primary"
                @click="globalEventEmitter.emit('MUTIPLE_EDIT')"
            >
                确定
            </MyButton>
        </template>
        <template v-else>
            <em>
                选中了多种不能同时编辑的事件，请取消选中一些事件！
                <MyQuestionMark>
                    当你同时选中值类型不同的事件时，就会出现这条提示。<br>
                    事件按值类型可以分为3种：数字事件，颜色事件和文字事件。<br>
                    颜色事件就是color事件，文字事件就是text事件。<br>
                    其他的事件都属于数字事件。<br>
                </MyQuestionMark>
            </em>
        </template>
    </div>
</template>
<script setup lang="ts">
import { Note, NoteType } from "@/models/note";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyButton from "@/myElements/MyButton.vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MyDialog from "@/myElements/MyDialog.vue";
import globalEventEmitter from "@/eventEmitter";
import store from "@/store";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import { ColorEvent, NumberEvent, TextEvent } from "@/models/event";
import MySwitch from "@/myElements/MySwitch.vue";
import { EasingType } from "@/models/easing";
import MySelect from "@/myElements/MySelect.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import MySelectNoteType from "@/myElements/MySelectNoteType.vue";
import { baseEventTypes, extendedEventTypes } from "@/models/eventLayer";
import { colorToHex } from "@/tools/color";
import MyInputColor from "@/myElements/MyInputColor.vue";
import MyInput from "@/myElements/MyInput.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import { ElCheckboxButton, ElCheckboxGroup } from "element-plus";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const selectionManager = store.useManager("selectionManager");
const stateManager = store.useManager("stateManager");

const numOfSelectedElements = computed(() => {
    return selectionManager.selectedElements.length;
});
const numOfNotes = computed(() => {
    return selectionManager.selectedElements.filter(element => element instanceof Note).length;
});
const numOfEvents = computed(() => {
    return numOfSelectedElements.value - numOfNotes.value;
});

const targetJudgeLineNumber = ref(0);

const noteOptions = [
    {
        label: "X坐标",
        text: "X坐标",
        value: "positionX",
    },
    {
        label: "速度",
        text: "速度",
        value: "speed",
    },
    {
        label: "大小",
        text: "大小",
        value: "size",
    },
    {
        label: "类型",
        text: "类型",
        value: "type",
    },
    {
        label: "透明度",
        text: "透明度",
        value: "alpha",
    },
    {
        label: "Y轴偏移",
        text: "Y轴偏移",
        value: "yOffset",
    },
    {
        label: "可见时间",
        text: "可见时间",
        value: "visibleTime",
    },
    {
        label: "真假",
        text: "真假",
        value: "isFake",
    },
    {
        label: "方向",
        text: "方向",
        value: "above",
    }
] as const;

const eventOptions = [
    {
        label: "事件值",
        value: "both",
        text: "事件值"
    },
    {
        label: "事件开始值",
        value: "start",
        text: "事件开始值"
    },
    {
        label: "事件结束值",
        value: "end",
        text: "事件结束值"
    },
    {
        label: "事件缓动",
        value: "easingType",
        text: "事件缓动"
    }
] as const;

const modeOptions = computed(() => {
    return modes.map(mode => {
        return {
            label: getModeLabel(mode),
            value: mode,
            text: getModeLabel(mode),
            isDisabled: !validModes.value.includes(mode)
        };
    });
});

const paramType = computed(() => {
    if (stateManager.cache.mutipleEdit.type === "note") {
        return stateManager.cache.mutipleEdit.attributeNote === "isFake" || stateManager.cache.mutipleEdit.attributeNote === "above" ? "boolean" : stateManager.cache.mutipleEdit.attributeNote === "type" ? "NoteType" : "number";
    }
    else {
        if (stateManager.cache.mutipleEdit.attributeEvent === "easingType") {
            return "easing";
        }
        else {
            if (selectionManager.selectedElements.every(element => element instanceof NumberEvent)) {
                return "number";
            }
            else if (selectionManager.selectedElements.every(element => element instanceof ColorEvent)) {
                return "color";
            }
            else if (selectionManager.selectedElements.every(element => element instanceof TextEvent)) {
                return "text";
            }
            else {
                return "invalid";
            }
        }
    }
});

const modes = ["to", "by", "times", "invert"] as const;

const validModes = computed((): readonly ("to" | "by" | "times" | "invert")[] => {
    const mapping = {
        "boolean": ["to", "invert"],
        "NoteType": ["to"],
        "easing": ["to"],
        "number": ["to", "by", "times", "invert"],
        "color": ["to", "invert"],
        "text": ["to"],
        "invalid": undefined
    } as const;
    return mapping[paramType.value] || ["to"] as const;
});

const lines = computed(() => {
    const set = new Set<number>();
    for (const element of selectionManager.selectedElements) {
        set.add(element.judgeLineNumber);
    }
    return set.size;
});

function getModeLabel(mode: string) {
    const labels: Record<string, string> = {
        "to": "设置为指定值",
        "by": "增加指定值",
        "times": "变为指定倍数",
        "invert": "取反"
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
    const subject = "选中的所有" + (stateManager.cache.mutipleEdit.type === "note" ? "音符" : stateManager.cache.mutipleEdit.eventTypes.join("、") + "事件");
    const attribute = (() => {
        if (stateManager.cache.mutipleEdit.type === "note") {
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
                if (paramType.value === "boolean") {
                    return "取反";
                }
                else if (paramType.value === "color") {
                    return "变为反色";
                }
                else if (paramType.value === "number") {
                    return "取相反数";
                }
        }
    })();
    const value = (() => {
        if (stateManager.cache.mutipleEdit.mode === "invert") {
            return "";
        }

        if (stateManager.cache.mutipleEdit.isDynamic) {
            if (paramType.value === "number") {
                let str = `以${EasingType[stateManager.cache.mutipleEdit.paramEasing]}缓动从${stateManager.cache.mutipleEdit.paramStart}到${stateManager.cache.mutipleEdit.paramEnd}的值`;
                if (stateManager.cache.mutipleEdit.isRandom) {
                    str += `，并加上±${stateManager.cache.mutipleEdit.paramRandom}之内的随机数`;
                }
                return str;
            }
            else if (paramType.value === "color") {
                let str = `以${EasingType[stateManager.cache.mutipleEdit.paramEasing]}缓动从${colorToHex(stateManager.cache.mutipleEdit.paramStartColor)}到${colorToHex(stateManager.cache.mutipleEdit.paramEndColor)}的值`;
                if (stateManager.cache.mutipleEdit.isRandom) {
                    str += `，并加上±${stateManager.cache.mutipleEdit.paramRandom}之内的随机数`;
                }
                return str;
            }
        }
        else {
            switch (paramType.value) {
                case "number":
                    if (stateManager.cache.mutipleEdit.isRandom) {
                        return `${stateManager.cache.mutipleEdit.param || ""}±${stateManager.cache.mutipleEdit.paramRandom}之内的随机数`;
                    }
                    else {
                        return `${stateManager.cache.mutipleEdit.param}`;
                    }
                case "color":
                    return colorToHex(stateManager.cache.mutipleEdit.paramColor);
                case "text":
                    return `字符串 "${stateManager.cache.mutipleEdit.paramText}"`;
                case "NoteType":
                    return NoteType[stateManager.cache.mutipleEdit.paramNoteType];
                case "boolean":
                    return stateManager.cache.mutipleEdit.paramBoolean.toString();
                case "easing":
                    return EasingType[stateManager.cache.mutipleEdit.paramEasing];
            }
        }
    })();
    if (stateManager.cache.mutipleEdit.type === "note") {
        if (stateManager.cache.mutipleEdit.mode === "to") {
            if (stateManager.cache.mutipleEdit.attributeNote === "isFake") {
                return `将${subject}变为${stateManager.cache.mutipleEdit.paramBoolean ? "假" : "真"}音符`;
            }

            if (stateManager.cache.mutipleEdit.attributeNote === "above") {
                return `将${subject}变为${stateManager.cache.mutipleEdit.paramBoolean ? "正向" : "反向"}音符`;
            }
        }
    }

    const sentence = `将${subject}的${attribute}${verb}${value}`;
    return sentence;
});
async function clone() {
    globalEventEmitter.emit("CLONE");
}

function selectionUpdateHandler() {
    const selectedElements = selectionManager.selectedElements;
    if (selectedElements.length === 0) {
        return;
    }

    if (selectedElements.every(element => element instanceof Note)) {
        stateManager.cache.mutipleEdit.type = "note";
    }
    else if (selectedElements.every(element => !(element instanceof Note))) {
        stateManager.cache.mutipleEdit.type = "event";
        stateManager.cache.mutipleEdit.eventTypes.length = 0;
        for (const event of selectedElements) {
            if (!stateManager.cache.mutipleEdit.eventTypes.includes(event.type)) {
                stateManager.cache.mutipleEdit.eventTypes.push(event.type);
            }
        }
    }
}

onMounted(() => {
    selectionUpdateHandler();
    globalEventEmitter.on("SELECTION_UPDATE", selectionUpdateHandler);
});

onBeforeUnmount(() => {
    globalEventEmitter.off("SELECTION_UPDATE", selectionUpdateHandler);
});
</script>