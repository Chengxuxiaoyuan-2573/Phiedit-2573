import { isString } from "lodash";
import { RGBcolor, RGBAcolor, colorToString } from "../classes/color";

export default {
    drawLine(this: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, color: string | RGBcolor | RGBAcolor = "white", width: number = 5) {
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
    drawRect(this: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, color: string | RGBcolor | RGBAcolor = "white", fill = false) {
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
    writeText(this: CanvasRenderingContext2D, text: string, centerX: number, centerY: number, size: number, color: string | RGBcolor | RGBAcolor = "white", fill = true) {
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