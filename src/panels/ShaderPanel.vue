<template>
    <div
        v-if="u || !u"
        class="shader-panel right-inner"
    >
        <Teleport :to="props.titleTeleport">
            shader编辑
        </Teleport>
        <div class="effect-list">
            <div
                v-for="(effect, i) in extra.effects"
                :key="i"
                class="effect-item"
            >
                <span v-if="effect.description">
                    {{ effect.description }}
                </span>
                <span v-else>
                    {{ defaultDescription(effect) }}
                </span>
                <MyDialog
                    open-text="编辑"
                    @closed="updateEffectList()"
                >
                    <template #default="{ close }">
                        <MySelect
                            v-model="effect.shader"
                            :options="shaderOptions"
                            @change="updateVarList()"
                        >
                            shader 类型
                        </MySelect>
                        <MyInput
                            v-model="effect.description"
                            :placeholder="defaultDescription(effect)"
                        >
                            <template #prepend>
                                shader 描述
                            </template>
                        </MyInput>
                        <MySwitch v-model="effect.global">
                            全局 shader
                            <MyQuestionMark>
                                启用全局 shader 后，shader 会影响界面上显示的所有东西。<br>
                                如果不启用，shader 就不会影响界面上未被绑定的 UI。<br>
                            </MyQuestionMark>
                        </MySwitch>
                        <MyInputBeats v-model="effect.start">
                            <template #prepend>
                                开始时间
                            </template>
                        </MyInputBeats>
                        <MyInputBeats v-model="effect.end">
                            <template #prepend>
                                结束时间
                            </template>
                        </MyInputBeats>
                        <template v-if="v || !v">
                            <div
                                v-for="variable in getNumberVars(effect)"
                                :key="variable"
                                class="effect-var"
                            >
                                <div class="effect-var-static">
                                    <p>
                                        {{ variable }}
                                    </p>
                                    <MyInputNumber
                                        v-if="isNumber(effect.vars[variable])"
                                        v-model="effect.vars[variable]"
                                        :min="DEFAULT_VARS[effect.shader][variable].min"
                                        :max="DEFAULT_VARS[effect.shader][variable].max"
                                    />
                                    <MyInputVector
                                        v-else-if="isArrayOfNumbers(effect.vars[variable])"
                                        v-model="effect.vars[variable]"
                                    />
                                    <MyButton
                                        v-show="isNumberOrVector(effect.vars[variable])"
                                        class="switch-button"
                                        type="primary"
                                        @click="effect.changeToDynamic(variable), updateVarList()"
                                    >
                                        切换为动态变量值
                                    </MyButton>
                                    <MyButton
                                        v-show="!isNumberOrVector(effect.vars[variable])"
                                        class="switch-button"
                                        type="primary"
                                        @click="confirm(() => (effect.changeToStatic(variable), updateVarList()), '确定要切换回静态变量值吗？（切换后已设置的动态值会丢失）', '切换为静态变量值')"
                                    >
                                        切换为静态变量值
                                    </MyButton>
                                </div>
                                <div
                                    v-if="!isNumberOrVector(effect.vars[variable]) && (w || !w)"
                                    class="effect-var-dynamic"
                                >
                                    <MyGridContainer
                                        :columns="6"
                                        :gap="10"
                                    >
                                        <h3>开始时间</h3>
                                        <h3>结束时间</h3>
                                        <h3>开始值</h3>
                                        <h3>结束值</h3>
                                        <h3>缓动类型</h3>
                                        <h3>删除</h3>
                                    </MyGridContainer>
                                    <MyGridContainer
                                        v-for="(event, j) in effect.vars[variable]"
                                        :key="j"
                                        :columns="6"
                                        :gap="10"
                                    >
                                        <MyInputBeats v-model="event.startTime" />
                                        <MyInputBeats v-model="event.endTime" />
                                        <template
                                            v-if="DEFAULT_VARS[effect.shader][variable].type === 'float' || DEFAULT_VARS[effect.shader][variable].type === 'int'"
                                        >
                                            <MyInputNumber v-model="event.start as number" />
                                            <MyInputNumber v-model="event.end as number" />
                                        </template>
                                        <template v-else>
                                            <MyInputVector v-model="event.start as number[]" />
                                            <MyInputVector v-model="event.end as number[]" />
                                        </template>
                                        <MySelectEasing v-model="event.easingType" />
                                        <MyButton
                                            type="danger"
                                            @click="effect.removeEvent(event, variable), updateEventList()"
                                        >
                                            删除
                                        </MyButton>
                                    </MyGridContainer>
                                    <MyButton
                                        class="effect-var-add-event-button"
                                        type="success"
                                        @click="effect.addEvent({
                                            start: effect.vars[variable][effect.vars[variable].length - 1]?.end,
                                            end: effect.vars[variable][effect.vars[variable].length - 1]?.end,
                                            startTime: [...effect.vars[variable][effect.vars[variable].length - 1]?.endTime ?? [0, 0, 1]],
                                            endTime: [...effect.vars[variable][effect.vars[variable].length - 1]?.endTime ?? [0, 0, 1]],
                                            easingType: effect.vars[variable][effect.vars[variable].length - 1]?.easingType,
                                        }, variable), updateEventList()"
                                    >
                                        添加
                                    </MyButton>
                                </div>
                            </div>
                        </template>
                        <MyButton
                            type="danger"
                            @click="confirm(() => (extra.removeEffect(effect), close(), updateEffectList()), '确定要删除此特效吗？（该操作不可撤销）', '删除特效')"
                        >
                            删除此 shader
                        </MyButton>
                        <p>
                            动态变量值就是一堆 shader 事件，可以控制变量在不同时间变化为不同的值。静态变量值就是一个固定的值。目前编辑 shader 事件只能手动编辑，有点不方便。
                        </p>
                    </template>
                </MyDialog>
            </div>
            <MyButton
                type="success"
                @click="addEffect(), updateEffectList()"
            >
                添加
            </MyButton>
        </div>
    </div>
