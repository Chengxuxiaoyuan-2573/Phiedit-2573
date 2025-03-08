<template>
    <div class="mutiple-editor">
        <Teleport :to="props.titleTeleport">
            多选编辑
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
                    @click="catchErrorByMessage(moveToJudgeLine, '移动'), close()"
                >
                    确定
                </ElButton>
            </template>
        </MyDialog>
        <MyDialog open-text="复制到判定线">
            <MyInputNumber
                v-model="targetJudgeLineNumber"
                :min="0"
                :max="chart.judgeLineList.length - 1"
            >
                <template #prepend>
                    复制到
                </template>
                <template #append>
                    号判定线
                </template>
            </MyInputNumber>
            <template #footer="{ close }">
                <ElButton
                    type="primary"
                    @click="catchErrorByMessage(copyToJudgeLine, '复制'), close()"
                >
                    确定
                </ElButton>
            </template>
        </MyDialog>
        <h1>已保存的快速编辑</h1>
        <MyGridContainer :columns="2">
            <ElButton
                v-for="[key, value] of Object.entries(fastEdit)"
                :key="key"
                @click="catchErrorByMessage(() => {
                    evaluateCode(value);
                    code = value;
                }, `执行'${key}'操作`)"
            >
                {{ key }}
            </ElButton>
        </MyGridContainer>
        <MyDialog open-text="添加快速编辑">
            <ElInput v-model="name">
                <template #prepend>
                    快速编辑名称
                </template>
            </ElInput>
            <ElInput
                v-model="code"
                class="code-input"
                type="textarea"
                :autosize="{
                    minRows: 10,
                    maxRows: Infinity
                }"
                style="resize:none;"
                spellcheck="false"
            />
            <template #footer>
                <ElButton
                    type="success"
                    @click="catchErrorByMessage(saveFastEdit, '保存')"
                >
                    保存快速编辑
                </ElButton>
                <ElButton
                    type="primary"
                    @click="catchErrorByMessage(() => evaluateCode(code), '执行')"
                >
                    执行快速编辑
                </ElButton>
            </template>
        </MyDialog>
        <ElButton
            type="danger"
            @click="catchErrorByMessage(delete_, '删除')"
        >
            删除
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import { Note, NoteAbove, NoteType } from '@/classes/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import type { ArrayRepeat } from '@/tools/typeCheck';
import { ElInput, ElButton } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import fastEditPresets from '@/services/fastedit/presets';
import MyGridContainer from '@/myElements/MyGridContainer.vue';
import { catchErrorByMessage } from '@/tools/catchError';
import { LocalStorage } from '@/tools/storageUtils';
import MyDialog from '@/myElements/MyDialog.vue';
import selectionManager from '@/services/managers/selection';
import moveManager from '@/services/managers/move';
import store from '@/store';
const props = defineProps<{
    titleTeleport: string
}>();
const chart = store.useChart();
const targetJudgeLineNumber = ref(0);
const name = ref("新建的快速编辑");
const code = ref(`// 快速编辑代码示例
// 音符编辑
notes.forEach(note => {
    // 可用属性：above, alpha, startTime, endTime, type, isFake, positionX, size, speed, yOffset, visibleTime
})

// 事件编辑（现不支持特殊事件的编辑）
moveXEvents.forEach(event => {
    // 可用属性：bezier, bezierPoints, easingLeft, easingRight, easingType, start, end, startTime, endTime
})

// 其他种类事件，如moveYEvents, rotateEvents, alphaEvents, speedEvents
`);

const storage = new LocalStorage();
const fastEdit = reactive(storage.get<{
    [key: string]: string;
}>("fastEdit", {
    ...fastEditPresets
}));
const numOfSelectedElements = computed(() => {
    return selectionManager.selectedElements.length
});
const numOfNotes = computed(() => {
    return selectionManager.selectedElements.filter(element => element instanceof Note).length
});
const numOfEvents = computed(() => {
    return numOfSelectedElements.value - numOfNotes.value
});

const variables = [
    "notes",
    "moveXEvents",
    "moveYEvents",
    "rotateEvents",
    "alphaEvents",
    "speedEvents",
    "TAP",
    "HOLD",
    "FLICK",
    "DRAG",
    "ABOVE",
    "BELOW",
    "REAL",
    "FAKE"] as const;
type Arguments = ArrayRepeat<unknown, typeof variables["length"]>;

