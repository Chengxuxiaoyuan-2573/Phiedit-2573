import { isString } from "lodash";
import { RGBcolor, RGBAcolor, colorToString } from "./color";
import { Point } from "./mathUtils";

const DEFAULT_LINE_WIDTH = 5;
type CTX = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export default {
    getContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings) {
        const ctx = canvas.getContext("2d", options);
        if (ctx) return ctx;
        else throw new Error("Cannot get the context");
    },
    getContextWebGL(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
        const ctx = canvas.getContext("webgl", options);
        if (ctx) return ctx;
        else throw new Error("Cannot get the context");
    },
    getOffscreenCanvasContext(canvas: OffscreenCanvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) return ctx;
        else throw new Error("Cannot get the context");
    },
    drawLine(this: CTX, startX: number, startY: number, endX: number, endY: number, color: string | RGBcolor | RGBAcolor = "white", width: number = DEFAULT_LINE_WIDTH, alpha = 1) {
        this.globalAlpha = alpha;
        if (isString(color)) {
            this.strokeStyle = color;
        }
        else {
            this.strokeStyle = colorToString(color);
        }
        this.lineWidth = width;
        this.beginPath();
        this.moveTo(startX, startY);
        this.lineTo(endX, endY);
        this.stroke();
    },
    drawRect(this: CTX, left: number, top: number, w: number, h: number, color: string | RGBcolor | RGBAcolor = "white", fill = false, alpha = 1) {
        this.globalAlpha = alpha;
        if (fill) {
            if (isString(color)) {
                this.fillStyle = color;
            }
            else {
                this.fillStyle = colorToString(color);
            }
            this.fillRect(left, top, w, h);
        }
        else {
            if (isString(color)) {
                this.strokeStyle = color;
            }
            else {
                this.strokeStyle = colorToString(color);
            }
            this.strokeRect(left, top, w, h);
        }
    },
    writeText(this: CTX, text: string, centerX: number, centerY: number, size: number, color: string | RGBcolor | RGBAcolor = "white", fill = true, alpha = 1, align: "center" | "left" | "right" = "center") {
        this.globalAlpha = alpha;
        this.font = `${size}px PhiFont`;
        this.textAlign = align;
        this.textBaseline = "middle";
        if (fill) {
            if (isString(color)) {
                this.fillStyle = color;
            }
            else {
                this.fillStyle = colorToString(color);
            }
            this.fillText(text, centerX, centerY);
        }
        else {
            if (isString(color)) {
                this.strokeStyle = color;
            }
            else {
                this.strokeStyle = colorToString(color);
            }
            this.strokeText(text, centerX, centerY);
        }
    },
    drawCircle(this: CTX, x: number, y: number, radius: number, color: string | RGBcolor | RGBAcolor, fill: boolean = true, alpha = 1) {
        this.globalAlpha = alpha;
        if (fill) {
            if (isString(color)) {
                this.fillStyle = color;
            }
            else {
                this.fillStyle = colorToString(color);
            }
            this.beginPath();
            this.arc(x, y, radius, 0, 2 * Math.PI);
            this.fill();
        }
        else {
            if (isString(color)) {
                this.strokeStyle = color;
            }
            else {
                this.strokeStyle = colorToString(color);
            }
            this.beginPath();
            this.arc(x, y, radius, 0, 2 * Math.PI);
            this.stroke();
        }
    },
    drawPolygon(this: CTX, points: Point[], color: string | RGBcolor | RGBAcolor, fill = false) {
        if (fill) {
            if (isString(color)) {
                this.fillStyle = color;
            }
            else {
                this.fillStyle = colorToString(color);
            }
            this.beginPath();
            this.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.lineTo(points[i].x, points[i].y);
            }
            this.fill();
        }
        else {
            if (isString(color)) {
                this.strokeStyle = color;
            }
            else {
                this.strokeStyle = colorToString(color);
            }
            this.beginPath();
            this.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.lineTo(points[i].x, points[i].y);
            }
            this.stroke();
        }
    }
};