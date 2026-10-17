<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->
<!-- 批量导出谱面的弹窗：可以填写导出文件夹和每个谱面的导出文件名 -->

<template>
    <MyDialog
        v-model="isShow"
        width="680px"
        title="批量导出谱面"
        :show-trigger="false"
        :close-on-click-modal="false"
        :close-on-press-escape="true"
        @closed="handleClosed"
    >
        <template #header>
            <span class="dialog-title">批量导出谱面</span>
        </template>

        <div class="section">
            <div class="section-title">
                导出文件夹
            </div>
            <div class="folder-row">
                <MyInput
                    v-model="folder"
                    placeholder="输入导出文件夹的路径，或点击右侧按钮选择"
                />
                <MyButton
                    type="primary"
                    @click="chooseFolder"
                >
                    选择文件夹
                </MyButton>
            </div>
            <em
                class="hint"
                :class="{ 'hint-warning': folderExists === false }"
            >
                {{ folderHint }}
            </em>
        </div>

        <div class="section">
            <div class="section-title">
                导出文件名（共 {{ items.length }} 个谱面）
            </div>
            <div class="file-list">
                <div
                    v-for="(item, index) in items"
                    :key="item.chartId"
                    class="file-row"
                >
                    <span
                        class="chart-name"
                        :title="item.chartName"
                    >
                        {{ item.chartName }}
                    </span>
                    <div class="file-field">
                        <MyInput
                            v-model="item.fileName"
                            placeholder="请输入导出文件名"
                        />
                        <em
                            v-if="errors[index]"
                            class="error-hint"
                        >
                            {{ errors[index] }}
                        </em>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="footer">
                <em
                    v-if="blockReason"
                    class="block-reason"
                >
                    {{ blockReason }}
                </em>
                <MyButton
                    type="primary"
                    :disabled="!canExport"
                    @click="confirmExport"
                >
                    导出
                </MyButton>
            </div>
        </template>
    </MyDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import MyDialog from "./MyDialog.vue";
import MyInput from "./MyInput.vue";
import MyButton from "./MyButton.vue";

/** 一个要导出的谱面 */
interface BatchExportChart {
    chartId: string;
    chartName: string;
}

/** 用户确认导出后的结果 */
interface BatchExportOptions {
    folder: string;
    requests: {
        chartId: string;
        fileName: string;
    }[];
}

interface BatchExportItem extends BatchExportChart {
    fileName: string;
}

/** 文件名中不允许出现的字符 */
const INVALID_CHARS_REGEX = /[\\/:*?"<>|]/;

/** 默认文件名最多保留的长度，避免超出系统限制 */
const MAX_NAME_LENGTH = 100;

/** 输入导出文件夹后，等待这么久再检查文件夹里的文件（毫秒） */
const REFRESH_DELAY = 300;

const isShow = ref(false);
const folder = ref("");
const items = ref<BatchExportItem[]>([]);

/** 导出文件夹是否存在，null 表示还不知道 */
const folderExists = ref<boolean | null>(null);

/** 导出文件夹里已有的文件名（小写），用于检查重名 */
const existingNames = ref<Set<string>>(new Set());

let resolve: ((options: BatchExportOptions | null) => void) | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/** 打开弹窗，返回用户填好的导出配置。用户取消时返回 null */
async function open(charts: BatchExportChart[], defaultFolder: string) {
    items.value = createItems(charts);
    folder.value = defaultFolder;
    folderExists.value = null;
    existingNames.value = new Set();
    isShow.value = true;
    void refreshFolderInfo();
    return new Promise<BatchExportOptions | null>(res => {
        resolve = res;
    });
}

/** 生成每个谱面的默认导出文件名，并保证它们互不重复 */
function createItems(charts: BatchExportChart[]): BatchExportItem[] {
    const used = new Set<string>();
    return charts.map(chart => {
        const base = sanitizeFileName(chart.chartName) || sanitizeFileName(chart.chartId) || "chart";
        let fileName = `${base}.pez`;
        let counter = 2;
        while (used.has(fileName.toLowerCase())) {
            fileName = `${base} (${counter++}).pez`;
        }
        used.add(fileName.toLowerCase());
        return {
            chartId: chart.chartId,
            chartName: chart.chartName,
            fileName
        };
    });
}

function sanitizeFileName(name: string) {
    return name
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/[. ]+$/, "")
        .trim()
        .slice(0, MAX_NAME_LENGTH);
}

