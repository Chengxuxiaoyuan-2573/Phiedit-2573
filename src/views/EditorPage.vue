<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElContainer>
        <!-- audio 元素放在 header 之外，保证校准模式（header 隐藏）下音频依然挂载、可播放、可读 currentTime -->
        <audio
            ref="audioRef"
            :src="store.chartPackageRef.value?.musicSrc"
        />
        <ElHeader
            v-if="!isCalibration"
            id="header"
        >
            <ElScrollbar
                id="header-inner"
                @wheel.passive.stop
            >
                <div class="audio-player">
                    <template v-if="audioRef">
                        <ElIcon
                            class="play-icon"
                            size="30"
                            @click="globalEventEmitter.emit('TOGGLE_PLAY')"
                        >
                            <VideoPlay v-if="!audioIsPlaying" />
                            <VideoPause v-else />
                        </ElIcon>
                        <p>
                            {{ Math.floor(time / 60) }}:{{ Math.floor(time % 60).toString().padStart(2, "0") }}
                        </p>
                        <ElSlider
                            v-model="time"
                            :min="0"
                            :max="audioRef.duration"
                            :step="0.01"
                            :format-tooltip="(seconds) => {
                                const min = Math.floor(seconds / 60)
                                    .toString()
                                    .padStart(2, '0');
                                const sec = Math.round(seconds % 60)
                                    .toString()
                                    .padStart(2, '0');
                                return `${min}:${sec}`;
                            }"
                            @input="store.pauseAudio(), store.setTime(time as number)"
                        />
                    </template>
                </div>
                <ElRadioGroup
                    v-if="resourcePackageRef"
                    v-model="stateManager.state.currentNoteType"
                    class="note-type-select"
                >
                    <ElRadioButton
                        class="note-type-option note-type-tap"
                        :value="NoteType.Tap"
                    >
                        <MyImage
                            :image="resourcePackageRef.tap"
                            :width="80"
                            :height="30"
                            shadow
                        />
                        <p>Tap（Q）</p>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-drag"
                        :value="NoteType.Drag"
                    >
                        <MyImage
                            :image="resourcePackageRef.drag"
                            :width="80"
                            :height="30"
                            shadow
                        />
                        <p>Drag（W）</p>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-flick"
                        :value="NoteType.Flick"
                    >
                        <MyImage
                            :image="resourcePackageRef.flick"
                            :width="80"
                            :height="30"
                            shadow
                        />
                        <p>Flick（E）</p>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-hold"
                        :value="NoteType.Hold"
                    >
                        <MyImage
                            :image="resourcePackageRef.hold"
                            rotate="anti-clockwise"
                            :width="80"
                            :height="30"
                            shadow
                        />
                        <p>Hold（R）</p>
                    </ElRadioButton>
                </ElRadioGroup>
                <p class="info">
                    <span
                        :style="{
                            color: fpsColor,
                            display: 'block',
                            whiteSpace: 'nowrap',
                        }"
                        useless-attribute
                    >
                        FPS: {{ fps.toFixed(2) }}
                    </span>
                    <span v-show="mouseIsInCanvas">
                        ({{ mouseX.toFixed(0) }}, {{ mouseY.toFixed(0) }})
                    </span>
                </p>
                <MySelect
                    v-if="audioRef"
                    v-model="audioRef.playbackRate"
                    class="speed-select"
                    :options="speedOptions"
                >
                    倍速
                </MySelect>
                <MyInputNumber
                    v-model="stateManager.state.horizonalLineCount"
                    class="horizontal-input"
                    :min="1"
                    :max="64"
                >
                    <template #prepend>
                        横线数
                        <MyQuestionMark>
                            一拍内有多少条横线。在写一些奇怪的节奏时可能需要临时修改。<br>
                            假如a分音符为一拍，横线数为b，则每个格子代表（a×b）分音。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
                <MyInputNumber
                    v-model="stateManager.state.verticalLineCount"
                    class="vertical-input"
                    :min="0"
                    :max="100"
                >
                    <template #prepend>
                        竖线数
                        <MyQuestionMark>
                            左边的音符编辑区域内有多少条竖线。用于让排键更规整。<br>
                            建议调为19或21。如果要取消竖线，请设为0。取消竖线后你的排键可能会很乱。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
                <div>
                    点击右侧按钮切换事件层级
                </div>
                <MyGridContainer
                    class="event-layer-select"
                    :columns="5"
                    :gap="5"
                >
                    <MyButton
                        v-for="i in Math.min(stateManager.eventLayersCount, 4)"
                        :key="i - 1"
                        type="primary"
                        :plain="i - 1 != parseInt(stateManager.state.currentEventLayerId)"
                        @click="stateManager.state.currentEventLayerId = (i - 1).toString()"
                    >
                        {{ i - 1 }}
                    </MyButton>
                    <MyButton
                        type="warning"
                        :plain="stateManager.state.currentEventLayerId != 'X'"
                        @click="stateManager.state.currentEventLayerId = 'X'"
                    >
                        特殊
                    </MyButton>
                </MyGridContainer>
                <MyInputNumber
                    v-model="chart.META.offset"
                    class="offset-input"
                >
                    <template #prepend>
                        偏移
                        <MyQuestionMark>
                            谱面的偏移量，单位为毫秒。<br>
                            正数表示谱面比音乐延后，负数表示谱面比音乐提前。<br>
                            建议控制在-500~500之间。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
            </ElScrollbar>
        </ElHeader>
        <ElAside
            v-if="!isCalibration"
            id="left"
            @wheel.passive.stop
        >
            <div
                v-if="!stateManager.state.autoplay"
                class="left-inner default-panel flex-container"
                style="justify-content: space-between;"
            >
                <div>
                    <p>当前处于试玩模式，请使用键盘游玩</p>
                    <p>Tap：落到判定线上时按下任意键</p>
                    <p>Hold：落到判定线上时按住任意键直到其结束</p>
                    <p>Drag、Flick：落到判定线上时有任意键被按下即可</p>
                </div>
                <MyButton
                    type="primary"
                    @click="exitPlayChart()"
                >
                    退出试玩
                </MyButton>
            </div>
            <div
                v-else-if="selectionManager.selectedElements.length == 0"
                class="left-inner default-panel flex-container"
                style="justify-content: space-between;"
            >
                <div class="flex-container">
                    <h1>Phiedit 2573</h1>
                    <MyButton
                        type="primary"
                        class="save-chart-button"
                        @click="globalEventEmitter.emit('SAVE')"
                    >
                        保存谱面
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="exportChart"
                    >
                        导出谱面
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="catchErrorByMessage(addTextures, '添加判定线贴图')"
                    >
                        添加判定线贴图
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="openChartFolder"
                    >
                        打开谱面文件夹
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="openTipsFolder"
                    >
                        打开 tips.txt 文件夹
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="checkForUpdates"
                    >
                        检查更新
                    </MyButton>
                    <MyDialog
                        type="primary"
                        open-text="渲染为视频"
                        :close-on-click-modal="!isRenderingVideo"
                        :close-on-press-escape="!isRenderingVideo"
                        :show-close="!isRenderingVideo"
                        draggable
                        @closed="videoRenderingProgress.done = false"
                    >
                        <template #default="{ close }">
                            <div
                                v-if="isRenderingVideo"
                                class="export-options"
                            >
                                <p>
                                    {{ videoRenderingProgress.message }}（剩余{{
                                        MathUtils.formatTime(videoRenderingProgress.remainingTime) }}）
                                </p>
                                <p>渲染过程中请不要将电脑锁屏或关机</p>
                                <ElProgress
                                    :percentage="clamp(MathUtils.round(videoRenderingProgress.percent, 2), 0, 100)"
                                />
                                <MyButton
                                    type="warning"
                                    @click="cancelVideoRendering"
                                >
                                    取消渲染
                                </MyButton>
                            </div>
                            <div
                                v-else-if="videoRenderingProgress.done"
                                class="export-options"
                            >
                                渲染完成！
                                渲染谱面用时：{{ MathUtils.formatTime(renderVideoTime / 1000) }}
                                <MyButton
                                    type="primary"
                                    @click="close()"
                                >
                                    确定
                                </MyButton>
                            </div>
                            <div
                                v-else
                                class="export-options"
                            >
                                <h2>渲染选项</h2>
                                <MyInputNumber
                                    v-model="settingsManager.settings.backgroundDarkness"
                                    :min="0"
                                    :max="100"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        背景黑暗度
                                    </template>
                                    <template #append>
                                        %
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.noteSize"
                                    :min="0"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        音符大小
                                    </template>
                                    <template #append>
                                        像素
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.lineThickness"
                                    :min="0"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        判定线粗细
                                    </template>
                                    <template #append>
                                        像素
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.lineLength"
                                    :min="0"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        判定线长度
                                    </template>
                                    <template #append>
                                        像素
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.textSize"
                                    :min="0"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        文字大小
                                    </template>
                                    <template #append>
                                        像素
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.renderTimeStart"
                                    :min="0"
                                    :max="audioRef?.duration"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        渲染开始时间
                                    </template>
                                    <template #append>
                                        秒
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.renderTimeEnd"
                                    :min="0"
                                    :max="audioRef?.duration"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        渲染结束时间
                                    </template>
                                    <template #append>
                                        秒
                                    </template>
                                </MyInputNumber>
                                <MyInputNumber
                                    v-model="settingsManager.settings.renderFPS"
                                    :min="0"
                                    :min-inclusive="false"
                                    @change="settingsManager.saveSettings()"
                                >
                                    <template #prepend>
                                        FPS
                                    </template>
                                    <template #append>
                                        帧/秒
                                    </template>
                                </MyInputNumber>
                                <MyButton
                                    type="primary"
                                    @click="catchErrorByMessage(renderVideo, '导出视频')"
                                >
                                    开始渲染
                                </MyButton>
                            </div>
                        </template>
                    </MyDialog>
                    <MyButton
                        type="primary"
                        @click="playChart()"
                    >
                        试玩
                    </MyButton>
                    <MyButton
                        v-if="!stateManager.state.accompanimentMode"
                        type="success"
                        @click="globalEventEmitter.emit('ACCOMPANIMENT_TOGGLE')"
                    >
                        伴随创作
                    </MyButton>
                    <MyButton
                        v-else
                        type="danger"
                        @click="globalEventEmitter.emit('ACCOMPANIMENT_STOP')"
                    >
                        停止伴随创作
                    </MyButton>
                </div>
                <div class="flex-container">
                    <MyButton
                        type="warning"
                        class="exit-button"
                        @click="confirm(() => $router.push('/'), '退出编辑后未保存的谱面将会丢失', '退出编辑')"
                    >
                        退出编辑
                    </MyButton>
                    <MyButton
                        type="danger"
                        class="delete-chart-button"
                        @click="confirm(deleteChart, '确定要删除此谱面吗？', '删除谱面')"
                    >
                        删除谱面
                    </MyButton>
                </div>
            </div>
            <template v-else>
                <MyBackHeader
                    class="title-left"
                    @back="selectionManager.unselectAll()"
                />
                <MutipleEditPanel
                    v-if="selectionManager.selectedElements.length > 1"
                    title-teleport=".title-left"
                />
                <NoteEditPanel
                    v-else-if="isNoteLike(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <NumberEventEditPanel
                    v-else-if="isNumberEvent(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <ColorEventEditPanel
                    v-else-if="isColorEvent(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
                <TextEventEditPanel
                    v-else-if="isTextEvent(selectionManager.selectedElements[0])"
                    v-model="selectionManager.selectedElements[0]"
                    title-teleport=".title-left"
                />
            </template>
        </ElAside>
        <ElMain id="main">
            <canvas
                ref="canvasRef"
                class="canvas"
                :width="1350"
                :height="900"
            />
            <div
                v-if="isCalibration"
                class="calibration-hud"
                :class="{ 'is-fading-out': !!calibrationResult }"
                style="position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 3000; background: rgba(20, 22, 30, 0.78); color: #fff; padding: 14px 22px; border-radius: 12px; font-size: 15px; line-height: 1.7; text-align: center; pointer-events: none; backdrop-filter: blur(6px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);"
            >
                <div style="font-size: 17px; font-weight: 600;">
                    🎯 跟着鼓点按下任意键
                </div>
                <div>
                    实时 offset：<b>{{ calibrationState.offsetMs === null ? "采样中…" : calibrationState.offsetMs + " ms" }}</b>
                </div>
                <div>有效样本：{{ calibrationState.validCount }} / {{ calibrationState.pressCount }} 次按键</div>
                <div style="opacity: 0.75; font-size: 13px;">
                    误差判定只依据鼓点真值 · 按 ESC 结束采样
                </div>
            </div>
            <div
                v-if="isCalibration && calibrationResult"
                class="calibration-result"
            >
                <div class="calibration-result-center">
                    <div class="calibration-ribbon">
                        <div class="calibration-ribbon-bar" />
                        <div class="calibration-ribbon-tie calibration-ribbon-tie-left" />
                        <div class="calibration-ribbon-tie calibration-ribbon-tie-right" />
                    </div>
                    <div
                        v-if="calibrationResult.offsetMs !== null"
                        class="calibration-result-value"
                    >
                        {{ calibrationResult.offsetMs }}
                    </div>
                    <div
                        v-else
                        class="calibration-result-empty"
                    >
                        采样不足
                    </div>
                </div>
                <div class="calibration-result-actions">
                    <button
                        class="calibration-action calibration-action-discard"
                        title="放弃这次测出的 offset，不计入设置"
                        @click="discardCalibration"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                        >
                            <path d="M5 5 L19 19 M19 5 L5 19" />
                        </svg>
                    </button>
                    <button
                        class="calibration-action calibration-action-confirm"
                        :disabled="calibrationResult.offsetMs === null"
                        title="记录这次测出的 offset"
                        @click="confirmCalibration"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M4 12.5 L10 18.5 L20 6" />
                        </svg>
                    </button>
                </div>
            </div>
            <div
                v-if="stateManager.state.accompanimentCountdown !== null || stateManager.state.accompanimentListening"
                class="accompaniment-overlay"
            >
                <div
                    v-if="stateManager.state.accompanimentCountdown !== null"
                    class="accompaniment-countdown"
                >
                    {{ stateManager.state.accompanimentCountdown }}
                </div>
                <div
                    v-else
                    class="accompaniment-listening"
                >
                    <span class="accompaniment-dot" />
                    监听中 · 按 Q / W / E / R 放置 Tap / Drag / Flick / Hold
                </div>
            </div>
        </ElMain>
        <ElAside
            v-if="!isCalibration"
            id="right"
            @wheel.passive.stop
        >
            <div v-if="!stateManager.state.autoplay">
                <p>Perfect：{{ judgeManager.judgeInfo.perfect }}</p>
                <p>Good：{{ judgeManager.judgeInfo.good }}</p>
                <p>Bad：{{ judgeManager.judgeInfo.bad }}</p>
                <p>Miss：{{ judgeManager.judgeInfo.miss }}</p>
                <p>Combo: {{ judgeManager.judgeInfo.combo }}</p>
                <p>Score: {{ judgeManager.judgeInfo.score }}</p>
            </div>
            <div
                v-else-if="stateManager.state.right == RightPanelState.Default"
                class="right-inner default-panel"
            >
                <MyGridContainer
                    :columns="2"
                    :gap="10"
                >
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Settings"
                    >
                        设置
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.BPMList"
                    >
                        BPM编辑
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Meta"
                    >
                        谱面基本信息
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.JudgeLine"
                    >
                        判定线编辑
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.History"
                    >
                        历史记录
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Clipboard"
                    >
                        剪贴板管理
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.NoteFill"
                    >
                        填充曲线音符
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.EventFill"
                    >
                        生成曲线轨迹
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Calculator"
                    >
                        计算器
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.FastBind"
                    >
                        快速绑线
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Error"
                    >
                        谱面纠错
                    </MyButton>
                    <MyButton
                        type="primary"
                        @click="stateManager.state.right = RightPanelState.Shader"
                    >
                        shader编辑
                    </MyButton>
                </MyGridContainer>
                <MyInput
                    v-model="judgeLineFilter"
                    class="judge-line-filter-input"
                    placeholder="筛选判定线"
                    clearable
                />
                <MyGridContainer
                    :columns="5"
                    :gap="5"
                >
                    <MyButton
                        v-for="judgeLine in filteredJudgeLines"
                        :key="judgeLine.judgeLineNumber"
                        :type="(['primary', 'warning', 'danger', 'success', 'info'] as const)[Math.floor((judgeLine.judgeLineNumber) / 10) % 5]"
                        :plain="judgeLine.judgeLineNumber != stateManager.state.currentJudgeLineNumber"
                        flex
                        @click="stateManager.state.currentJudgeLineNumber = judgeLine.judgeLineNumber"
                    >
                        {{ judgeLine.judgeLineNumber }}
                    </MyButton>
                    <MyButton
                        type="success"
                        @click="globalEventEmitter.emit('ADD_JUDGE_LINE')"
                    >
                        +
                    </MyButton>
                </MyGridContainer>
            </div>
            <template v-else>
                <MyBackHeader
                    class="title-right"
                    @back="stateManager.state.right = RightPanelState.Default"
                />
                <BPMListPanel
                    v-if="stateManager.state.right === RightPanelState.BPMList"
                    title-teleport=".title-right"
                />
                <ChartMetaPanel
                    v-else-if="stateManager.state.right === RightPanelState.Meta"
                    title-teleport=".title-right"
                />
                <JudgeLinePanel
                    v-else-if="stateManager.state.right === RightPanelState.JudgeLine"
                    title-teleport=".title-right"
                />
                <SettingsPanel
                    v-else-if="stateManager.state.right === RightPanelState.Settings"
                    title-teleport=".title-right"
                />
                <HistoryPanel
                    v-else-if="stateManager.state.right === RightPanelState.History"
                    title-teleport=".title-right"
                />
                <ClipboardPanel
                    v-else-if="stateManager.state.right === RightPanelState.Clipboard"
                    title-teleport=".title-right"
                />
                <CalculatorPanel
                    v-else-if="stateManager.state.right === RightPanelState.Calculator"
                    title-teleport=".title-right"
                />
                <NoteFillPanel
                    v-else-if="stateManager.state.right === RightPanelState.NoteFill"
                    title-teleport=".title-right"
                />
                <EventFillPanel
                    v-else-if="stateManager.state.right === RightPanelState.EventFill"
                    title-teleport=".title-right"
                />
                <FastBindPanel
                    v-else-if="stateManager.state.right === RightPanelState.FastBind"
                    title-teleport=".title-right"
                />
                <ErrorPanel
                    v-else-if="stateManager.state.right === RightPanelState.Error"
                    title-teleport=".title-right"
                />
                <ShaderPanel
                    v-else-if="stateManager.state.right === RightPanelState.Shader"
                    title-teleport=".title-right"
                />
            </template>
        </ElAside>
        <ElFooter id="footer">
            <div class="footer-left">
                <MyLink href="https://github.com/Chengxuxiaoyuan-2573/Phiedit-2573">
                    Phiedit 2573
                </MyLink>
                Made By
                <MyLink href="https://space.bilibili.com/522248560">
                    @程序小袁_2573
                </MyLink>
            </div>
            <div class="footer-right">
                {{ tip }}
            </div>
        </ElFooter>
    </ElContainer>
