<template>
    <div 
        class="calculator"
        @keydown.enter="calculate"
        @keydown.stop
    >
        <ElInput
            v-model="display"
            class="display"
        />
        <el-button
            v-for="button of buttons"
            :key="isString(button) ? button : button[1]"
            type="primary"
            @click="isString(button) ?
                button in operations ? operations[button]() : append(button) :
                button[1] in operations ? operations[button[1]]() : append(button[1])"
        >
            {{ isString(button) ? button : button[0] }}
        </el-button>
    </div>
</template>

<script setup lang="ts">
import { calculateExpression } from '@/tools/algorithm';
import { ElInput } from 'element-plus';
import { isString } from 'lodash';
import { ref } from 'vue';

const display = ref('');
const props = defineProps<{
    varibles: {
        bpm: number
    }
}>();
const buttons: (string | [string, string])[] = [
    'C', '(', ')', ['←', 'backspace'], '^',
    ['÷', '/'], '7', '8', '9', ['sin', 'sin('],
    ['×', '*'], '4', '5', '6', ['cos', 'cos('],
    '-', '1', '2', '3', ['tan', 'tan('],
    '+', '0', '.',  ['√', 'sqrt('], '=',
] as const;
const operations: Record<string, () => void> = {
    'backspace': backspace,
    'C': clear,
    '=': calculate,
}
function backspace() {
    display.value = display.value.slice(0, -1);
}
function clear() {
    display.value = '';
}
function append(value: string) {
    display.value += value;
}
function calculate() {
    try {
        const result = calculateExpression(display.value, {
            Infinity: Infinity,
            NaN: NaN,
            pi: Math.PI,
            e: Math.E,
            get bpm(){
                return props.varibles.bpm;
            },
            get secondsPerBeat(){
                return 60 / props.varibles.bpm;
            }
        }, {
            sin(deg){
                return Math.sin(deg * Math.PI / 180);
            },
            cos(deg){
                return Math.cos(deg * Math.PI / 180);
            },
            tan(deg){
                return Math.tan(deg * Math.PI / 180);
            },
            sqrt(x){
                return Math.sqrt(x);
            },
            beatsToSeconds(beats:number, bpm = props.varibles.bpm){
                return beats / bpm * 60;
            },
            secondsToBeats(seconds:number, bpm = props.varibles.bpm){
                return seconds / 60 * bpm;
            }
        });
        display.value = String(result);
    } catch (error) {
        alert(error);
    }
}
</script>

<style scoped>
.calculator {
    --columns: 5;
    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
    gap: 10px;
    width: 100%;
    margin: 0 auto;
}

.display {
    grid-area: 1 / 1 / 2 / calc(var(--columns) + 1);
    text-align: right;
}


.el-button {
    height: 30px;
    font-size: 1.5em;
    margin: 0;
    width: 100%;
    height: 100%;
}
</style>