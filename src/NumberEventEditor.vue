<template>
    <h1>{{ model.type }}事件编辑</h1>
    <MyInput
        v-model="model.startString"
        v-model:when="model.startTime"
    >
        <template #prepend>
            开始时间
        </template>
    </MyInput>
    <MyInput
        v-model="model.endString"
        v-model:when="model.endTime"
    >
        <template #prepend>
            结束时间
        </template>
    </MyInput>
    <MyInputNumber v-model="model.start">
        <template #prepend>
            开始值
        </template>
    </MyInputNumber>
    <MyInputNumber v-model="model.end">
        <template #prepend>
            结束值
        </template>
    </MyInputNumber>
    <ElSwitch
        v-model="model.bezier"
        active-text="使用Bezier曲线"
        inactive-text="不使用Bezier曲线"
        :active-value="1"
        :inactive-value="0"
    />
    <span v-if="model.bezier">不支持Bezier曲线</span>
    <template v-else>
        <ElSelect v-model="model.easingType">
            <ElOption
                :value="1"
                label="Linear"
            />
            <ElOption
                :value="2"
                label="SineOut"
            />
            <ElOption
                :value="3"
                label="SineIn"
            />
            <ElOption
                :value="4"
                label="QuadOut"
            />
            <ElOption
                :value="5"
                label="QuadIn"
            />
            <ElOption
                :value="6"
                label="SineInOut"
            />
            <ElOption
                :value="7"
                label="QuadInOut"
            />
            <ElOption
                :value="8"
                label="CubicOut"
            />
            <ElOption
                :value="9"
                label="CubicIn"
            />
            <ElOption
                :value="10"
                label="QuartOut"
            />
            <ElOption
                :value="11"
                label="QuartIn"
            />
            <ElOption
                :value="12"
                label="CubicInOut"
            />
            <ElOption
                :value="13"
                label="QuartInOut"
            />
            <ElOption
                :value="14"
                label="QuintOut"
            />
            <ElOption
                :value="15"
                label="QuintIn"
            />
            <ElOption
                :value="16"
                label="ExpoOut"
            />
            <ElOption
                :value="17"
                label="ExpoIn"
            />
            <ElOption
                :value="18"
                label="CircOut"
            />
            <ElOption
                :value="19"
                label="CircIn"
            />
            <ElOption
                :value="20"
                label="BackOut"
            />
            <ElOption
                :value="21"
                label="BackIn"
            />
            <ElOption
                :value="22"
                label="CircInOut"
            />
            <ElOption
                :value="23"
                label="BackInOut"
            />
            <ElOption
                :value="24"
                label="ElasticOut"
            />
            <ElOption
                :value="25"
                label="ElacticIn"
            />
            <ElOption
                :value="26"
                label="BounceOut"
            />
            <ElOption
                :value="27"
                label="BounceIn"
            />
            <ElOption
                :value="28"
                label="BounceIO"
            />
            <ElOption
                :value="29"
                label="ElasticIO"
            />
        </ElSelect>
        <ElSlider
            v-model="model.easingLeftRight"
            range
            :min="0"
            :max="1"
            :step="0.01"
        />
    </template>
</template>
<script setup lang="ts">
import { NumberEvent } from './classes/event';
import MyInput from './myElements/MyInput.vue';
import MyInputNumber from './myElements/MyInputNumber.vue';
import { ElSwitch } from 'element-plus';
const model = defineModel<NumberEvent>({
    required: true
})
</script>