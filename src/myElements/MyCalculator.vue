<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

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
        <div class="buttons">
            <MyButton
                v-for="button of buttons"
                :key="isString(button) ? button : button[1]"
                :type="button == '=' ? 'success' : 'primary'"
                @click="isString(button) ?
                    button in operations ? operations[button]() : append(button) :
                    button[1] in operations ? operations[button[1]]() : append(button[1])"
            >
                {{ isString(button) ? button : button[0] }}
            </MyButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ExpressionCalculator } from "@/tools/algorithm";
import { createCatchErrorByMessage } from "@/tools/catchError";
import { ElInput } from "element-plus";
import MyButton from "./MyButton.vue";
import { isString } from "lodash";
import { ref } from "vue";
import MathUtils from "@/tools/mathUtils";

const display = ref("");
const buttons: (string | [string, string])[] = [
    "C", "(", ")", ["←", "backspace"], ["√", "sqrt("],
    "+", "-", ["×", "*"], ["÷", "/"], "^",
    "7", "8", "9", ["sin", "sin("], ["arcsin", "arcsin("],
    "4", "5", "6", ["cos", "cos("], ["arccos", "arccos("],
    "1", "2", "3", ["tan", "tan("], ["arctan", "arctan("],
    " ", "0", ".", ["mod", "%"], "=",
] as const;
const expresstionCalculator = new ExpressionCalculator(
    {
        Infinity: Infinity,
        NaN: NaN,
        pi: Math.PI,
        e: Math.E,
    },
    {
        sin(deg) {
            return Math.sin(MathUtils.degToRad(deg));
        },
        cos(deg) {
            return Math.cos(MathUtils.degToRad(deg));
        },
        tan(deg) {
            if (MathUtils.mod(deg, 180) === 90) {
                throw new Error(`tan(${deg})：函数值无意义`);
            }
            return Math.tan(MathUtils.degToRad(deg));
        },
        arcsin(x) {
            if (x < -1 || x > 1) {
                throw new Error(`arcsin(${x})：arcsin 函数的自变量超出定义域 [-1, 1]`);
            }
            return Math.asin(x) * 180 / Math.PI;
        },
        arccos(x) {
            if (x < -1 || x > 1) {
                throw new Error(`arccos(${x})：arccos 函数的自变量超出定义域 [-1, 1]`);
            }
            return Math.acos(x) * 180 / Math.PI;
        },
        arctan(x) {
            return Math.atan(x) * 180 / Math.PI;
        },
        sqrt(x) {
            if (x < 0) {
                throw new Error(`sqrt(${x})：负数不能开平方`);
            }
            return Math.sqrt(x);
        },
    }
);
function backspace() {
    display.value = display.value.slice(0, -1);
}

function clear() {
    display.value = "";
}

function append(value: string) {
    display.value += value;
}

const calculate = createCatchErrorByMessage(() => {
    const result = expresstionCalculator.calculate(display.value);
    display.value = String(result);
}, "计算");
const operations: Record<string, () => void> = {
    "backspace": backspace,
    "C": clear,
    "=": calculate,
};
</script>

<style scoped>
.buttons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 5px;
    width: 100%;
    margin-top: 5px;
}

.display {
    grid-area: 1 / 1 / 2 / calc(var(--columns) + 1);
    text-align: right;
}

.el-button {
    height: 30px;
    margin: 0;
    width: 100%;
    height: 100%;
}
</style>