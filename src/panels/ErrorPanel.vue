<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div class="error-panel right-inner">
        <Teleport :to="props.titleTeleport">
            谱面纠错
        </Teleport>
        <MyButton
            type="primary"
            @click="updateErrors"
        >
            刷新纠错信息
        </MyButton>
        <MySelect
            v-model="stateManager.cache.error.errorType"
            :options="errorTypes"
            @change="updateErrors"
        >
            筛选错误类型
        </MySelect>
        <MyButton
            type="success"
            @click="autoFixErrors(), updateErrors();"
        >
            自动修复错误
        </MyButton>
        <div
            v-if="u || !u"
            class="error-list"
        >
            <div
                v-for="(error, i) in errorManager.errors"
                :key="i"
            >
                <ElCard
                    class="error-message"
                    shadow="hover"
                    @click="errorNumberShowedDetails == i ? errorNumberShowedDetails = -1 : errorNumberShowedDetails = i"
                >
                    <p
                        :class="{
                            'error-message-text': true,
                            'error-message-text-error': error.level == 'error',
                            'error-message-text-warning': error.level == 'warning',
                            'error-message-text-info': error.level == 'info',
                        }"
                        useless-attribute
                    >
                        {{ error.message }}
                    </p>
                    <div
                        v-if="errorNumberShowedDetails == i"
                        class="error-details"
                    >
                        <div
                            v-for="object in error.objects"
                            :key="object.id"
                            class="error-detail"
                        >
                            {{ isNoteLike(object) ? `${NoteType[object.type]} 音符` : "事件" }} {{ object.id }}
                            <MyButton
                                type="success"
                                @click.stop="goto(object)"
                            >
                                跳转
                            </MyButton>
                        </div>
                    </div>
                </ElCard>
            </div>
            <p v-if="errorManager.errors.length === 0">
                你的谱面没有错误！
            </p>
        </div>
    </div>
</template>
<script setup lang="ts">
import Constants from "@/constants";
import globalEventEmitter from "@/eventEmitter";
import { SelectableElement } from "@/models/element";
import { isEventLike } from "@/models/event";
import { isNoteLike, NoteType } from "@/models/note";
import MyButton from "@/myElements/MyButton.vue";
import MySelect from "@/myElements/MySelect.vue";
import store from "@/store";
import MathUtils from "@/tools/mathUtils";
import { ElCard, ElMessage } from "element-plus";
import { onBeforeUnmount, onMounted, ref } from "vue";
const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
const stateManager = store.useManager("stateManager");
const coordinateManager = store.useManager("coordinateManager");
const selectionManager = store.useManager("selectionManager");
const errorManager = store.useManager("errorManager");
const errorTypes = [
    {
        value: "All",
        label: "全部",
        text: "全部"
    },
    {
        value: "ChartReadError",
        label: "读取谱面错误",
        text: "读取谱面错误"
    },
    {
        value: "ChartEditError",
        label: "写谱错误",
        text: "写谱错误"
    }
];
const errorNumberShowedDetails = ref(-1);
function goto(object: SelectableElement) {
    stateManager.state.currentJudgeLineNumber = object.judgeLineNumber;
    if (isEventLike(object)) {
        stateManager.state.currentEventLayerId = object.eventLayerId;
    }

    if (!MathUtils.between(coordinateManager.getRelativePositionYOfSeconds(object.cachedStartSeconds),
        Constants.EDITOR_VIEW_NOTES_VIEWBOX.top,
        Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom)) {
        store.gotoBeats(object.startTime);
    }
    selectionManager.select([object]);
}

function updateErrors() {
    globalEventEmitter.emit("CHECK_ERRORS");
    u.value = !u.value;
}

function autoFixErrors() {
    globalEventEmitter.emit("AUTO_FIX_ERRORS");
}

function errorFixedHandler(fixedErrors: number) {
    if (fixedErrors) {
        ElMessage.success(`已自动修复 ${fixedErrors} 个错误`);
    }
    else {
        ElMessage.success("没有可自动修复的错误，请手动修复");
    }
}
onMounted(() => {
    updateErrors();
    globalEventEmitter.on("ERRORS_FIXED", errorFixedHandler);
});
onBeforeUnmount(() => {
    globalEventEmitter.off("ERRORS_FIXED", errorFixedHandler);
});
</script>
<style scoped>
.error-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.error-message {
    cursor: pointer;
    --el-card-padding: 10px;
}

.error-message-text-error {
    color: red;
}

.error-message-text-warning {
    color: orange;
}

.error-message-text-info {
    color: skyblue;
}

.error-details {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    gap: 5px;
}

.error-detail {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
}
</style>