</template>
<script setup lang="ts">
import { formatBeats } from "@/models/beats";
import { DEFAULT_VARS, Effect, isNumberOrVector, ShaderName } from "@/models/effect";
import MyButton from "@/myElements/MyButton.vue";
import MyDialog from "@/myElements/MyDialog.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MyInput from "@/myElements/MyInput.vue";
import MyInputBeats from "@/myElements/MyInputBeats.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyInputVector from "@/myElements/MyInputVector.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import MySelect from "@/myElements/MySelect.vue";
import MySelectEasing from "@/myElements/MySelectEasing.vue";
import MySwitch from "@/myElements/MySwitch.vue";
import store from "@/store";
import { confirm } from "@/tools/catchError";
import { isArrayOfNumbers } from "@/tools/typeTools";
import { isNumber } from "lodash";
import { ref } from "vue";

const props = defineProps<{
    titleTeleport: string;
}>();
const extra = store.useExtra();
function addEffect() {
    extra.addEffect(null);
}

function getNumberVars(effect: Effect): string[] {
    return Object.keys(DEFAULT_VARS[effect.shader]);
}

const u = ref(false);
const v = ref(false);
const w = ref(false);
const map = {
    chromatic: "色散特效",
    circleBlur: "圆点模糊",
    fisheye: "鱼眼凹凸效果",
    glitch: "故障特效",
    grayscale: "黑白滤镜",
    noise: "噪点特效",
    pixel: "马赛克效果",
    radialBlur: "径向模糊",
    shockwave: "冲击波效果",
    vignette: "暗角效果",
};
const shaderOptions = (Object.keys(DEFAULT_VARS) as ShaderName[]).map((key) => {
    return {
        value: key,
        label: `${key}（${map[key]}）`,
        text: `${key}（${map[key]}）`
    };
});
function defaultDescription(effect: Effect) {
    return ` ${effect.id + 1}. ${effect.shader} ${formatBeats(effect.startTime)}~${formatBeats(effect.endTime)}`;
}

function updateEffectList() {
    u.value = !u.value;
}

function updateVarList() {
    v.value = !v.value;
}

function updateEventList() {
    w.value = !w.value;
}
</script>
<style scoped>
.effect-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.effect-list>div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.effect-var {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.effect-var-static {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.effect-var-dynamic {
    display: flex;
    gap: 10px;
    flex-direction: column;
    width: 100%;
}

.effect-var-add-event-button {
    width: 100%;
}
</style>