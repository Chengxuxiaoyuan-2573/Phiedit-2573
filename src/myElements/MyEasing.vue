<template>
    <div
        ref="container"
        :class="className"
        class="function-graph"
    >
        <canvas
            ref="canvas"
            :width="props.width"
            :height="props.height"
            class="graph-canvas"
        />
    </div>
</template>

<script setup lang="ts">
import { BEZIER_X1_INDEX, BEZIER_X2_INDEX, BEZIER_Y1_INDEX, BEZIER_Y2_INDEX, BezierPoints, createBezierCurve, cubicBezierEase, easingFuncs, EasingType } from "@/models/easing";
import { Bezier } from "@/models/event";
import canvasUtils from "@/tools/canvasUtils";
import MathUtils from "@/tools/mathUtils";
import { ref, onMounted, onBeforeUnmount, watch, withDefaults } from "vue";

const X_MIN = 0, X_MAX = 1, Y_MIN = 0, Y_MAX = 1;

// 定义props
interface Props {
    className?: string
    width?: number
    height?: number
    color?: string;
    zoomOut?: number;
}

const model = defineModel<{
    easingType: EasingType,
    easingLeft: number,
    easingRight: number,
    bezier: Bezier,
    bezierPoints: BezierPoints
}>({
    required: true
});

const props = withDefaults(defineProps<Props>(), {
    className: "",
    color: "#09f",
    width: 200,
    height: 200,
    zoomOut: 1
});

const emit = defineEmits<{
    (e: "bezierInput", bezierPoints: BezierPoints): void;
    (e: "bezierChange", bezierPoints: BezierPoints): void;
    (e: "easingLrInput", easingLeft: number, easingRight: number): void;
    (e: "easingLrChange", easingLeft: number, easingRight: number): void;
}>();

// 响应式容器和canvas引用
const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// 画布尺寸
const size = ref({
    width: 0,
    height: 0
});

// 设备像素比
const dpr = window.devicePixelRatio || 1;

// Index of dragged point (0 or 1)
let draggingPoint: number | null = null;
let isDragging = false;
let mouseX: number | null = null;

// 计算画布尺寸
const updateSize = () => {
    if (container.value) {
        size.value = {
            width: container.value.clientWidth * dpr,
            height: container.value.clientHeight * dpr
        };
    }
};

// 初始化画布
const initCanvas = () => {
    if (!canvas.value) return;

    // 设置画布尺寸
    canvas.value.width = size.value.width;
    canvas.value.height = size.value.height;

    // 获取2D上下文
    const context = canvas.value.getContext("2d");
    if (context) {
        ctx.value = context;

        // 应用设备像素比
        ctx.value.scale(dpr, dpr);
    }
};

// 坐标系转换
const transformPoint = (x: number, y: number): [number, number] => {
    const width = size.value.width / dpr;
    const height = size.value.height / dpr;

    // x轴变换：x ∈ [xMin, xMax] → 画布x ∈ [0, width]
    const xMin = X_MIN, xMax = X_MAX;
    let canvasX = (x - xMin) / (xMax - xMin) * width;

    // y轴变换：y ∈ [yMin, yMax] → 画布y ∈ [height, 0]
    const yMin = Y_MIN, yMax = Y_MAX;
    let canvasY = height - (y - yMin) / (yMax - yMin) * height;

    // 以画布中心为锚点缩放
    const centerX = width / 2;
    const centerY = height / 2;

    canvasX = (canvasX - centerX) / props.zoomOut + centerX;
    canvasY = (canvasY - centerY) / props.zoomOut + centerY;
    return [canvasX, canvasY];
};