</template>

<script setup lang="ts">
import { ElAside, ElScrollbar, ElContainer, ElHeader, ElIcon, ElMain, ElSlider, ElFooter, ElRadioButton, ElRadioGroup, ElProgress } from "element-plus";
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clamp, isNumber, mean } from "lodash";

import MediaUtils from "@/tools/mediaUtils";
import KeyboardUtils from "@/tools/keyboardUtils";
import { catchErrorByMessage, confirm, createCatchErrorByMessage } from "@/tools/catchError";
import MathUtils, { SEC_TO_MS } from "@/tools/mathUtils";
import { ArrayedObject, checkAndSort, unique } from "@/tools/algorithm";

import { isNumberEvent, isColorEvent, isTextEvent } from "@/models/event";
import { isNoteLike, NoteType } from "@/models/note";
import { IJudgeLine, JudgeLineExtendedOptions } from "@/models/judgeLine";

import MyButton from "@/myElements/MyButton.vue";
import MySelect from "@/myElements/MySelect.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyBackHeader from "@/myElements/MyBackHeader.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
import MyImage from "@/myElements/MyImage.vue";
import MyQuestionMark from "@/myElements/MyQuestionMark.vue";
import MyLink from "@/myElements/MyLink.vue";
import MyInput from "@/myElements/MyInput.vue";
import MyDialog from "@/myElements/MyDialog.vue";

