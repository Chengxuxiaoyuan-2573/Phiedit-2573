<template>
    <div
        v-if="u || !u"
        class="history-editor"
    >
        <Teleport :to="props.titleTeleport">
            历史记录
        </Teleport>
        <ElButton
            type="primary"
            @click="globalEventEmitter.emit('UNDO'), update()"
        >
            撤销
        </ElButton>
        <ElButton
            type="primary"
            @click="globalEventEmitter.emit('REDO'), update()"
        >
            重做
        </ElButton>
        <ElTable
            :data="getData()"
            :row-class-name="rowClassName"
        >
            <ElTableColumn prop="description" />
        </ElTable>
    </div>
</template>
<script setup lang="ts">
import { ElButton, ElTable, ElTableColumn } from "element-plus";
import historyManager from "../services/managers/history";
import globalEventEmitter from "@/eventEmitter";
import { ref } from "vue";
const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
function update() {
    u.value = !u.value;
}
function padStart<T>(arr: T[], padLength: number, padding?: T): T[] {
    return padLength > arr.length ? Array(padLength - arr.length).fill(padding).concat(arr) : [...arr];
}
function padEnd<T>(arr: T[], padLength: number, padding?: T): T[] {
    return padLength > arr.length ? arr.concat(Array(padLength - arr.length).fill(padding)) : [...arr];
}
function getData() {
    return [
        ...padStart(historyManager.undoStack.slice(-5).map(command => {
            return {
                description: command.getDescription(),
                isCurrent: false
            }
        }), 5, {
            description: "-",
            isCurrent: false
        }),
        {
            description: "",
            isCurrent: true
        },
        ...padEnd(historyManager.redoStack.slice(-5).toReversed().map(command => {
            return {
                description: command.getDescription(),
                isCurrent: false
            }
        }), 5, {
            description: "-",
            isCurrent: false
        }),
    ]
}
function rowClassName(options: {
    row: ReturnType<typeof getData>[number],
    rowIndex: number
}) {
    return options.row.isCurrent ? "current-row" : "";
}
</script>
<style scoped>
.history-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.current-row {
    --el-table-tr-bg-color: var(--el-color-warning-light-9);
}
</style>