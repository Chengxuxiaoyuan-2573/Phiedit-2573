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
            :width="props.width * dpr"
            :height="props.height * dpr"
        />
    </div>
</template>
<script setup lang="ts">
import { useDevicePixelRatio } from "@vueuse/core";
import { onMounted, useTemplateRef } from "vue";

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
const dpr = useDevicePixelRatio().pixelRatio;
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
onMounted(() => {
    const image = (() => {
        if (typeof props.image === "string") {
            const image = new Image();
            image.src = props.image;
            return image;
        }
        else {
            return props.image;
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

    // 顺时针/逆时针旋转时交换宽高
    // if (props.rotate === 'clockwise' || props.rotate === 'anti-clockwise') {
    //     [drawWidth, drawHeight] = [drawHeight, drawWidth]; // 交换宽高
    // }

    // 绘制图片（以中心为原点）
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // 恢复画布状态
    ctx.restore();

    image.onerror = () => {
        console.error("图片加载失败");
    };
});
</script>