import BPMListPanel from "@/panels/BPMListPanel.vue";
import ChartMetaPanel from "@/panels/ChartMetaPanel.vue";
import JudgeLinePanel from "@/panels/JudgeLinePanel.vue";
import NoteEditPanel from "@/panels/NoteEditPanel.vue";
import NumberEventEditPanel from "@/panels/NumberEventEditPanel.vue";
import MutipleEditPanel from "@/panels/MutipleEditPanel.vue";
import SettingsPanel from "@/panels/SettingsPanel.vue";
import HistoryPanel from "@/panels/HistoryPanel.vue";
import ClipboardPanel from "@/panels/ClipboardPanel.vue";
import CalculatorPanel from "@/panels/CalculatorPanel.vue";
import NoteFillPanel from "@/panels/NoteFillPanel.vue";
import EventFillPanel from "@/panels/EventFillPanel.vue";
import FastBindPanel from "@/panels/FastBindPanel.vue";
import ColorEventEditPanel from "@/panels/ColorEventEditPanel.vue";
import TextEventEditPanel from "@/panels/TextEventEditPanel.vue";
import ErrorPanel from "@/panels/ErrorPanel.vue";
import ShaderPanel from "@/panels/ShaderPanel.vue";

import globalEventEmitter, { VideoRenderingProgress } from "@/eventEmitter";
import store, { managersMap } from "@/store";
import { RightPanelState } from "@/managers/renderer/state";
import getKeyHandler from "@/keyHandlers";
import CalibrationManager, { calibrationState } from "@/managers/renderer/calibration";
import { CALIBRATION_CHART_ID } from "@/data/calibrationOnsets";

