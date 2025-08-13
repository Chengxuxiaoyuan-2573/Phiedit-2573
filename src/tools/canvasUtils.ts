import { isString } from "lodash";
import { RGBcolor, RGBAcolor, colorToString } from "./color";

export default {
    getContext(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (ctx) return ctx;
        else throw new Error("Cannot get the context");
    },
    drawLine(this: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, color: string | RGBcolor | RGBAcolor = "white", width: number = 5, alpha: number = 1) {
        this.globalAlpha = alpha;
        if (isString(color))
            this.strokeStyle = color;
        else
            this.strokeStyle = colorToString(color);
        this.lineWidth = width;
        this.beginPath();
        this.moveTo(startX, startY);
        this.lineTo(endX, endY);
        this.stroke();
    },
    drawRect(this: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, color: string | RGBcolor | RGBAcolor = "white", fill = false, alpha: number = 1) {
        this.globalAlpha = alpha;
        if (fill) {
            if (isString(color))
                this.fillStyle = color;
            else
                this.fillStyle = colorToString(color);
            this.fillRect(left, top, w, h);
        }
        else {
            if (isString(color))
                this.strokeStyle = color;
            else
                this.strokeStyle = colorToString(color);
            this.strokeRect(left, top, w, h);
        }
    },
    writeText(this: CanvasRenderingContext2D, text: string, centerX: number, centerY: number, size: number, color: string | RGBcolor | RGBAcolor = "white", fill = true, alpha: number = 1) {
        this.globalAlpha = alpha;
        this.font = `${size}px PhiFont`;
        this.textAlign = "center";
        this.textBaseline = "middle";
        if (fill) {
            if (isString(color))
                this.fillStyle = color;
            else
                this.fillStyle = colorToString(color);
            this.fillText(text, centerX, centerY);
        } else {
            if (isString(color))
                this.strokeStyle = color;
            else
                this.strokeStyle = colorToString(color);
            this.strokeText(text, centerX, centerY);
        }
    }
}