// 绘制坐标系
const drawAxes = () => {
    if (!ctx.value) return;
    const easingLeft = model.value.easingLeft;
    const easingRight = model.value.easingRight;

    ctx.value.lineWidth = 2;
    const easingFunc = easingFuncs[model.value.easingType];
    const [left, bottom] = transformPoint(X_MIN, Y_MIN);
    const [right, top] = transformPoint(X_MAX, Y_MAX);

    const width = Math.abs(right - left);
    const height = Math.abs(top - bottom);

    const [easingLeftX, easingLeftY] = transformPoint(easingLeft, easingFunc(easingLeft));
    const [easingRightX, easingRightY] = transformPoint(easingRight, easingFunc(easingRight));

    const drawRect = canvasUtils.drawRect.bind(ctx.value);
    const drawLine = canvasUtils.drawLine.bind(ctx.value);
    const drawPolygon = canvasUtils.drawPolygon.bind(ctx.value);

    drawRect(left, top, width, height, "#ccc", false);
    if (model.value.bezier) return;
    drawLine(easingLeftX, top, easingLeftX, bottom, "#f007", 2);
    drawLine(easingRightX, top, easingRightX, bottom, "#00f7", 2);
    drawLine(left, easingLeftY, right, easingLeftY, "#f007", 2);
    drawLine(left, easingRightY, right, easingRightY, "#00f7", 2);
    drawPolygon(
        [
            {
                x: easingLeftX,
                y: bottom + DISTANCE - HANDLE_SIZE,
            },
            {
                x: easingLeftX - HANDLE_SIZE,
                y: bottom + DISTANCE + HANDLE_SIZE,
            },
            {
                x: easingLeftX + HANDLE_SIZE,
                y: bottom + DISTANCE + HANDLE_SIZE,
            },
        ],
        "#f00",
        true
    );
    drawPolygon(
        [
            {
                x: easingRightX,
                y: bottom + DISTANCE - HANDLE_SIZE,
            },
            {
                x: easingRightX - HANDLE_SIZE,
                y: bottom + DISTANCE + HANDLE_SIZE,
            },
            {
                x: easingRightX + HANDLE_SIZE,
                y: bottom + DISTANCE + HANDLE_SIZE,
            },
        ],
        "#00f",
        true
    );
};

const ALPHA_NOT_IN_RANGE = 0.1;
const DISTANCE = 10;
const HANDLE_SIZE = 5;
const POINT_SIZE = 5;
const TEXT_SIZE = 20;

// 绘制函数图像
const drawFunction = () => {
    if (!ctx.value) return;
    if (model.value.bezier) {
        const bezierCurve = createBezierCurve(model.value.bezierPoints);
        const step = 0.01;

        ctx.value.strokeStyle = props.color;
        ctx.value.lineWidth = 2;

        ctx.value.beginPath();
        ctx.value.moveTo(...transformPoint(0, 0));
        for (let t = 0; t <= 1; t += step) {
            const { x, y } = bezierCurve(t);
            const [transformedX, transformedY] = transformPoint(x, y);
            ctx.value.lineTo(transformedX, transformedY);
        }
        ctx.value.lineTo(...transformPoint(1, 1));
        ctx.value.stroke();
    }
    else {
        const easingFunc = easingFuncs[model.value.easingType];

        const width = size.value.width / dpr;
        const step = (X_MAX - X_MIN) / width;

        ctx.value.strokeStyle = props.color;
        ctx.value.lineWidth = 2;

        const easingLeft = model.value.easingLeft;
        const easingRight = model.value.easingRight;

        let previousX, previousY;
        for (let x = X_MIN; x <= X_MAX; x += step) {
            const y = easingFunc(x);
            const [canvasX, canvasY] = transformPoint(x, y);

            ctx.value.globalAlpha = x >= easingLeft && x <= easingRight ? 1 : ALPHA_NOT_IN_RANGE;

            ctx.value.beginPath();
            ctx.value.moveTo(previousX ?? canvasX, previousY ?? canvasY);
            ctx.value.lineTo(canvasX, canvasY);
            ctx.value.stroke();

            previousX = canvasX;
            previousY = canvasY;
        }
    }
};