const loadStart = inject("loadStart", () => {
    throw new Error("loadStart is not defined");
});

const loadEnd = inject("loadEnd", () => {
    throw new Error("loadEnd is not defined");
});

const showUpdateDialog = inject("showUpdateDialog", () => {
    throw new Error("showUpdateDialog is not defined");
});

store.route = useRoute();
const router = useRouter();
const version = await window.electronAPI.getVersion();

// 先获取全局的 chartPackageLoader 和 resourcePackageLoader 管理器
const chartPackageLoader = store.useGlobalManager("chartPackageLoader");
const resourcePackageLoader = store.useGlobalManager("resourcePackageLoader");

loadStart();

const chartId = store.getChartId();

// 校准模式：由首页“延迟检测”入口以 ?calibration=1 打开，用 autoplay 做纯视觉引导，
// 误差判定只依赖 Python 提取的 onset 数据（谱面本身不参与计算）。
const isCalibration = ref(store.route.query.calibration === "1");
const calibrationManager = new CalibrationManager();

// 使用 chartPackageLoader 加载 chartPackage
const readResult = await window.electronAPI.loadChart(chartId);
store.chartPackageRef.value = await chartPackageLoader.load(readResult, version);

// 使用 resourcePackageLoader 加载 resourcePackage
const respackArrayBuffer = await window.electronAPI.loadResourcePackage();
store.resourcePackageRef.value = await resourcePackageLoader.load(respackArrayBuffer);

loadEnd();

// 创建并设置非全局的 managers
new ArrayedObject(managersMap).forEach((managerName, managerConstructor) => {
    store.setManager(managerName, new managerConstructor());
});

const { audioRef, canvasRef, resourcePackageRef, isRenderingVideo } = store;

const { chart, textures } = store.chartPackageRef.value;

const stateManager = store.useManager("stateManager");
const settingsManager = store.useManager("settingsManager");
const selectionManager = store.useManager("selectionManager");
const mouseManager = store.useManager("mouseManager");
const coordinateManager = store.useManager("coordinateManager");
const judgeManager = store.useManager("judgeManager");

// ---- 延迟校准模式 ----
const CALIBRATION_IGNORED_KEYS = ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"];

// dev 后门：校准检测界面里连按 5 次 Alt（超时窗口内）进入该隐藏谱面的“普通编辑”模式，方便手动调整谱面
const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_ALT_TRIGGER_COUNT = 5;
const DEV_ALT_RESET_MS = 800;
let altPressCount = 0;
let altResetTimer: number | undefined;
function tryDevAltCombo() {
    if (!IS_DEV) {
        return false;
    }
    altPressCount++;
    if (altResetTimer !== undefined) window.clearTimeout(altResetTimer);

    // 连按需在超时窗口内完成，超时则重新计数
    altResetTimer = window.setTimeout(() => {
        altPressCount = 0;
    }, DEV_ALT_RESET_MS);
    if (altPressCount >= DEV_ALT_TRIGGER_COUNT) {
        altPressCount = 0;
        if (altResetTimer !== undefined) window.clearTimeout(altResetTimer);

        // 用整页重载切到普通编辑模式：同路由仅 query 变化不会重挂组件，
        // 而 store 是单例、旧 EditorPage 的 onBeforeUnmount 会清空 store，
        // 因此这里必须整页重载，让编辑模式从干净状态重新加载谱面。
        window.location.hash = `#/editor?chartId=${encodeURIComponent(CALIBRATION_CHART_ID)}`;
        window.location.reload();
        return true;
    }
    return false;
}

/** 校准结果确认界面：歌曲放完或按 ESC 后进入，把「记录 / 放弃」的决定权交给用户 */
const calibrationResult = ref<{
    offsetMs: number | null;
    validCount: number;
    pressCount: number;
} | null>(null);

/** 进入结果确认界面：停止采样与播放，冻结当前统计 */
function enterCalibrationResult() {
    if (calibrationResult.value) return;
    calibrationManager.onExit();
    audioRef.value?.pause();
    calibrationResult.value = {
        offsetMs: calibrationState.offsetMs,
        validCount: calibrationState.validCount,
        pressCount: calibrationState.pressCount,
    };
}

/** 音频播放结束时同样进入结果界面，而不是静静停住 */
function onCalibrationAudioEnded() {
    enterCalibrationResult();
}

/** ✓：记录这次测出的 offset（写入全局设置）后回首页；无有效样本时不动作 */
function confirmCalibration() {
    if (!calibrationResult.value || calibrationResult.value.offsetMs === null) return;
    calibrationManager.saveIfEnough();
    router.push("/");
}

/** ✕：放弃这次测出的 offset，不写入设置，直接回首页 */
function discardCalibration() {
    router.push("/");
}

function calibrationKeyDown(e: KeyboardEvent) {
    // 结果确认界面：不再采样，也不响应 ESC，是否记录由 ✕ / ✓ 决定
    if (calibrationResult.value) return;

    if (e.key === "Escape") {
        enterCalibrationResult();
        return;
    }

    // dev 后门：连按 5 次 Alt 进入编辑模式（不计入校准采样）
    if (e.key === "Alt" && tryDevAltCombo()) {
        return;
    }

    if (CALIBRATION_IGNORED_KEYS.includes(e.key)) return;

    // 音频元素理论上已挂载（模板里已移出 header），此处仍做防御性判空
    const audio = audioRef.value;
    if (!audio) return;

    // 若音乐尚未播放（如自动播放被拦截），用这次按键启动音乐，这一次不计入样本
    if (audio.paused) {
        audio.play().catch(() => {
            // 忽略：仍处于暂停，用户可继续按键重试
        });
        return;
    }
    calibrationManager.onKeyPress();
}

if (isCalibration.value) {
    // autoplay=true → 渲染循环发 AUTOPLAY：音符自动击打，纯视觉、不做判定
    // isPreviewing=true → 渲染循环走 RENDER_CHART：游戏视图（编辑 UI 由模板 v-if 隐藏）
    stateManager.state.autoplay = true;
    stateManager.state.isPreviewing = true;
    calibrationManager.onStart();
    onMounted(() => {
        window.addEventListener("keydown", calibrationKeyDown);

        // 等音频真正 canplay 后再播，避免刚挂载就 play() 触发 autoplay 拦截/未加载。
        // 若被拦截，calibrationKeyDown 里检测到 paused 会在用户首次按键时兜底启动。
        const audio = store.useAudio();
        const tryPlay = () => {
            if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
                return;
            }
            audio.play().catch((error) => {
                console.warn("校准模式自动播放被拦截，等待用户按键启动：", error);
            });
        };

        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            tryPlay();
        }
        else {
            audio.addEventListener("canplay", tryPlay, { once: true });
        }

        // 歌曲放完 → 进入结果确认界面（否则画面会静静停住、像是卡死）
        audio.addEventListener("ended", onCalibrationAudioEnded);
    });
    onBeforeUnmount(() => {
        window.removeEventListener("keydown", calibrationKeyDown);
        try {
            store.useAudio().removeEventListener("ended", onCalibrationAudioEnded);
        }
        catch {
            // 音频已不可用，忽略
        }
        calibrationManager.onExit();
    });
}

