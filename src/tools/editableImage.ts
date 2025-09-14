import canvasUtils from "./canvasUtils";
import { RGBcolor, RGBAcolor, RGBA_LENGTH } from "./color";
export default class EditableImage {
    canvas: HTMLCanvasElement;
    constructor(a: HTMLImageElement | HTMLCanvasElement, left?: number, top?: number, width?: number, height?: number) {
        this.canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(this.canvas);
        this.canvas.width = width ?? a.width;
        this.canvas.height = height ?? a.height;
        ctx.drawImage(a, left ?? 0, top ?? 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
    }
    static empty(width: number, height: number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return new EditableImage(canvas);
    }
    static text(text: string, size: number, color: RGBcolor = [255, 255, 255], font = "Arial") {
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        ctx.font = size + "px " + font;
        const textWidth = ctx.measureText(text).width;
        const textHeight = size;
        const padding = 50;
        canvas.width = textWidth + padding * 2;
        canvas.height = textHeight + padding * 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
        ctx.font = size + "px " + font;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        return new EditableImage(canvas);
    }
    rotate(angle: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        const radians = angle * Math.PI / 180;
        const absSin = Math.abs(Math.sin(radians));
        const absCos = Math.abs(Math.cos(radians));
        const newWidth = imageWidth * absCos + imageHeight * absSin;
        const newHeight = imageWidth * absSin + imageHeight * absCos;
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(this.canvas, -imageWidth / 2, -imageHeight / 2);
        this.canvas = canvas;
        return this;
    }
    stretch(w: number, h: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(this.canvas, 0, 0, imageWidth, imageHeight, 0, 0, w, h);
        this.canvas = canvas;
        return this;
    }
    stretchScale(scaleX: number = 1, scaleY: number = 1) {
        if (scaleX === 1 && scaleY === 1) return this;
        return this.stretch(this.canvas.width * scaleX, this.canvas.height * scaleY);
    }
    cutBottom(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = imageWidth;
        canvas.height = imageHeight - length;
        ctx.drawImage(this.canvas, 0, 0, imageWidth, canvas.height, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutTop(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = imageWidth;
        canvas.height = imageHeight - length;
        ctx.drawImage(this.canvas, 0, length, imageWidth, canvas.height, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutLeft(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = imageWidth - length;
        canvas.height = imageHeight;
        ctx.drawImage(this.canvas, 0, 0, canvas.width, imageHeight, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutRight(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = imageWidth - length;
        canvas.height = imageHeight;
        ctx.drawImage(this.canvas, length, 0, canvas.width, imageHeight, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    color(color: RGBcolor | RGBAcolor) {
        const thisCtx = canvasUtils.getContext(this.canvas);
        const imageData = thisCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const canvas = document.createElement("canvas");
        const ctx = canvasUtils.getContext(canvas);
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        for (let i = 0; i < imageData.data.length; i += RGBA_LENGTH) {
            imageData.data[i] = color[0];
            imageData.data[i + 1] = color[1];
            imageData.data[i + 2] = color[2];

            /*
            if (color.length == 4) {
                imageData.data[i + 3] *= color[3] / 0xff;
            }
            */
        }
        ctx.putImageData(imageData, 0, 0);
        this.canvas = canvas;
        return this;
    }
    addColor(color: RGBcolor) {
        // 按照原颜色乘以新颜色再除以255，得到叠加后的颜色
        const ctx = canvasUtils.getContext(this.canvas);
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        for (let i = 0; i < imageData.data.length; i += RGBA_LENGTH) {
            imageData.data[i] = imageData.data[i] * color[0] / 0xff;
            imageData.data[i + 1] = imageData.data[i + 1] * color[1] / 0xff;
            imageData.data[i + 2] = imageData.data[i + 2] * color[2] / 0xff;
        }
        ctx.putImageData(imageData, 0, 0);
        return this;
    }
    addColorWithForce(color: RGBcolor, force: number) {
        const ctx = canvasUtils.getContext(this.canvas);
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        for (let i = 0; i < imageData.data.length; i += RGBA_LENGTH) {
            imageData.data[i] += (color[0] - imageData.data[i]) * force;
            imageData.data[i + 1] += (color[1] - imageData.data[i + 1]) * force;
            imageData.data[i + 2] += (color[2] - imageData.data[i + 2]) * force;
        }
        ctx.putImageData(imageData, 0, 0);
        return this;
    }
    clone() {
        const newCanvas = document.createElement("canvas");
        const newCtx = canvasUtils.getContext(newCanvas);
        newCanvas.width = this.canvas.width;
        newCanvas.height = this.canvas.height;
        newCtx.drawImage(this.canvas, 0, 0);
        return new EditableImage(newCanvas);
    }
}