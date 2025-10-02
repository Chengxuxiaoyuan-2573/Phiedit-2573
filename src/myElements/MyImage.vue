<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div
        class="image-container"
        :style="{
            width: `${props.width}px`,
            height: `${props.height}px`
        }"
    >
        <canvas
            ref="canvas"
            class="my-image"
            :style="{
                width: `${props.width}px`,
                height: `${props.height}px`
            }"
            :width="props.width * dpr.pixelRatio.value"
            :height="props.height * dpr.pixelRatio.value"
        />
    </div>
</template>
<script setup lang="ts">
import MediaUtils from "@/tools/mediaUtils";
import { useDevicePixelRatio } from "@vueuse/core";
import { onMounted, useTemplateRef, watch } from "vue";

const props = withDefaults(defineProps<{
    image: string | HTMLImageElement | HTMLCanvasElement
    width: number
    height: number
    shadow?: boolean
    rotate?: "none" | "clockwise" | "anti-clockwise" | "180deg"
}>(), {
    rotate: "none"
});
const canvas = useTemplateRef("canvas");

/** 设备的 devicePixelRatio */
const dpr = useDevicePixelRatio();

/** 图片缩放的倍数，1为撑满canvas，越大则图片越小 */
const scale = 1.2;

const rotationMap = {
    // 不旋转
    none: 0,

    // 顺时针 90°
    clockwise: Math.PI / 2,

    // 逆时针 90°
    "anti-clockwise": -Math.PI / 2,

    // 180°
    "180deg": Math.PI
};
watch(() => props.image, async () => {
    await renderImage();
});
watch(dpr.pixelRatio, () => {
    // 确保canvas尺寸更新后再渲染
    requestAnimationFrame(() => {
        renderImage();
    });
});
async function renderImage() {
    const image = await (async () => {
        try {
            if (typeof props.image === "string") {
                return await MediaUtils.createImage(props.image);
            }
            else {
                return props.image;
            }
        }
        catch (error) {
            throw new Error(`图片加载失败：${error}`);
        }
    })();

    const ctx = canvas.value?.getContext("2d");
    if (!ctx || !canvas.value) {
        throw new Error("canvas和ctx未加载完成");
    }

    let drawWidth, drawHeight;
    if (props.rotate === "clockwise" || props.rotate === "anti-clockwise") {
        // 计算缩放后的图片尺寸
        const width1 = canvas.value.height / scale;
        const height1 = width1 / image.width * image.height;
        const height2 = canvas.value.width / scale;
        const width2 = height2 / image.height * image.width;

        // 选择合适的缩放尺寸
        if (height1 <= canvas.value.width) {
            drawWidth = width1;
            drawHeight = height1;
        }
        else {
            drawWidth = width2;
            drawHeight = height2;
        }
    }
    else {
        // 计算缩放后的图片尺寸
        const width1 = canvas.value.width / scale;
        const height1 = width1 / image.width * image.height;
        const height2 = canvas.value.height / scale;
        const width2 = height2 / image.height * image.width;

        // 选择合适的缩放尺寸
        if (height1 <= canvas.value.height) {
            drawWidth = width1;
            drawHeight = height1;
        }
        else {
            drawWidth = width2;
            drawHeight = height2;
        }
    }

    // 动态计算旋转角度
    const rotation = rotationMap[props.rotate] || 0;

    // 保存当前画布状态
    ctx.save();
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

    // 设置阴影
    if (props.shadow) {
        const blurRatio = 0.1;
        const blur = canvas.value.width * blurRatio;
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = blur;
    }

    // 移动原点到画布中心
    ctx.translate(canvas.value.width / 2, canvas.value.height / 2);

    // 应用旋转
    ctx.rotate(rotation);

    // 绘制图片（以中心为原点）
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // 恢复画布状态
    ctx.restore();
}
onMounted(async () => {
    await renderImage();
});
</script>