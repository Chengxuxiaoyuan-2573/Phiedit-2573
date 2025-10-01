<template>
    <div
        v-if="u || !u"
        class="history-panel right-inner"
    >
        <Teleport :to="props.titleTeleport">
            历史记录
        </Teleport>
        <em>
            已记录{{ historyManager.getSize() }}条历史记录
            （显示最近的{{ num * 2 }}条）
        </em>
        <MyButton
            type="primary"
            @click="globalEventEmitter.emit('UNDO')"
        >
            撤销（Ctrl+Z）
        </MyButton>
        <MyButton
            type="primary"
            @click="globalEventEmitter.emit('REDO')"
        >
            重做（Ctrl+Y）
        </MyButton>
        <ElTable
            :data="getData()"
            :row-class-name="rowClassName"
        >
            <ElTableColumn prop="description" />
        </ElTable>
    </div>
</template>
<script setup lang="ts">
import { ElTable, ElTableColumn } from "element-plus";
import MyButton from "@/myElements/MyButton.vue";
import globalEventEmitter from "@/eventEmitter";
import { onBeforeUnmount, onMounted, ref } from "vue";
import store from "@/store";
const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
const historyManager = store.useManager("historyManager");
onMounted(() => {
    globalEventEmitter.on("HISTORY_UPDATE", update);
});
onBeforeUnmount(() => {
    globalEventEmitter.off("HISTORY_UPDATE", update);
});
function update() {
    u.value = !u.value;
}

function padStart<T>(arr: T[], padLength: number, padding?: T): T[] {
    return padLength > arr.length ?
        Array(padLength - arr.length)
            .fill(padding)
            .concat(arr) :
        [...arr];
}

function padEnd<T>(arr: T[], padLength: number, padding?: T): T[] {
    return padLength > arr.length ? arr.concat(Array(padLength - arr.length).fill(padding)) : [...arr];
}

const num = 3;
function getData() {
    return [
        ...padStart(historyManager.undoStack.slice(-num).map(command => {
            return {
                description: command.getDescription(),
                isCurrent: false
            };
        }), num, {
            description: "-",
            isCurrent: false
        }),
        {
            description: "",
            isCurrent: true
        },
        ...padEnd(historyManager.redoStack.slice(-num).reverse()
            .map(command => {
                return {
                    description: command.getDescription(),
                    isCurrent: false
                };
            }), num, {
            description: "-",
            isCurrent: false
        }),
    ];
}

function rowClassName(options: {
    row: ReturnType<typeof getData>[number],
    rowIndex: number
}) {
    return options.row.isCurrent ? "current-row" : "";
}
</script>
<style scoped>
.current-row {
    --el-table-tr-bg-color: var(--el-color-warning-light-9);
}
</style>