const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);

/** tip 完全来自 tips.txt（打包版放在 AppData 里；文件缺失或为空时显示空白） */
const allTips = ref<string[]>([]);
const getRandomTip = () => allTips.value.length === 0 ? "" : allTips.value[Math.floor(Math.random() * allTips.value.length)];
const tip = ref(getRandomTip());
const mouseIsInCanvas = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);
const judgeLineFilter = ref("");

const judgeLineList: Required<(IJudgeLine & JudgeLineExtendedOptions)[]> = reactive([]);

onMounted(() => {
    // 读取 tips.txt 中的 tip，存在时以文件内容为准
    window.electronAPI.readTips().then(({ tips, created }) => {
        if (created) {
            // 用户删除了 tips.txt：先显示俏皮提示，之后用自动重建的默认 tips 轮换
            allTips.value = tips;
            tip.value = "耶你还想删掉我？";
        }
        else if (tips.length > 0) {
            allTips.value = tips;
            tip.value = getRandomTip();
        }
    });
    globalEventEmitter.on("JUDGE_LINE_COUNT_CHANGED", updateJudgeLineList);
});
onBeforeUnmount(() => {
    globalEventEmitter.off("JUDGE_LINE_COUNT_CHANGED", updateJudgeLineList);
});

function updateJudgeLineList() {
    judgeLineList.length = 0;
    judgeLineList.push(...chart.judgeLineList);
}
updateJudgeLineList();

const filteredJudgeLines = computed(() => {
    // 如果过滤条件为空，就直接返回所有的判定线
    if (judgeLineFilter.value === "") {
        return [...judgeLineList];
    }

    const result = judgeLineList.filter(judgeLine => {
        return judgeLine.judgeLineNumber
            .toString()
            .toLowerCase()
            .includes(
                judgeLineFilter.value
                    .toLowerCase()
            ) ||
            judgeLine.Name
                .toLowerCase()
                .includes(
                    judgeLineFilter.value
                        .toLowerCase()
                );
    });
    const parseRanges = (input: string) => {
        /** 分隔符可以是空格、英文逗号、英文分号、中文逗号、中文顿号、中文分号、英文斜杠、英文反斜杠，英文竖线 */
        const parts = input.split(/[\s,;，、；/\\|]+/);
        const result: ({ start: number, end: number } | number)[] = [];

        for (const part of parts) {
            const rangeMatch = part.match(/^(\d+)(?:-|~)(\d+)$/);
            if (rangeMatch) {
                result.push({
                    start: parseInt(rangeMatch[1]),
                    end: parseInt(rangeMatch[2])
                });
            }
            else if (/^\d+$/.test(part)) {
                result.push(parseInt(part));
            }
        }

        return result;
    };

    const ranges = parseRanges(judgeLineFilter.value);

    // 处理范围匹配
    if (ranges.length > 0) {
        result.push(...judgeLineList.filter(judgeLine =>
            ranges.some(range => {
                if (isNumber(range)) {
                    return range === judgeLine.judgeLineNumber;
                }
                else {
                    return judgeLine.judgeLineNumber >= range.start && judgeLine.judgeLineNumber <= range.end;
                }
            })
        ));
    }

    // 根据父线筛选
    const fatherMatch = judgeLineFilter.value.match(/^(father|parent|dad|daddy):(\d+)/);
    if (fatherMatch) {
        result.push(...judgeLineList.filter(judgeLine => judgeLine.father === +fatherMatch[2]));
    }

    // 根据绑定的 UI 筛选
    const uiMatch = judgeLineFilter.value.match(/^ui(:(.*))?/);
    if (uiMatch) {
        result.push(...judgeLineList.filter(judgeLine => {
            if (uiMatch[2]) {
                return judgeLine.attachUI && judgeLine.attachUI.includes(uiMatch[2]);
            }
            else {
                return judgeLine.attachUI && judgeLine.attachUI !== "none";
            }
        }));
    }

    // 根据贴图筛选
    const textureMatch = judgeLineFilter.value.match(/^(texture|picture|image)(:(.*))?/);
    if (textureMatch) {
        result.push(...judgeLineList.filter(judgeLine => {
            if (textureMatch[3]) {
                return judgeLine.Texture.includes(textureMatch[3]);
            }
            else {
                return Object.keys(textures).includes(judgeLine.Texture);
            }
        }));
    }

    // 根据是否有文字事件筛选
    const textMatch = judgeLineFilter.value.match(/^text/);
    if (textMatch) {
        result.push(...judgeLineList.filter(judgeLine => {
            return judgeLine.extended.textEvents && judgeLine.extended.textEvents.length > 0;
        }));
    }

    // 根据是否有颜色事件筛选
    const colorMatch = judgeLineFilter.value.match(/^color/);
    if (colorMatch) {
        result.push(...judgeLineList.filter(judgeLine => {
            return judgeLine.extended.colorEvents && judgeLine.extended.colorEvents.length > 0;
        }));
    }

    // 根据是否有音符筛选
    const noteMatch = judgeLineFilter.value.match(/^note/);
    if (noteMatch) {
        result.push(...judgeLineList.filter(judgeLine => {
            return judgeLine.notes.length > 0;
        }));
    }
    checkAndSort(result, (a, b) => a.judgeLineNumber - b.judgeLineNumber);
    unique(result);
    return result;
});

const FPS_THRESHOLDS = {
    HIGH: 60,
    MEDIUM: 40,
    LOW: 20
};
const MOUSE_LEFT = 0;
const MOUSE_RIGHT = 2;

/** 每条 tip 显示 10 秒 */
const TIP_SHOW_TIME = 10000;

/** FPS 的颜色 */
const fpsColor = computed(() => {
    if (fps.value >= FPS_THRESHOLDS.HIGH) {
        return "#00dd00";
    }
    else if (fps.value >= FPS_THRESHOLDS.MEDIUM) {
        return "#99aa00";
    }
    else if (fps.value >= FPS_THRESHOLDS.LOW) {
        return "#ff6600";
    }
    else {
        return "#ff0000";
    }
});

const speedOptions = [
    {
        label: "1.0x",
        value: 1,
        text: "1.0x",
    },
    {
        label: "0.5x",
        value: 0.5,
        text: "0.5x",
    },
    {
        label: "0.25x",
        value: 0.25,
        text: "0.25x",
    },
    {
        label: "0.125x",
        value: 0.125,
        text: "0.125x",
    },
    {
        label: "0.0x",
        value: 0,
        text: "0.0x",
    },
    {
        label: "1.5x",
        value: 1.5,
        text: "1.5x",
    },
    {
        label: "2.0x",
        value: 2,
        text: "2.0x",
    },
    {
        label: "3.0x",
        value: 3,
        text: "3.0x",
    },
] as const;

