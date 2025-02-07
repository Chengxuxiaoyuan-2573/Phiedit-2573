<template>
    <div class="mutiple-editor">
        <h1>多选编辑</h1>
        <em>已选中{{ editor.selectedElements.length }}个对象</em>
        <ElButton
            type="primary"
            @click="unselect"
        >
            取消选择
        </ElButton>
        <ElButton
            type="danger"
            @click="catchError(delete_, '删除')"
        >
            删除
        </ElButton>
        <MyInputNumber
            v-model="targetJudgeLineNumber"
            :min="0"
            :max="editor.chart.judgeLineList.length - 1"
        >
            <template #prefix>
                移到
            </template>
            <template #suffix>
                号判定线
            </template>
            <template #append>
                <ElButton
                    type="primary"
                    @click="catchError(moveToJudgeLine, '移动')"
                >
                    移动
                </ElButton>
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="targetJudgeLineNumber"
            :min="0"
            :max="editor.chart.judgeLineList.length - 1"
        >
            <template #prefix>
                复制到
            </template>
            <template #suffix>
                号判定线
            </template>
            <template #append>
                <ElButton
                    type="primary"
                    @click="catchError(copyToJudgeLine, '复制')"
                >
                    复制
                </ElButton>
            </template>
        </MyInputNumber>
        <ElInput
            v-model="code"
            class="code-input"
            type="textarea"
            :autosize="{
                minRows: 10,
                maxRows: Infinity
            }"
            style="resize:none;"
        />
        <ElButton
            type="success"
            @click="catchError(() => evaluateCode(code), '执行')"
        >
            执行快速编辑
        </ElButton>
        <h1>快速编辑预设</h1>
        <MyGridContainer :columns="2">
            <ElButton
                v-for="[key, value] of Object.entries(fastEditPresets)"
                :key="key"
                @click="catchError(() => evaluateCode(value), `执行'${key}'操作`)"
            >
                {{ key }}
            </ElButton>
        </MyGridContainer>
    </div>
</template>
<script setup lang="ts">
import { Note, NoteAbove, NoteType } from '@/classes/note';
import { Editor } from '@/editor';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import { ArrayRepeat } from '@/tools/typeCheck';
import { ElInput, ElButton } from 'element-plus';
import { inject, ref } from 'vue';
import fastEditPresets from '@/assets/fastEditPresets';
import MyGridContainer from '@/myElements/MyGridContainer.vue';
import { catchError } from '@/tools/catchError';
const editor = inject('editor') as Editor;
const targetJudgeLineNumber = ref(0);
const code = ref(`// 快速编辑的代码
notes.forEach(note => {
    // 镜像
    note.positionX *= -1; 
    // 开始时间增加1拍
    note.startTime[0] += 1; 
    // 结束时间增加1拍
    note.endTime[0] += 1; 
})
moveXEvents.forEach(event => {
    // moveX事件编辑
})
moveYEvents.forEach(event => {
    // moveY事件编辑
})
// ......
`);



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

function evaluateCode(code: string) {
    const func = new Function(...variables, code) as (...args: Arguments) => void;
    const notes = [];
    const moveXEvents = [];
    const moveYEvents = [];
    const rotateEvents = [];
    const alphaEvents = [];
    const speedEvents = [];
    // 把editor.selectedElements分类为note和事件
    for (const element of editor.selectedElements) {
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
function unselect() {
    editor.unselectAll();
}
function delete_() {
    editor.deleteSelection();
}
function moveToJudgeLine() {
    copyToJudgeLine();
    delete_();
}
function copyToJudgeLine() {
    editor.copyToJudgeLine(targetJudgeLineNumber.value);
}
</script>
<style scoped>
.mutiple-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>