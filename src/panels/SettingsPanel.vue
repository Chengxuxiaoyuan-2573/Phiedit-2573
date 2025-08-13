<template>
    <div class="settings-panel">
        <Teleport :to="props.titleTeleport">
            设置
        </Teleport>
        <em>设置不会存储到谱面文件中</em>
        <MyButton
            type="primary"
            @click="settingsManager.setToDefault(), update()"
        >
            恢复默认设置
        </MyButton>
        <MyInputNumber
            v-model="settingsManager.settings.lineWidth"
            :min="0"
        >
            <template #prepend>
                判定线宽度
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="settingsManager.settings.textSize"
            :min="0"
        >
            <template #prepend>
                文字大小
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber
            v-model="settingsManager.settings.backgroundDarkness"
            :min="0"
            :max="100"
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
        >
            <template #prepend>
                note大小
            </template>
            <template #append>
                像素
            </template>
        </MyInputNumber>
        <MyInputNumber v-model="settingsManager.settings.autoplayOffset">
            <template #prepend>
                判定偏移
                <MyQuestionMark>
                    Autoplay在自动打击音符时，会提前或延后多少毫秒的时间。<br>
                    默认为0，即正常时间。正数表示提前，负数表示延后。<br>
                    正常范围为(-180,180)。输入不在此范围内的数字会全部miss。<br>
                    如果你输入正好卡在分界线上的数字，则两边的行为都可能发生。<br>
                    Perfect： ±80ms，Good：±160ms，Bad：±180ms<br>
                </MyQuestionMark>
            </template>
            <template #append>
                毫秒
            </template>
        </MyInputNumber>
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
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import MyQuestionMark from '@/myElements/MyQuestionMark.vue';
import store from '@/store';
import MyButton from '@/myElements/MyButton.vue';
// import { ElCheckbox } from 'element-plus';
import { ref } from 'vue';
const props = defineProps<{
    titleTeleport: string
}>();
const u = ref(false);
function update() {
    u.value = !u.value;
}
// const resourcePackage = store.useResourcePackage();
const settingsManager = store.useManager("settingsManager");
</script>
<style scoped>
.settings-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>