const drawControlPoints = () => {
    // Draw control points if in Bézier mode
    if (model.value.bezier && model.value.bezierPoints) {
        const [p1x, p1y, p2x, p2y] = model.value.bezierPoints;
        const points = [
            { x: p1x, y: p1y },
            { x: p2x, y: p2y }
        ];

        points.forEach((point, index) => {
            if (!ctx.value) return;
            const [canvasX, canvasY] = transformPoint(point.x, point.y);
            const radius = POINT_SIZE;

            ctx.value.beginPath();
            if (index === 0) {
                ctx.value.moveTo(...transformPoint(0, 0));
            }
            else {
                ctx.value.moveTo(...transformPoint(1, 1));
            }
            ctx.value.lineTo(canvasX, canvasY);
            ctx.value.strokeStyle = index === 0 ? "#f00" : "#00f";
            ctx.value.stroke();

            ctx.value.beginPath();
            ctx.value.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
            ctx.value.fillStyle = index === 0 ? "#f00" : "#00f";
            ctx.value.fill();
        });
    }
};

const showHoverText = () => {
    if (!ctx.value || mouseX === null || isDragging || draggingPoint) return;
    const [left, bottom] = transformPoint(X_MIN, Y_MIN);
    const [right, top] = transformPoint(X_MAX, Y_MAX);

    const width = Math.abs(right - left);

    const centerX = left + width / 2;

    const func = model.value.bezier ? cubicBezierEase(model.value.bezierPoints) : easingFuncs[model.value.easingType];

    const corrY = func(mouseX);

    const [transformedX, transformedY] = transformPoint(mouseX, corrY);

    const writeText = canvasUtils.writeText.bind(ctx.value);
    const drawLine = canvasUtils.drawLine.bind(ctx.value);

    writeText(`(${mouseX.toFixed(2)}, ${corrY.toFixed(2)})`,
        centerX,
        top - DISTANCE,
        TEXT_SIZE,
        "#000");

    drawLine(transformedX, top, transformedX, bottom, "#0002", 2);
    drawLine(left, transformedY, right, transformedY, "#0002", 2);
};

// Add point proximity check
function isPointNearControlPoint(
    canvasX: number,
    canvasY: number,
    pointX: number,
    pointY: number
): boolean {
    const [px, py] = transformPoint(pointX, pointY);

    // 10px hit detection radius
    return MathUtils.distance(canvasX, canvasY, px, py) < POINT_SIZE;
}

// 重绘函数
const redraw = () => {
    if (!ctx.value) return;

    // 清空画布
    ctx.value.clearRect(0, 0, size.value.width, size.value.height);

    // 绘制坐标系和函数
    drawAxes();
    drawFunction();
    drawControlPoints();
    showHoverText();
};

// 监听窗口变化
const resizeObserver = new ResizeObserver(() => {
    updateSize();
    initCanvas();
    redraw();
});

// 组件生命周期
onMounted(() => {
    if (container.value) {
        resizeObserver.observe(container.value);
        updateSize();
        initCanvas();
        redraw();
    }

    if (canvas.value) {
        canvas.value.addEventListener("mousedown", handleMouseDown);
        canvas.value.addEventListener("mousemove", handleMouseMove);
        canvas.value.addEventListener("mouseup", handleMouseUp);
        canvas.value.addEventListener("mouseleave", handleMouseUp);
        canvas.value.addEventListener("mouseleave", handleMouseLeave);
    }
});

onBeforeUnmount(() => {
    if (container.value) {
        resizeObserver.unobserve(container.value);
    }

    if (canvas.value) {
        canvas.value.removeEventListener("mousedown", handleMouseDown);
        canvas.value.removeEventListener("mousemove", handleMouseMove);
        canvas.value.removeEventListener("mouseup", handleMouseUp);
        canvas.value.removeEventListener("mouseleave", handleMouseUp);
        canvas.value.removeEventListener("mouseleave", handleMouseLeave);
    }
});

