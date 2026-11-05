<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <ElContainer>
        <ElHeader id="header">
            <ElScrollbar
                id="header-inner"
                @wheel.passive.stop
            >
                <div class="audio-player">
                    <audio
                        ref="audioRef"
                        :src="store.chartPackageRef.value?.musicSrc"
                    />
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
                        title="快捷键：Q"
                    >
                        <div class="note-type-button-wrapper">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                width="50"
                                height="15"
                                viewBox="0 0 100 30"
                                fill="none"
                            >
                                <path
                                    d="M10 10L90 10L90 20L10 20L10 10Z"
                                    stroke="rgba(23, 73, 255, 1)"
                                    stroke-width="1"
                                    fill="#00B3FF"
                                />
                            </svg>
                            <p>Tap</p>
                        </div>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-drag"
                        :value="NoteType.Drag"
                        title="快捷键：W"
                    >
                        <div class="note-type-button-wrapper">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                width="50"
                                height="15"
                                viewBox="0 0 100 30"
                                fill="none"
                            >
                                <path
                                    d="M10 10L90 10L90 20L10 20L10 10Z"
                                    stroke="rgba(23, 73, 255, 1)"
                                    stroke-width="1"
                                    fill="#FFBA30"
                                />
                            </svg>
                            <p>Drag</p>
                        </div>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-flick"
                        :value="NoteType.Flick"
                        title="快捷键：E"
                    >
                        <div class="note-type-button-wrapper">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                width="50"
                                height="15"
                                viewBox="0 0 100 30"
                                fill="none"
                            >
                                <path
                                    d="M10 10L90 10L90 20L10 20L10 10Z"
                                    stroke="rgba(23, 73, 255, 1)"
                                    stroke-width="1"
                                    fill="#FF8585"
                                />
                            </svg>
                            <p>Flick</p>
                        </div>
                    </ElRadioButton>
                    <ElRadioButton
                        class="note-type-option note-type-hold"
                        :value="NoteType.Hold"
                        title="快捷键：R"
                    >
                        <div class="note-type-button-wrapper">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                width="50"
                                height="15"
                                viewBox="0 0 100 30"
                                fill="none"
                            >
                                <path
                                    d="M10 1L90 1L90 29L10 29L10 1Z"
                                    stroke="rgba(23, 73, 255, 1)"
                                    stroke-width="1"
                                    fill="#54CCFF"
                                />
                            </svg>
                            <p>Hold</p>
                        </div>
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
                <div class="tools">
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="剪切（Ctrl+X）"
                        @click="globalEventEmitter.emit('CUT')"
                    >
                        <Scissor />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="复制（Ctrl+C）"
                        @click="globalEventEmitter.emit('COPY')"
                    >
                        <CopyDocument />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="粘贴（Ctrl+V）"
                        @click="globalEventEmitter.emit('PASTE')"
                    >
                        <DocumentCopy />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        color="#fe3400"
                        class="tool-icon"
                        title="删除（Delete）"
                        @click="globalEventEmitter.emit('DELETE')"
                    >
                        <Delete />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="撤销（Ctrl+Z）"
                        @click="globalEventEmitter.emit('UNDO')"
                    >
                        <RefreshLeft />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="重做（Ctrl+Y）"
                        @click="globalEventEmitter.emit('REDO')"
                    >
                        <RefreshRight />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        :class="{
                            active: stateManager.state.isPreviewing
                        }"
                        title="预览（I）"
                        @click="globalEventEmitter.emit('TOGGLE_PREVIEW')"
                    >
                        <Monitor />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        :class="{
                            active: stateManager.state.isFullscreen
                        }"
                        title="全屏（F11），全屏时进入预览"
                        @click="globalEventEmitter.emit('TOGGLE_FULLSCREEN')"
                    >
                        <FullScreen />
                    </ElIcon>
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="保存（Ctrl+S）"
                        @click="globalEventEmitter.emit('SAVE')"
                    >
                        <svg viewBox="0 0 16 16">
                            <path
                                d="m14.414 3.207l-1.621-1.621A2 2 0 0 0 11.379 1H3c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V4.621a2 2 0 0 0-.586-1.414M9 2v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V2zM5 14V9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V14zm9-1c0 .551-.449 1-1 1h-1V9.5c0-.827-.673-1.5-1.5-1.5h-5C4.673 8 4 8.673 4 9.5V14H3c-.551 0-1-.449-1-1V3c0-.551.449-1 1-1h2v1.5C5 4.327 5.673 5 6.5 5h2c.827 0 1.5-.673 1.5-1.5V2h1.379c.263 0 .521.107.707.293l1.621 1.621c.186.186.293.444.293.707z"
                            />
                        </svg>
                    </ElIcon>
                    <el-divider direction="vertical" />
                    <ElIcon
                        :size="25"
                        class="tool-icon"
                        title="当前判定线编号"
                    >
                        <svg viewBox="0 0 56 56">
                            <path
                                fill="currentColor"
                                d="M8.746 37.703h7.149l-2.133 10.594a4 4 0 0 0-.07.75c0 1.148.796 1.781 1.898 1.781c1.125 0 1.945-.61 2.18-1.758l2.296-11.367h11.086L29.02 48.297c-.07.234-.093.516-.093.75c0 1.148.797 1.781 1.922 1.781s1.945-.61 2.18-1.758L35.3 37.703h8.367c1.289 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875h-7.946L38.63 21.25h8.203c1.29 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875H39.45l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.82-1.805-1.945-1.805c-1.312 0-1.898.726-2.133 1.828l-2.062 10.172H24.215l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.844-1.805-1.945-1.805c-1.336 0-1.946.726-2.157 1.828l-2.062 10.172h-7.687c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805h7.289l-2.485 12.375h-7.57c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805m12.14-4.078l2.509-12.375H34.48l-2.508 12.375Z"
                            />
                        </svg>
                    </ElIcon>
                    <div class="judge-line-number-input-wrapper">
                        <MyInputNumber
                            v-model="stateManager.state.currentJudgeLineNumber"
                            :min="0"
                            :max="chart.judgeLineList.length - 1"
                            title="当前判定线编号"
                        />
                    </div>
                </div>
                <MySlider
                    v-if="audioRef"
                    v-model="audioRef.playbackRate"
                    class="speed-select"
                    :min="0"
                    :max="3"
                    :step="0.1"
                >
                    倍速 {{ audioRef.playbackRate.toFixed(1) }}x
                </MySlider>
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
                            比较常用的值为21。如果要取消竖线，请设为0。取消竖线后你的排键可能会很乱。<br>
                        </MyQuestionMark>
                    </template>
                </MyInputNumber>
                <MyButton
                    class="event-layer-hint-text"
                    :type="stateManager.state.isEditingBlockArea ? 'success' : 'primary'"
                    @click="stateManager.setBlockAreaEditing(!stateManager.state.isEditingBlockArea)"
                >
                    {{ stateManager.state.isEditingBlockArea ? "关闭噪域编辑" : "噪域编辑" }}
                </MyButton>
                <MyGridContainer
                    v-if="!stateManager.state.isEditingBlockArea"
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
                <div v-else />
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
            id="left"
            @wheel.passive.stop
        >
            <div
                v-if="!stateManager.state.autoplay"
                class="left-inner default-panel flex-container"
            >
                <MyBackHeader
                    class="title-left"
                    @back="exitPlayChart"
                >
                    试玩模式
                </MyBackHeader>
                <div>
                    <h3>玩法说明</h3>
                    <p>Tap：落到判定线上时按下任意键</p>
                    <p>Hold：落到判定线上时按住任意键直到其结束</p>
                    <p>Drag、Flick：落到判定线上时有任意键被按下即可</p>
                </div>
                <div>
                    <h3>判定信息</h3>
                    <p>Perfect：{{ judgeManager.judgeInfo.perfect }}</p>
                    <p>Good：{{ judgeManager.judgeInfo.good }}</p>
                    <p>Bad：{{ judgeManager.judgeInfo.bad }}</p>
                    <p>Miss：{{ judgeManager.judgeInfo.miss }}</p>
                    <p>Combo: {{ judgeManager.judgeInfo.combo }}</p>
                    <p>Score: {{ judgeManager.judgeInfo.score }}</p>
                </div>
                <p class="extra-description">
                    试玩模式仅用于试玩谱面，不能代表 Phigros 和 Phira 的游戏成绩。使用本软件的试玩模式游玩并公开屏元或手元时，应明确说明用 Phiedit 2573 的试玩模式游玩。
                </p>
            </div>
            <template v-else-if="isBlockAreaModeLeftPanel">
                <MyBackHeader
                    class="title-left"
                    @back="stateManager.setBlockAreaEditing(false)"
                />
                <ActiveIntervalEditPanel
                    v-if="selectedActiveInterval"
                    :model-value="selectedActiveInterval"
                    title-teleport=".title-left"
                />
                <BlockAreaEditPanel
                    v-else
                    title-teleport=".title-left"
                />
            </template>
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
        <ElMain
            id="main"
            ref="mainRef"
        >
            <canvas
                ref="canvasRef"
                class="canvas"
                :width="1350"
                :height="900"
            />
        </ElMain>
        <ElAside
            id="right"
            @wheel.passive.stop
        >
            <div v-if="!stateManager.state.autoplay">
                <MyBackHeader
                    class="title-right"
                    @back="exitPlayChart"
                >
                    判定区间设置
                </MyBackHeader>
                <MyGridContainer
                    class="judgement-rule-wrapper"
                    :width="[1, 2, 2, 2]"
                    :gap="5"
                >
                    <p />
                    <p>Perfect</p>
                    <p>Good</p>
                    <p>Bad</p>
                    <p>Tap</p>
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.perfect[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.good[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.bad[0]" />
                    <p />
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.perfect[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.good[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.tap.bad[1]" />
                    <p>Hold</p>
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.perfect[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.good[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.bad[0]" />
                    <p />
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.perfect[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.good[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.hold.bad[1]" />
                    <p>Drag</p>
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.perfect[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.good[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.bad[0]" />
                    <p />
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.perfect[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.good[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.drag.bad[1]" />
                    <p>Flick</p>
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.perfect[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.good[0]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.bad[0]" />
                    <p />
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.perfect[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.good[1]" />
                    <MyInputNumber v-model="stateManager.state.judgementRule.flick.bad[1]" />
                </MyGridContainer>
                <p class="extra-description">
                    单位为秒。每个种类的音符对应两行，分别代表判定区间的两个端点。
                </p>
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
import { ElAside, ElScrollbar, ElContainer, ElHeader, ElIcon, ElMain, ElSlider, ElFooter, ElRadioButton, ElRadioGroup, ElProgress, ElMessage } from "element-plus";
import { computed, h, inject, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clamp, isNumber, mean } from "lodash";

import MediaUtils from "@/tools/mediaUtils";
import KeyboardUtils from "@/tools/keyboardUtils";
import Constants from "@/constants";
import { catchErrorByMessage, confirm, createCatchErrorByMessage } from "@/tools/catchError";
import MathUtils, { SEC_TO_MS } from "@/tools/mathUtils";
import { ArrayedObject, checkAndSort, unique } from "@/tools/algorithm";

import { isNumberEvent, isColorEvent, isTextEvent } from "@/models/rpe/event";
import { isNoteLike, NoteType } from "@/models/rpe/note";
import { SelectableElement, isActiveInterval, isBlockArea } from "@/models/rpe/element";
import { IJudgeLine, JudgeLineExtendedOptions } from "@/models/rpe/judgeLine";

import MyButton from "@/myElements/MyButton.vue";
import MySlider from "@/myElements/MySlider.vue";
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import MyBackHeader from "@/myElements/MyBackHeader.vue";
import MyGridContainer from "@/myElements/MyGridContainer.vue";
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
import BlockAreaEditPanel from "@/panels/BlockAreaEditPanel.vue";
import ActiveIntervalEditPanel from "@/panels/ActiveIntervalEditPanel.vue";

import globalEventEmitter, { VideoRenderingProgress } from "@/eventEmitter";
import store, { managersMap } from "@/store";
import { RightPanelState } from "@/managers/renderer/state";
import getKeyHandler from "@/keyHandlers";
import { formatDate } from "@/tools/date";

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

// 使用 chartPackageLoader 加载 chartPackage
const readResult = await window.electronAPI.loadChart(chartId);
store.chartPackageRef.value = await chartPackageLoader.load(readResult, version);

// 使用 resourcePackageLoader 加载 resourcePackage
const respackArrayBuffer = await window.electronAPI.loadResourcePackage();
store.resourcePackageRef.value = await resourcePackageLoader.load(respackArrayBuffer);

loadEnd();

/** 当前谱面音乐的时长，音频元数据加载完成后才能确定 */
let musicDuration: number | null = null;

/** 渲染起止时间是否已经根据音乐时长初始化过 */
let renderTimeInitialized = false;

/**
 * 使用当前谱面音乐的时长初始化渲染起止时间。
 *
 * 渲染起止时间由当前谱面的音乐决定，
 * 不从设置文件继承，避免打开新谱面时沿用上一个谱面的值。
 */
function initRenderTime() {
    if (renderTimeInitialized) return;
    if (musicDuration === null) return;
    renderTimeInitialized = true;
    const duration = musicDuration;
    const manager = store.useManager("settingsManager");
    manager.settings.renderTimeStart = 0;
    manager.settings.renderTimeEnd = duration;
    manager.saveSettings();
}

/** 音频元数据加载完毕，此时才能确定音乐时长 */
function onAudioMetadataReady() {
    const audio = store.audioRef.value;
    if (!audio) return;
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    musicDuration = duration;
    initRenderTime();
}

// 创建并设置非全局的 managers
new ArrayedObject(managersMap).forEach((managerName, managerConstructor) => {
    store.setManager(managerName, new managerConstructor());
});

const { audioRef, canvasRef, chartPackageRef, resourcePackageRef, isRenderingVideo } = store;

const { chart, textures } = store.chartPackageRef.value;

const errorMessages = chartPackageRef.value!.errorMessages;
const errorsCount = chartPackageRef.value!.errorMessages.length;
if (errorsCount > 0) {
    const logFileName = `${formatDate(new Date(), "YYYYMMDD_HHmmss")}_${chartId}.log`;
    const logFilePath = await window.electronAPI.openLog(logFileName);
    await window.electronAPI.addLog(`${formatDate(new Date(), "YYYY/MM/DD HH:mm:ss")} 读取谱面 ${chartId} 时出现了 ${errorsCount} 个文件错误：`);
    for (const message of errorMessages) {
        await window.electronAPI.addLog(message);
    }
    await window.electronAPI.closeLog();
    ElMessage.warning({
        message: h("p", null, [
            `本次谱面加载存在文件错误，如有异常请查看`,
            h("a", {
                href: "#",
                onClick: (e) => {
                    e.preventDefault();
                    window.electronAPI.openPath(logFilePath);
                }
            }, [
                "日志文件"
            ]),
            "。"
        ]),
        dangerouslyUseHTMLString: true,
        duration: 0,
        showClose: true
    });
}

const stateManager = store.useManager("stateManager");
const settingsManager = store.useManager("settingsManager");
const selectionManager = store.useManager("selectionManager");
const mouseManager = store.useManager("mouseManager");
const coordinateManager = store.useManager("coordinateManager");
const judgeManager = store.useManager("judgeManager");

const fps = ref(0);
const time = ref(0);
const audioIsPlaying = ref(false);

/** 中间画布区域的根元素（也是全屏的元素） */
const mainRef = ref<InstanceType<typeof ElMain> | null>(null);

/** 预览开启且音乐暂停时，在画布上显示蒙版（退出 / 重开 / 继续） */
const showPreviewMask = computed(() => stateManager.state.isPreviewing && !audioIsPlaying.value && !stateManager.state.autoplay);

/** 切换全屏（F11 或工具栏按钮），进入全屏时强制进入预览状态 */
async function toggleFullscreen() {
    if (stateManager.state.isFullscreen) {
        await document.exitFullscreen();
        return;
    }

    const main = mainRef.value?.$el as HTMLElement | undefined;
    if (!main) {
        throw new Error("找不到画布区域元素，无法全屏");
    }

    await main.requestFullscreen();

    if (!stateManager.state.isPreviewing) {
        globalEventEmitter.emit("TOGGLE_PREVIEW");
    }
}

function onFullscreenChange() {
    stateManager.state.isFullscreen = document.fullscreenElement !== null;
}

/** 蒙版上的退出按钮：退出全屏（如果是全屏状态的话）并退出预览 */
function exitPreview() {
    if (stateManager.state.isFullscreen) {
        document.exitFullscreen();
    }

    if (stateManager.state.autoplay) {
        stateManager.state.isPreviewing = false;
        store.pauseAudio();
    }
    else {
        exitPlayChart();
    }
}

/** 蒙版上的重开按钮：把音乐时间设为 0 然后播放 */
function restartPreviewMusic() {
    store.setTime(0);
    store.playAudio();
}

/** 蒙版上的继续按钮：直接播放 */
function resumePreviewMusic() {
    store.playAudio();
}

/** 当前选中的第一个元素（左侧面板根据它的类型决定显示哪个编辑面板） */
const selectedElement = computed<SelectableElement | undefined>(() => selectionManager.selectedElements[0]);

/** 当前选中的激活区间 */
const selectedActiveInterval = computed(() => {
    const element = selectedElement.value;
    return element && isActiveInterval(element) ? element : null;
});

/** 噪域编辑时，左栏是否应该显示噪域 / 激活区间的编辑面板 */
const isBlockAreaModeLeftPanel = computed(() => {
    return stateManager.state.isEditingBlockArea &&
        selectionManager.selectedElements.every(element => isBlockArea(element) || isActiveInterval(element));
});

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
                return Object.keys(textures).includes(judgeLine.Texture.replace(/\\/g, "/"));
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

    // 渲染区间必须落在音乐时长之内，
    // 否则截取出来的音视频会不完整
    if (musicDuration !== null) {
        settingsManager.settings.renderTimeStart = clamp(settingsManager.settings.renderTimeStart, 0, musicDuration);
        settingsManager.settings.renderTimeEnd = clamp(settingsManager.settings.renderTimeEnd, 0, musicDuration);
        if (settingsManager.settings.renderTimeEnd <= settingsManager.settings.renderTimeStart) {
            settingsManager.settings.renderTimeEnd = musicDuration;
        }
    }

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

onBeforeUnmount(() => {
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

    // 预览暂停蒙版显示时，点击只会命中蒙版上的按钮，不参与音符判定
    if (showPreviewMask.value) {
        handlePreviewMaskClick(x, y);
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

/**
 * 双击画布左上角的暂停按键暂停音乐。
 *
 * 即使暂停按键被 UI 绑定并被判定线事件移到了别处，
 * 双击的判定区域也始终是默认的左上角位置。
 */
function canvasDblClick(e: MouseEvent) {
    if (!stateManager.state.isPreviewing) {
        return;
    }

    const { x, y } = coordinateManager.calculatePositionOfObjectFitContainCanvas(e, cachedRect);
    const centerX = coordinateManager.convertXToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.x);
    const centerY = coordinateManager.convertYToCanvas(Constants.CHART_VIEW_PAUSE_POSITION.y);
    const halfWidth = Constants.CHART_VIEW_PAUSE_WIDTH / 2 + Constants.PAUSE_BUTTON_HIT_PADDING;
    const halfHeight = Constants.CHART_VIEW_PAUSE_HEIGHT / 2 + Constants.PAUSE_BUTTON_HIT_PADDING;

    if (Math.abs(x - centerX) <= halfWidth && Math.abs(y - centerY) <= halfHeight) {
        store.pauseAudio();
    }
}

/** 蒙版显示时处理画布点击：检测点击到了退出、重开、继续中的哪个按钮 */
function handlePreviewMaskClick(x: number, y: number) {
    const chartRenderer = store.useManager("chartRenderer");
    const button = chartRenderer.hitTestPreviewMaskButton(x, y);
    if (button === "exit") {
        exitPreview();
    }
    else if (button === "restart") {
        restartPreviewMusic();
    }
    else if (button === "resume") {
        resumePreviewMusic();
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

    const handler = getKeyHandler(e, "keydown");
    handler();
}

async function windowOnKeyUp(e: KeyboardEvent) {
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
    canvas.addEventListener("dblclick", canvasDblClick);
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

    // 音乐时长要等音频元数据加载完成后才能确定，
    // 这里用它来初始化渲染结束时间
    audio.addEventListener("loadedmetadata", onAudioMetadataReady);
    audio.addEventListener("durationchange", onAudioMetadataReady);

    // 音频有可能在挂载之前就已经加载完了，这时需要主动读取一次时长
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        onAudioMetadataReady();
    }

    const tipInterval = setInterval(() => {
        tip.value = getRandomTip();
    }, TIP_SHOW_TIME);

    // 全屏状态同步（用户按 Esc 退出全屏时也要更新按钮高亮）
    document.addEventListener("fullscreenchange", onFullscreenChange);
    globalEventEmitter.on("TOGGLE_FULLSCREEN", toggleFullscreen);

    renderLoop();

    onBeforeUnmount(() => {
        // 停止播放音乐
        audio.pause();

        // 退出全屏
        if (stateManager.state.isFullscreen) {
            document.exitFullscreen();
        }

        // 清除全屏相关的事件监听器
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        globalEventEmitter.off("TOGGLE_FULLSCREEN", toggleFullscreen);

        // 取消视频导出
        cancelVideoRendering();

        // 清除事件监听器
        canvas.removeEventListener("mousedown", canvasMouseDown);
        canvas.removeEventListener("dblclick", canvasDblClick);
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
        audio.removeEventListener("loadedmetadata", onAudioMetadataReady);
        audio.removeEventListener("durationchange", onAudioMetadataReady);

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
        "tools hint-text event-layer-select offset-input";
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

.tools {
    grid-area: tools;
    display: flex;
    align-items: center;
    gap: 8px;
}

.tool-icon {
    transition: 0.2s;
    cursor: pointer;
}

.tool-icon:hover {
    color: var(--el-color-primary);
}

.tool-icon:active {
    color: var(--el-color-primary-dark);
}

.tool-icon.active {
    color: var(--el-color-primary);
}

.event-layer-hint-text {
    grid-area: hint-text;
    display: flex;
    align-items: center;
}

.note-type-select {
    grid-area: note-type-select;
}

.note-type-button-wrapper {
    display: flex;
    align-items: center;
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
}

/* 全屏时中间的画布占据整个屏幕，黑边区域也是黑色 */
#main:fullscreen {
    background-color: black;
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
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    padding-top: 10px;
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

.judgement-rule-wrapper p {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>