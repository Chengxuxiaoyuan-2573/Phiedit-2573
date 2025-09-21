<template>
    <div class="settings-panel right-inner">
        <Teleport :to="props.titleTeleport">
            设置
        </Teleport>
        <em>设置不会存储到导出的谱面文件中</em>
        <MyButton
            type="primary"
            @click="settingsManager.setToDefault(), update()"
            @change="settingsManager.saveSettings()"
        >
            恢复默认设置
        </MyButton>
        <MySlider
            v-model="settingsManager.settings.musicVolume"
            :min="0"
            :max="1"
            :step="0.01"
            :format-tooltip="(number) => Math.round(number * 100) + '%'"
            @change="settingsManager.saveSettings()"
        >
            音乐音量
        </MySlider>
        <MySlider
            v-model="settingsManager.settings.hitSoundVolume"
            :min="0"
            :max="1"
            :step="0.01"
            :format-tooltip="(number) => Math.round(number * 100) + '%'"
            @change="settingsManager.saveSettings()"
        >
            音效音量
        </MySlider>
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
        <MySlider
            v-model="settingsManager.settings.wheelSpeed"
            :min="0.005"
            :max="0.5"
            :step="0.005"
            :format-tooltip="value => `${Math.round(value * 200)}%`"
            @change="settingsManager.saveSettings()"
        >
            滚轮速度
        </MySlider>
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
        <MySwitch
            v-model="settingsManager.settings.showJudgeLineNumber"
            @change="settingsManager.saveSettings()"
        >
            预览时显示判定线编号
        </MySwitch>
        <MySelect
            v-model="settingsManager.settings.bottomText"
            :options="bottomTextOptions"
            @change="settingsManager.saveSettings()"
        >
            界面底部文字
        </MySelect>
        <MySwitch
            v-model="settingsManager.settings.markCurrentJudgeLine"
            @change="settingsManager.saveSettings()"
        >
            把当前判定线标记为绿色
        </MySwitch>
        <MySwitch
            v-model="settingsManager.settings.autoHighlight"
            @change="settingsManager.saveSettings()"
        >
            自动标注双押提示
        </MySwitch>
        <MySwitch
            v-model="settingsManager.settings.autoCheckErrors"
            @change="settingsManager.saveSettings()"
        >
            自动纠错
        </MySwitch>
        <MySwitch
            v-model="settingsManager.settings.unlimitFps"
            @change="settingsManager.saveSettings()"
        >
            取消帧率限制<em>（谨慎使用）</em>
        </MySwitch>
        <!-- <h3>资源包设置</h3>
        <MyInputNumber
            v-model="resourcePackage.config.hitFxDuration"
            :min="0"
        >
            <template #prepend>
                打击特效时间
            </template>
            <template #append>
                秒
            </template>
        </MyInputNumber>
        <ElCheckbox v-model="resourcePackage.config.hitFxRotate">
            打击特效随判定线旋转
        </ElCheckbox>
        <ElCheckbox v-model="resourcePackage.config.holdKeepHead">
            Hold正在判定时显示头部
        </ElCheckbox>
        <ElCheckbox v-model="resourcePackage.config.hideParticles">
            隐藏粒子
        </ElCheckbox>
        <ElCheckbox v-model="resourcePackage.config.holdCompact">
            Hold中间与头尾重叠（不支持，懒得做）
        </ElCheckbox>
        <ElCheckbox v-model="resourcePackage.config.holdRepeat">
            Hold中间重复式拉伸
        </ElCheckbox> -->
    </div>
</template>
<script setup lang="ts">
import MyInputNumber from "@/myElements/MyInputNumber.vue";
import store from "@/store";
import MyButton from "@/myElements/MyButton.vue";

// import { ElCheckbox } from 'element-plus';
import { ref } from "vue";
import MySwitch from "@/myElements/MySwitch.vue";
import MySlider from "@/myElements/MySlider.vue";
import MySelect from "@/myElements/MySelect.vue";
import { BottomText } from "@/managers/settings";
const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
function update() {
    u.value = !u.value;
}

const bottomTextOptions = [
    {
        value: BottomText.None,
        label: "不显示",
        text: "不显示"
    },
    {
        value: BottomText.Info,
        label: "显示判定线信息",
        text: "显示判定线信息"
    },
    {
        value: BottomText.Hint,
        label: "显示提示文字",
        text: "显示提示文字"
    }
];

// const resourcePackage = store.useResourcePackage();
const settingsManager = store.useManager("settingsManager");
</script>