/** 每个谱面的文件名有什么问题，没有问题时对应项是空字符串 */
const errors = computed<string[]>(() => {
    const result: string[] = [];
    const counts = new Map<string, number>();
    for (const item of items.value) {
        const key = item.fileName.trim().toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (let i = 0; i < items.value.length; i++) {
        const fileName = items.value[i].fileName.trim();
        if (fileName === "") {
            result[i] = "文件名不能为空";
            continue;
        }

        if (INVALID_CHARS_REGEX.test(fileName)) {
            result[i] = "文件名不能包含 \\ / : * ? \" < > |";
            continue;
        }

        if (/[. ]$/.test(fileName)) {
            result[i] = "文件名不能以空格或点结尾";
            continue;
        }

        if (existingNames.value.has(fileName.toLowerCase())) {
            result[i] = "文件夹内已存在同名文件";
            continue;
        }

        if ((counts.get(fileName.toLowerCase()) ?? 0) > 1) {
            result[i] = "与其他谱面的导出文件名重复";
        }
    }
    return result;
});

const hasFileError = computed(() => items.value.some((_item, index) => Boolean(errors.value[index])));

const canExport = computed(() => items.value.length > 0 && folder.value.trim() !== "" && !hasFileError.value);

const folderHint = computed(() => {
    if (folder.value.trim() === "") {
        return "请填写导出文件夹。文件夹不存在时会在导出时自动创建。";
    }

    if (folderExists.value === null) {
        return "文件夹不存在时会在导出时自动创建。";
    }
    return folderExists.value ?
        "该文件夹已存在，导出前会检查文件名是否与文件夹内已有的文件重名。" :
        "该文件夹还不存在，会在导出时自动创建。";
});

const blockReason = computed(() => {
    if (canExport.value) {
        return "";
    }

    if (folder.value.trim() === "") {
        return "请先填写导出文件夹";
    }

    if (hasFileError.value) {
        return "请先修正导出文件名";
    }
    return "暂无可导出的谱面";
});

/** 读取导出文件夹的信息，检查是否存在、有哪些文件 */
async function refreshFolderInfo() {
    const dir = folder.value.trim();
    if (dir === "") {
        folderExists.value = null;
        existingNames.value = new Set();
        return;
    }

    try {
        const info = await window.electronAPI.readExportFolderInfo(dir);

        // 读取期间用户又改了路径，就丢弃这次的结果
        if (folder.value.trim() !== dir) {
            return;
        }
        folderExists.value = info.exists;
        existingNames.value = new Set(info.files.map(name => name.toLowerCase()));
    }
    catch {
        folderExists.value = null;
        existingNames.value = new Set();
    }
}

watch(folder, () => {
    if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void refreshFolderInfo();
    }, REFRESH_DELAY);
});

async function chooseFolder() {
    const result = await window.electronAPI.showOpenDirectoryDialog(folder.value.trim() || undefined);
    if (!result || result.length === 0) {
        return;
    }
    folder.value = result[0];

    // 用户刚选完文件夹，立刻检查一次
    if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
    }
    void refreshFolderInfo();
}

function confirmExport() {
    if (!canExport.value) {
        return;
    }

    const options: BatchExportOptions = {
        folder: folder.value.trim(),
        requests: items.value.map(item => ({
            chartId: item.chartId,
            fileName: item.fileName.trim()
        }))
    };
    isShow.value = false;
    resolve?.(options);
    resolve = null;
}

function handleClosed() {
    // 点了右上角的叉或者取消，都算放弃导出
    resolve?.(null);
    resolve = null;
}

onBeforeUnmount(() => {
    if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
    }
});

defineExpose({ open });
</script>
<style scoped>
.dialog-title {
    font-size: 16px;
    font-weight: bold;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.section-title {
    font-size: 14px;
    font-weight: bold;
}

.folder-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.folder-row :deep(.el-input) {
    flex: 1;
}

.hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.hint-warning {
    color: var(--el-color-warning);
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 40vh;
    overflow-y: auto;
    padding-right: 4px;
}

.file-row {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 10px;
    align-items: start;
}

.chart-name {
    display: block;
    line-height: 32px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.file-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.error-hint {
    font-size: 12px;
    color: var(--el-color-danger);
}

.footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    width: 100%;
}

.block-reason {
    margin-right: auto;
    font-size: 12px;
    color: var(--el-color-danger);
}
</style>
