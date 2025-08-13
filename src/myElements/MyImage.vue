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
import { useDevicePixelRatio } from '@vueuse/core';
import { onMounted, useTemplateRef } from 'vue';

const props = withDefaults(defineProps<{
    image: string | HTMLImageElement | HTMLCanvasElement
    width: number
    height: number
    shadow?: boolean
    rotate?: "none" | "clockwise" | "anti-clockwise" | "180deg"
}>(), {
    rotate: "none"
})
const canvas = useTemplateRef("canvas");
const dpr = useDevicePixelRatio().pixelRatio;
const scale = 1.2;
const rotationMap = {
    none: 0,
    clockwise: Math.PI / 2,       // 顺时针 90°
    'anti-clockwise': -Math.PI / 2, // 逆时针 90°
    '180deg': Math.PI             // 180°
};
onMounted(() => {
    const image = (() => {
        if (typeof props.image == "string") {
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
        throw new Error('canvas和ctx未加载完成');
    }
    if (props.shadow) {
        // 动态计算阴影参数
        const blurFactor = 0.03;
        const offsetFactor = 0;

        const blur = canvas.value.width * blurFactor;
        const offsetX = canvas.value.width * offsetFactor;
        const offsetY = canvas.value.height * offsetFactor;
        // 给图片添加阴影
        // 设置阴影属性
        ctx.shadowColor = 'rgba(200, 200, 200, 0.5)'; // 半透明黑色阴影
        ctx.shadowBlur = blur; // 模糊程度
        ctx.shadowOffsetX = offsetX; // 水平偏移
        ctx.shadowOffsetY = offsetY; // 垂直偏移
    }
    let drawWidth, drawHeight;
    if (props.rotate === 'clockwise' || props.rotate === 'anti-clockwise') {
        // 计算缩放后的图片尺寸
        const width1 = canvas.value.height / scale;
        const height1 = width1 / image.width * image.height;
        const height2 = canvas.value.width / scale;
        const width2 = height2 / image.height * image.width;

        // 选择合适的缩放尺寸
        if (height1 <= canvas.value.width) {
            drawWidth = width1;
            drawHeight = height1;
        } else {
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
        } else {
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
        const blur = canvas.value.width * 0.1;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
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
        console.error('图片加载失败');
    }
})
</script>