/** 视频渲染的进度 */
const videoRenderingProgress = reactive({
    message: "正在加载……",
    percent: 0,
    done: false,
    remainingTime: 0
});

const renderVideoTime = ref(0);

let windowIsFocused = true;
let cachedRect: DOMRect;
let canvasIsRendering = true;
let renderStartTime: number;

function playChart() {
    stateManager.state.autoplay = false;
    stateManager.state.isPreviewing = true;
    store.playAudio();
}

function exitPlayChart() {
    stateManager.state.autoplay = true;
    stateManager.state.isPreviewing = false;
    store.pauseAudio();
}

/** 检查更新 */
function checkForUpdates() {
    showUpdateDialog();
    window.electronAPI.checkForUpdates();
}

/** 打开谱面文件夹 */
function openChartFolder() {
    window.electronAPI.openChartFolder(store.getChartId());
}

/** 打开 tips.txt 所在的文件夹 */
function openTipsFolder() {
    window.electronAPI.openTipsFolder();
}

/** 渲染为视频 */
async function renderVideo() {
    const fps = settingsManager._settings.renderFPS;
    const cachedSettings = { ...settingsManager._settings };

    let videoRenderingTotalTime = 0;
    let videoRenderingCount = 0;

    // 用于更新进度和预测剩余时间
    const videoProgressHandler = (progress: VideoRenderingProgress) => {
        if (!isRenderingVideo.value) {
            window.electronAPI.cancelVideoRendering();
            throw new Error("已取消渲染");
        }

        videoRenderingTotalTime += progress.time;
        videoRenderingCount++;

        const percent = progress.processed / progress.total * 100;
        const avgTimePerFrame = videoRenderingTotalTime / videoRenderingCount;
        const remainingTime = avgTimePerFrame * (progress.total - progress.processed);

        videoRenderingProgress.percent = percent;
        videoRenderingProgress.message = progress.status;
        videoRenderingProgress.remainingTime = remainingTime;
    };

    globalEventEmitter.onIpc("VIDEO_RENDERING_PROGRESS", videoProgressHandler);

    try {
        pauseRenderLoop();
        renderStartTime = Date.now();
        const chartName = store.chartPackageRef.value?.chart.META.name || "untitled";
        const filePath = await window.electronAPI.showSaveVideoDialog(chartName);
        if (!filePath) {
            throw new Error("未选择导出视频的路径");
        }

        // 分批处理帧，避免UI线程阻塞
        const canvas = store.useCanvas();

        // 递归处理函数
        const processFrames = async () => {
            const duration = settingsManager._settings.renderTimeEnd - settingsManager._settings.renderTimeStart;
            const totalFrames = Math.ceil(duration * fps);
            for (let frame = 0; frame < totalFrames; frame++) {
                if (!isRenderingVideo.value) {
                    return;
                }

                const frameStartTime = Date.now();

                const time = frame / fps + settingsManager._settings.renderTimeStart;
                store.setTime(time);
                globalEventEmitter.emit("AUTOPLAY");
                globalEventEmitter.emit("RENDER_FRAME");
                globalEventEmitter.emit("RENDER_CHART");

                const dataUrl = canvas.toDataURL("image/jpeg");
                await window.electronAPI.sendFrameData(dataUrl);

                const frameEndTime = Date.now();
                const frameProcessingTime = frameEndTime - frameStartTime;

                globalEventEmitter.emit("VIDEO_RENDERING_PROGRESS", {
                    status: `正在生成视频画面（${frame + 1} / ${totalFrames}）……`,
                    processed: frame + 1,
                    total: totalFrames,
                    time: frameProcessingTime / SEC_TO_MS,
                    code: "RENDERING_FRAMES"
                });
            }
            return;
        };

        const TIMEOUT = 30;

        const finish = createCatchErrorByMessage(async () => {
            videoRenderingProgress.done = true;
            await Promise.race([
                window.electronAPI.finishVideoRendering(filePath),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("视频渲染完成超时")), TIMEOUT * SEC_TO_MS)
                )
            ]);
            renderVideoTime.value = Date.now() - renderStartTime;
        }, undefined, false);

        // 开始处理

        // 关闭一些选项，这些选项在渲染谱面到视频中时不需要使用
        settingsManager.setSettings({
            showJudgeLineNumber: false,
            markCurrentJudgeLine: false,
        });

        // 开始渲染
        isRenderingVideo.value = true;

        await window.electronAPI.startVideoRendering({
            chartId,
            fps,
            outputPath: filePath,
            startTime: settingsManager._settings.renderTimeStart,
            endTime: settingsManager._settings.renderTimeEnd,
        });

        videoRenderingCount = 0;
        videoRenderingTotalTime = 0;

        await window.electronAPI.addHitSounds(chart
            .getAllNotes()
            .filter(note => !note.isFake)
            .map(note => ({
                type: note.hitSoundType,
                time: note.cachedStartSeconds + chart.META.offset / SEC_TO_MS
            })));

        videoRenderingCount = 0;
        videoRenderingTotalTime = 0;

        await processFrames();

        await finish();
    }
    finally {
        // 结束渲染
        isRenderingVideo.value = false;

        // 设置回原来的设置
        settingsManager.setSettings(cachedSettings);

        // 恢复渲染循环
        resumeRenderLoop();

        // 移除监听器
        globalEventEmitter.off("VIDEO_RENDERING_PROGRESS", videoProgressHandler);
    }
}

function onSettingsLoaded() {
    const audio = store.useAudio();
    audio.addEventListener("canplay", () => {
        settingsManager.settings.renderTimeStart = 0;
        settingsManager.settings.renderTimeEnd = audio.duration;
        settingsManager.saveSettings();
    }, {
        once: true
    });
}

onMounted(() => {
    globalEventEmitter.on("SETTINGS_LOADED", onSettingsLoaded);
});

onBeforeUnmount(() => {
    globalEventEmitter.off("SETTINGS_LOADED", onSettingsLoaded);
    settingsManager.saveSettings();
});

/** 取消渲染 */
async function cancelVideoRendering() {
    store.isRenderingVideo.value = false;
    await window.electronAPI.cancelVideoRendering();
}

/** 导出谱面 */
async function exportChart() {
    const chartName = store.chartPackageRef.value?.chart.META.name || "untitled";

    // 使用预加载的 API 替代直接导入
    const filePath = await window.electronAPI.showSaveDialog(chartName);
    await globalEventEmitter.emitAsync("EXPORT", filePath);
}

/** 删除谱面 */
async function deleteChart() {
    window.electronAPI.deleteChart(store.getChartId());
    router.push("/");
}

/** 添加判定线贴图 */
async function addTextures() {
    const texturePaths = await window.electronAPI.showOpenImageDialog(true);
    if (!texturePaths) {
        throw new Error("操作已取消");
    }

    const textureArrayBuffers = await window.electronAPI.addTextures(store.getChartId(), texturePaths);
    const textures: Record<string, HTMLImageElement> = {};
    for (const [name, arrayBuffer] of Object.entries(textureArrayBuffers)) {
        const image = await MediaUtils.createImage(arrayBuffer);
        textures[name] = image;
    }

    const chartPackage = store.useChartPackage();
    chartPackage.textures = { ...chartPackage.textures, ...textures };
}

