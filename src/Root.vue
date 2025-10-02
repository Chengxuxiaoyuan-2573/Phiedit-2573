<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <!-- 由于要使用 top-level-await，所以要用 Suspense -->
    <Suspense>
        <RouterView />
    </Suspense>
    <ElDialog
        v-model="isShow"
    >
        <template #header>
            检查更新
        </template>
        <template #default>
            <!-- State-based content rendering -->
            <div
                v-if="updateState === UpdateState.CHECKING"
                class="update-dialog-content"
            >
                正在检查更新...
            </div>
            <div
                v-else-if="updateState === UpdateState.AVAILABLE"
                class="update-dialog-content"
            >
                <p>发现新版本：{{ updateInfo?.version }}</p>
                <p>更新日期：{{ updateInfo?.releaseDate }}</p>
                <br>
                <div>
                    更新内容：
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <pre v-html="safeReleaseNotes" />
                </div>
                <MyButton
                    type="success"
                    @click="downloadUpdate"
                >
                    立即下载
                </MyButton>
            </div>
            <div
                v-else-if="updateState === UpdateState.NOT_AVAILABLE"
                class="update-dialog-content"
            >
                <p>当前已是最新版本：{{ updateInfo?.version }}</p>
            </div>
            <div
                v-else-if="updateState === UpdateState.DOWNLOADING"
                class="update-dialog-content"
            >
                下载进度: {{ MathUtils.formatData(downloadProgress!.transferred) }} / {{ MathUtils.formatData(downloadProgress!.total) }}
                <ElProgress :percentage="Math.round(downloadProgress?.percent || 0)" />
            </div>
            <div
                v-else-if="updateState === UpdateState.DOWNLOADED"
                class="update-dialog-content"
            >
                下载完成！点击下方按钮退出软件，并开始安装。
                <MyButton
                    type="success"
                    @click="quitAndInstall"
                >
                    退出并安装
                </MyButton>
            </div>
            <div
                v-else-if="updateState === UpdateState.ERROR"
                class="update-dialog-content"
            >
                更新失败：
                <span v-if="error?.message.includes('net::ERR_CONNECTION_RESET')">
                    连接已中断，请检查你与 Github 的网络连接
                </span>
                <span v-else-if="error?.message.includes('net::ERR_CONNECTION_TIMED_OUT')">
                    连接超时，请检查你与 Github 的网络连接
                </span>
                <span v-else-if="error?.message.includes('net::ERR_INTERNET_DISCONNECTED')">
                    未连接到互联网
                </span>
                <p class="error-message">
                    {{ error?.message }}
                </p>
                <MyButton
                    type="primary"
                    @click="checkForUpdates()"
                >
                    点击重试
                </MyButton>
            </div>
        </template>
    </ElDialog>
</template>
<script setup lang="ts">
import { ElDialog, ElLoading, ElProgress } from "element-plus";
import { RouterView } from "vue-router";
import { computed, provide, ref } from "vue";
import { UpdateInfo, ProgressInfo } from "electron-updater";
import MyButton from "./myElements/MyButton.vue";
import DOMPurify from "dompurify";
import { Replace } from "./tools/typeTools";
import MathUtils from "./tools/mathUtils";

defineOptions({
    name: "MainRoot"
});
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null;
const isShow = ref(false);

const safeReleaseNotes = computed(() => {
    if (!updateInfo.value?.releaseNotes) return "";

    return DOMPurify.sanitize(updateInfo.value.releaseNotes);
});

function loadStart() {
    loadingInstance = ElLoading.service({
        lock: true,
        text: "加载中...",
        background: "rgba(255, 255, 255, 0.3)"
    });
}

function loadEnd() {
    loadingInstance?.close();
    loadingInstance = null;
}

provide("loadStart", loadStart);
provide("loadEnd", loadEnd);
provide("showUpdateDialog", showUpdateDialog);

enum UpdateState {
    IDLE = "idle",
    CHECKING = "checking",
    AVAILABLE = "available",
    NOT_AVAILABLE = "not-available",
    DOWNLOADING = "downloading",
    DOWNLOADED = "downloaded",
    ERROR = "error"
}

const updateState = ref<UpdateState>(UpdateState.IDLE);
const updateInfo = ref<Replace<UpdateInfo, "releaseNotes", string> | null>(null);
const downloadProgress = ref<ProgressInfo | null>(null);
const error = ref<Error | null>(null);

function showUpdateDialog() {
    if (!isShow.value) {
        isShow.value = true;
    }
}

function checkForUpdates() {
    window.electronAPI.checkForUpdates();
}

function downloadUpdate() {
    window.electronAPI.downloadUpdate();
}

function quitAndInstall() {
    window.electronAPI.quitAndInstall();
}

window.electronAPI.onUpdateChecking(() => {
    updateState.value = UpdateState.CHECKING;
});

window.electronAPI.onUpdateAvailable((info) => {
    updateState.value = UpdateState.AVAILABLE;
    updateInfo.value = info;
    showUpdateDialog();
});

window.electronAPI.onUpdateNotAvailable((info) => {
    updateState.value = UpdateState.NOT_AVAILABLE;
    updateInfo.value = info;
});

window.electronAPI.onUpdateDownloadProgress((progress) => {
    updateState.value = UpdateState.DOWNLOADING;
    downloadProgress.value = progress;
    showUpdateDialog();
});

window.electronAPI.onUpdateDownloaded((info) => {
    updateState.value = UpdateState.DOWNLOADED;
    updateInfo.value = info;
    showUpdateDialog();
});

window.electronAPI.onUpdateError((err) => {
    updateState.value = UpdateState.ERROR;
    error.value = err;
    console.error(err);
});
</script>
<style scoped>
.update-dialog-content {
    display: flex;
    flex-direction: column;
}
</style>