function handleMouseDown(e: MouseEvent) {
    if (!ctx.value || !canvas.value) return;

    const rect = canvas.value.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    if (model.value.bezier) {
        const [p1x, p1y, p2x, p2y] = model.value.bezierPoints;

        if (isPointNearControlPoint(canvasX, canvasY, p1x, p1y)) {
            draggingPoint = 0;
            isDragging = true;
        }
        else if (isPointNearControlPoint(canvasX, canvasY, p2x, p2y)) {
            draggingPoint = 1;
            isDragging = true;
        }
    }
    else {
        const { easingLeft, easingRight } = model.value;
        const [easingLeftX] = transformPoint(easingLeft, 0);
        const [easingRightX] = transformPoint(easingRight, 0);
        const [, bottom] = transformPoint(X_MIN, Y_MIN);

        // 虽然显示的是三角形，但碰撞箱的形状是圆形的（因为写三角形的碰撞箱太复杂了）
        if (MathUtils.distance(canvasX, canvasY, easingLeftX, bottom + DISTANCE) < HANDLE_SIZE) {
            draggingPoint = 0;
            isDragging = true;
        }
        else if (MathUtils.distance(canvasX, canvasY, easingRightX, bottom + DISTANCE) < HANDLE_SIZE) {
            draggingPoint = 1;
            isDragging = true;
        }
    }
}

function canvasToModelCoords(canvasX: number, canvasY: number): { x: number, y: number } {
    const width = size.value.width / dpr;
    const height = size.value.height / dpr;

    // Reverse zoom transform
    const centerX = width / 2;
    const centerY = height / 2;
    const scaledX = (canvasX - centerX) * props.zoomOut + centerX;
    const scaledY = (canvasY - centerY) * props.zoomOut + centerY;

    // Reverse axis transform
    const x = scaledX / width * (X_MAX - X_MIN) + X_MIN;
    const y = (height - scaledY) / height * (Y_MAX - Y_MIN) + Y_MIN;

    return { x, y };
}

function handleMouseMove(e: MouseEvent) {
    if (!ctx.value || !canvas.value) return;

    const rect = canvas.value.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const { x, y } = canvasToModelCoords(canvasX, canvasY);

    // Clamp values to [0, 1] range
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    if (!isDragging || draggingPoint === null) {
        mouseX = clampedX;
        redraw();
        return;
    }

    if (model.value.bezier) {
        const newPoints: BezierPoints = [...model.value.bezierPoints];
        if (draggingPoint === 0) {
            newPoints[BEZIER_X1_INDEX] = clampedX;
            newPoints[BEZIER_Y1_INDEX] = clampedY;
        }
        else {
            newPoints[BEZIER_X2_INDEX] = clampedX;
            newPoints[BEZIER_Y2_INDEX] = clampedY;
        }

        // Update model and redraw
        model.value.bezierPoints = newPoints;
        emit("bezierInput", newPoints);
    }
    else {
        if (draggingPoint === 0) {
            if (clampedX > model.value.easingRight) {
                model.value.easingRight = clampedX;
                draggingPoint = 1;
            }
            else {
                model.value.easingLeft = clampedX;
            }
        }
        else {
            if (clampedX < model.value.easingLeft) {
                model.value.easingLeft = clampedX;
                draggingPoint = 0;
            }
            else {
                model.value.easingRight = clampedX;
            }
        }
        emit("easingLrInput", model.value.easingLeft, model.value.easingRight);
    }
    redraw();
}

function handleMouseUp() {
    isDragging = false;
    draggingPoint = null;
    if (model.value.bezier) {
        emit("bezierChange", model.value.bezierPoints);
    }
    else {
        emit("easingLrChange", model.value.easingLeft, model.value.easingRight);
    }
}

function handleMouseLeave() {
    mouseX = null;
    redraw();
}

// 监听model变化
watch(() => [
    model.value.easingType,
    model.value.easingLeft,
    model.value.easingRight,
    model.value.bezier,
    model.value.bezierPoints
], redraw);
</script>

<style scoped>
.function-graph {
    width: 100%;
    height: 100%;
    position: relative;
}

.graph-canvas {
    width: 100%;
    height: 100%;
    display: block;
}
</style>