function canvasMouseDown(e: MouseEvent) {
    const canvas = store.useCanvas();
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = coordinateManager.calculatePositionOfObjectFitContainCanvas(e, cachedRect);
    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
        return;
    }

    switch (e.button) {
        case MOUSE_LEFT:
            globalEventEmitter.emit("MOUSE_LEFT_CLICK", x, y, options);
            return;
        case MOUSE_RIGHT:
            globalEventEmitter.emit("MOUSE_RIGHT_CLICK", x, y, options);
            return;
    }
}

function canvasMouseMove(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = coordinateManager.calculatePositionOfObjectFitContainCanvas(e, cachedRect);
    mouseX.value = coordinateManager.convertXToChart(mouseManager.mouseX);
    mouseY.value = coordinateManager.convertYToChart(mouseManager.mouseY);
    globalEventEmitter.emit("MOUSE_MOVE", x, y, options);
}

function canvasMouseUp(e: MouseEvent) {
    const options = KeyboardUtils.createKeyOptions(e);
    const { x, y } = coordinateManager.calculatePositionOfObjectFitContainCanvas(e, cachedRect);
    globalEventEmitter.emit("MOUSE_UP", x, y, options);
}

function canvasMouseEnter() {
    mouseIsInCanvas.value = true;
    globalEventEmitter.emit("MOUSE_ENTER");
}

function canvasMouseLeave() {
    mouseIsInCanvas.value = false;
    globalEventEmitter.emit("MOUSE_LEAVE");
}

function windowOnWheel(e: WheelEvent) {
    if (e.ctrlKey) {
        e.preventDefault();
        globalEventEmitter.emit("CTRL_WHEEL", e.deltaY);
    }
    else {
        globalEventEmitter.emit("WHEEL", e.deltaY);
    }
}

function canvasOnResize() {
    const canvas = store.useCanvas();
    cachedRect = canvas.getBoundingClientRect();
}

async function windowOnKeyDown(e: KeyboardEvent) {
    if (e.repeat) {
        return;
    }

    // 校准模式下禁用全部编辑器快捷键（T/U 预览、I 切换预览、QWER 改类型、A/D 切判定线、
    // Del 删除、方向键移动、Ctrl/Meta 组合等），按键只交给 calibrationKeyDown 做延迟采样
    if (isCalibration.value) {
        return;
    }

    const handler = getKeyHandler(e, "keydown");
    handler();
}

async function windowOnKeyUp(e: KeyboardEvent) {
    // 校准模式下同样屏蔽，避免 PREVIEW 等 keyup 状态被解除触发
    if (isCalibration.value) {
        return;
    }

    const handler = getKeyHandler(e, "keyup");
    handler();
}

function documentOnContextmenu(e: Event) {
    e.preventDefault();
}

function windowOnBlur() {
    const audio = store.useAudio();
    audio.pause();
    windowIsFocused = false;
}

function windowOnFocus() {
    windowIsFocused = true;
}

function audioOnTimeUpdate() {
    const audio = store.useAudio();
    time.value = audio.currentTime;
}

function audioOnPause() {
    audioIsPlaying.value = false;
}

function audioOnPlay() {
    audioIsPlaying.value = true;
}

function pauseRenderLoop() {
    canvasIsRendering = false;
}

function resumeRenderLoop() {
    canvasIsRendering = true;
    requestAnimationFrame(renderLoop);
}

/** 上一次渲染的时间 */
let renderTime = performance.now();

/** 显示 FPS 的间隔，以帧为单位 */
const showFpsFrequency = 20;

/** 缓存最近的 FPS 数据 */
const fpsList: number[] = [];
function renderLoop() {
    if (canvasIsRendering) {
        const audio = store.useAudio();
        if (windowIsFocused) {
            if (settingsManager._settings.autoHighlight) {
                chart.highlightNotes();
            }

            catchErrorByMessage(() => {
                globalEventEmitter.emit("RENDER_FRAME");

                if (stateManager._state.autoplay) {
                    globalEventEmitter.emit("AUTOPLAY");
                }

                if (stateManager.state.isPreviewing) {
                    globalEventEmitter.emit("RENDER_CHART");
                }
                else {
                    globalEventEmitter.emit("RENDER_EDITOR");
                }
            }, "渲染画面", false);

            const now = performance.now();
            const delta = now - renderTime;

            if (delta > 0) {
                const currentFPS = SEC_TO_MS / delta;
                fpsList.push(currentFPS);
                if (fpsList.length >= showFpsFrequency) {
                    fps.value = mean(fpsList);
                    fpsList.length = 0;
                }
            }
            else {
                fps.value = 0;
            }
            renderTime = now;
            audio.volume = settingsManager._settings.musicVolume;
        }

        if (settingsManager._settings.unlimitFps) {
            setTimeout(renderLoop);
        }
        else {
            requestAnimationFrame(renderLoop);
        }
    }
}
onMounted(() => {
    const canvas = store.useCanvas();
    const audio = store.useAudio();
    cachedRect = canvas.getBoundingClientRect();

    canvas.addEventListener("mousedown", canvasMouseDown);
    canvas.addEventListener("mousemove", canvasMouseMove);
    canvas.addEventListener("mouseup", canvasMouseUp);
    canvas.addEventListener("mouseenter", canvasMouseEnter);
    canvas.addEventListener("mouseleave", canvasMouseLeave);
    const resizeObserver = new ResizeObserver(canvasOnResize);
    resizeObserver.observe(canvas);
    window.addEventListener("wheel", windowOnWheel);
    window.addEventListener("keydown", windowOnKeyDown);
    window.addEventListener("keyup", windowOnKeyUp);
    const removeWindowFocusListener = window.electronAPI.onWindowFocus(windowOnFocus);
    const removeWindowBlurListener = window.electronAPI.onWindowBlur(windowOnBlur);
    document.oncontextmenu = documentOnContextmenu;
    audio.addEventListener("timeupdate", audioOnTimeUpdate);
    audio.addEventListener("pause", audioOnPause);
    audio.addEventListener("play", audioOnPlay);

    const tipInterval = setInterval(() => {
        tip.value = getRandomTip();
    }, TIP_SHOW_TIME);

    renderLoop();

    onBeforeUnmount(() => {
        // 停止播放音乐
        audio.pause();

        // 取消视频导出
        cancelVideoRendering();

        // 清除事件监听器
        canvas.removeEventListener("mousedown", canvasMouseDown);
        canvas.removeEventListener("mousemove", canvasMouseMove);
        canvas.removeEventListener("mouseup", canvasMouseUp);
        canvas.removeEventListener("mouseenter", canvasMouseEnter);
        canvas.removeEventListener("mouseleave", canvasMouseLeave);
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        window.removeEventListener("wheel", windowOnWheel);
        window.removeEventListener("keydown", windowOnKeyDown);
        removeWindowFocusListener();
        removeWindowBlurListener();
        audio.removeEventListener("timeupdate", audioOnTimeUpdate);
        audio.removeEventListener("pause", audioOnPause);
        audio.removeEventListener("play", audioOnPlay);

        // 停止渲染循环
        pauseRenderLoop();

        // 移除 canvas
        canvas.remove();

        // 清理 store
        store.chartPackageRef.value = null;
        store.resourcePackageRef.value = null;
        store.canvasRef.value = null;
        store.audioRef.value = null;
        store.route = null;

        // 销毁所有非全局的 managers
        for (const key in store.managers) {
            store.managers[key as keyof typeof store.managers] = null;
        }

        // 销毁发布订阅的事件监听器
        globalEventEmitter.destroy();

        // 移除 tip 的计时器
        clearInterval(tipInterval);
    });
});
</script>
<style>
.flex-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.el-button+.el-button {
    margin-left: 0;
    margin-right: 0;
}