function saveFastEdit() {
    if (name.value == "") throw new Error("请输入快速编辑名称");
    if (name.value in fastEdit) throw new Error("快速编辑名称已存在");
    fastEdit[name.value] = code.value;
    storage.set('fastEdit', fastEdit);
}
function evaluateCode(code: string) {
    const func = new Function(...variables, code) as (...args: Arguments) => void;
    const notes = [];
    const moveXEvents = [];
    const moveYEvents = [];
    const rotateEvents = [];
    const alphaEvents = [];
    const speedEvents = [];
    // 把editor.selectedElements分类为note和事件
    for (const element of selectionManager.selectedElements) {
        if (element instanceof Note) {
            const allowedAttributes = [
                "above",
                "alpha",
                "startTime",
                "endTime",
                "type",
                "isFake",
                "positionX",
                "size",
                "speed",
                "yOffset",
                "visibleTime",
            ] as const;
            const proxy = new Proxy(element, {
                get: (note, prop: typeof allowedAttributes[number]) => {
                    if (allowedAttributes.includes(prop)) {
                        if (prop == "startTime" || prop == "endTime") {
                            return new Proxy(note[prop], {
                                get: (beats, prop) => {
                                    if (prop == "0" || prop == "1" || prop == "2") {
                                        return beats[prop];
                                    }
                                    else {
                                        return undefined;
                                    }
                                },
                                set: (beats, prop, value: number) => {
                                    if (prop == "0" || prop == "1" || prop == "2") {
                                        beats[prop] = value;
                                        note.calculateSeconds();
                                        return true;
                                    }
                                    else {
                                        return false;
                                    }
                                }
                            })
                        }
                        return note[prop];
                    }
                    else {
                        return undefined;
                    }
                },
                set: (note, prop: "type" | "size" | "above" | "alpha" | "isFake" | "positionX" | "speed" | "yOffset" | "visibleTime" | "startTime" | "endTime", value) => {
                    if (allowedAttributes.includes(prop)) {
                        // @ts-expect-error 删了就报错
                        note[prop] = value;
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            })
            notes.push(proxy);
        }
        else {
            const allowedAttributes = [
                "bezier",
                "bezierPoints",
                "easingLeft",
                "easingRight",
                "easingType",
                "start",
                "end",
                "startTime",
                "endTime",
            ] as const;
            const proxy = new Proxy(element, {
                get: (event, prop: typeof allowedAttributes[number]) => {
                    if (allowedAttributes.includes(prop)) {
                        if (prop == "startTime" || prop == "endTime") {
                            return new Proxy(event[prop], {
                                get: (beats, prop) => {
                                    if (prop == "0" || prop == "1" || prop == "2") {
                                        return beats[prop];
                                    }
                                    else {
                                        return undefined;
                                    }
                                },
                                set: (beats, prop, value: number) => {
                                    if (prop == "0" || prop == "1" || prop == "2") {
                                        beats[prop] = value;
                                        event.calculateSeconds();
                                        return true;
                                    }
                                    else {
                                        return false;
                                    }
                                }
                            })
                        }
                        else {
                            return event[prop];
                        }
                    }
                    else {
                        return undefined;
                    }
                },
                set: (event, prop: typeof allowedAttributes[number], value) => {
                    if (allowedAttributes.includes(prop)) {
                        // @ts-expect-error 删了就报错
                        event[prop] = value;
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            })
            switch (element.type) {
                case 'moveX':
                    moveXEvents.push(proxy);
                    break;
                case 'moveY':
                    moveYEvents.push(proxy);
                    break;
                case 'rotate':
                    rotateEvents.push(proxy);
                    break;
                case 'alpha':
                    alphaEvents.push(proxy);
                    break;
                case 'speed':
                    speedEvents.push(proxy);
                    break;
            }
        }
    }
    func(notes,
        moveXEvents,
        moveYEvents,
        rotateEvents,
        alphaEvents,
        speedEvents,
        NoteType.Tap,
        NoteType.Hold,
        NoteType.Flick,
        NoteType.Drag,
        NoteAbove.Above,
        NoteAbove.Below,
        0,
        1);
}
function delete_() {
    selectionManager.deleteSelection();
}
function moveToJudgeLine() {
    moveManager.moveToJudgeLine(targetJudgeLineNumber.value);
}
function copyToJudgeLine() {
    moveManager.copyToJudgeLine(targetJudgeLineNumber.value);
}

</script>
<style scoped>
.mutiple-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>