.el-container {
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    grid-template-rows: 120px 1fr 30px;
    grid-template-areas:
        "header header header"
        "left main right"
        "footer footer footer";
}

#header {
    --el-header-padding: 0 10px;
    grid-area: header;
    width: 100%;
    height: 100%;
}

#header-inner {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1.5fr repeat(3, 1fr);
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
        "audio-player audio-player audio-player info"
        "note-type-select speed-select horizontal-input vertical-input"
        "note-type-select hint-text event-layer-select offset-input";
    gap: 10px;
}

.audio-player {
    grid-area: audio-player;
    display: flex;
    align-items: center;
    gap: 20px;
}

.info {
    grid-area: info;
    display: flex;
    justify-content: space-between;
}

.event-layer-hint-text {
    grid-area: hint-text;
    display: flex;
    align-items: center;
}

.note-type-select {
    grid-area: note-type-select;
}

.speed-select {
    grid-area: speed-select;
}

.horizontal-input {
    grid-area: horizontal-input;
}

.vertical-input {
    grid-area: vertical-input;
}

.event-layer-select {
    grid-area: event-layer-select;
}

.offset-input {
    grid-area: offset-input;
}

.none {
    grid-area: none;
}

/* .note-type-select .el-radio-button {
    border-radius: var(--el-border-radius-base) !important;
    overflow: hidden;
    --el-border: 100px solid black;
} */

.note-type-select .el-radio-button p {
    text-align: center;
}

.play-icon {
    color: black;
    transition: 0.2s;
    cursor: pointer;
}

.play-icon:hover {
    color: var(--el-color-primary);
}

.play-icon:active {
    color: var(--el-color-primary-dark);
}

#main {
    grid-area: main;
    --el-main-padding: 0;
    position: relative;
    overflow: hidden;
}

.el-aside {
    padding: 10px;
}

#left {
    grid-area: left;
}

#right {
    grid-area: right;
    position: relative;
}

.back-header {
    position: sticky;
    background-color: white;
    z-index: 10;
    left: 0;
    top: 0;
}

.el-header>.el-row {
    flex-grow: 1;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 10px;
}

.left-inner,
.right-inner {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    width: 100%;
}

.default-panel {
    min-height: 100%;
}

.delete-chart-button {
    justify-self: flex-end;
}

.canvas {
    object-fit: contain;
    display: block;
    width: 100%;
    height: 100%;
}

.accompaniment-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
}

.accompaniment-countdown {
    font-size: 160px;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
    animation: accompaniment-pop 1s ease;
}

.accompaniment-listening {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    background: rgba(0, 0, 0, 0.45);
    padding: 10px 22px;
    border-radius: 999px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.accompaniment-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #67c23a;
    box-shadow: 0 0 12px #67c23a;
    animation: accompaniment-blink 1s infinite;
}

@keyframes accompaniment-pop {
    from {
        transform: scale(1.6);
        opacity: 0.2;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes accompaniment-blink {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.3;
    }
}

/* ---- 校准结果确认界面 ---- */

/* 校准过程中的顶部信息块：进入结果确认界面时渐隐，而不是硬切消失 */
.calibration-hud {
    transition: opacity 0.5s ease;
}

.calibration-hud.is-fading-out {
    opacity: 0;
}

.calibration-result {
    position: fixed;
    inset: 0;
    z-index: 2500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(48px, 8vh, 104px);
    box-sizing: border-box;
    padding: 12vh 6vw;
    overflow: hidden;
}

/* 中间显示区域「慢慢变白」：白色幕布从透明渐入 */
.calibration-result::before {
    content: "";
    position: absolute;
    inset: 0;
    background: #ffffff;
    animation: calibration-fade-to-white 1.6s ease-out forwards;
}

.calibration-result > * {
    position: relative;
    animation: calibration-result-rise 0.55s ease-out 0.65s both;
}

/* 居中舞台：紫色彩条 + 压在其上的数字 */
.calibration-result-center {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 斜的紫色彩条，下移到数字的下半部分 */
.calibration-ribbon {
    position: relative;
    width: min(23vw, 196px);
    height: clamp(46px, 5.8vh, 72px);
    transform: translateY(clamp(12px, 1.4vw, 22px));
}

.calibration-ribbon-bar {
    position: absolute;
    inset: 0;
    border-radius: 4px;
    transform: skewX(-20deg);
    background: linear-gradient(100deg,
        rgba(167, 139, 250, 0.28) 0%,
        rgba(139, 92, 246, 0.5) 48%,
        rgba(196, 181, 253, 0.26) 100%);
}

/* 左右两条飘带：与彩条同角度倾斜，尺寸一致，只分居两端 */
.calibration-ribbon-tie {
    position: absolute;
    top: 0%;
    height: 100%;
    width: 11px;
    border-radius: 3px;
    transform: skewX(-20deg);
}

.calibration-ribbon-tie-left {
    left: 0;
    background: linear-gradient(180deg, #c4b5fd, #8b5cf6);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.6);
}

.calibration-ribbon-tie-right {
    right: 0;
    background: linear-gradient(180deg, #8b5cf6, #c4b5fd);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.6);
}

.calibration-result-value,
.calibration-result-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #17171a;
    line-height: 1;
}

.calibration-result-value {
    font-size: clamp(68px, 8vw, 104px);
    font-weight: 800;
    letter-spacing: -0.05em;
    font-variant-numeric: tabular-nums;
    transform: translateY(-20px);
}

.calibration-result-empty {
    font-size: clamp(30px, 3.6vw, 48px);
    font-weight: 700;
    color: rgba(23, 23, 26, 0.35);
}

.calibration-result-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(64px, 12vw, 156px);
}

.calibration-action {
    width: clamp(42px, 4.4vw, 56px);
    height: clamp(42px, 4.4vw, 56px);
    padding: 0;
    border: none;
    background: transparent;
    color: #17171a;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, color 0.15s ease;
}

.calibration-action svg {
    width: 100%;
    height: 100%;
    display: block;
}

.calibration-action:hover {
    transform: scale(1.1);
}

.calibration-action:active {
    transform: scale(0.94);
}

.calibration-action-discard:hover {
    color: #f56c6c;
}

.calibration-action-confirm:hover {
    color: #7c3aed;
}

.calibration-action-confirm:disabled {
    color: #c0c4cc;
    cursor: not-allowed;
}

.calibration-action-confirm:disabled:hover {
    transform: none;
    color: #c0c4cc;
}

@keyframes calibration-fade-to-white {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes calibration-result-rise {
    from {
        opacity: 0;
        transform: translateY(24px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.el-button-group,
.el-radio-group {
    display: flex;
    flex-wrap: nowrap;
}

#footer {
    grid-area: footer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
    height: 30px;
}

.footer-left,
.footer-right {
    white-space: nowrap;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 35vw;
}

.footer-right {
    max-width: 65vw;
}

.export-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
