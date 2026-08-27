/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import canvasUtils from "./canvasUtils";
import { RGBcolor, RGBAcolor, colorToString } from "./color";
export default class EditableImage {
    canvas: OffscreenCanvas;
    constructor(a: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas, left?: number, top?: number, width?: number, height?: number) {
        this.canvas = new OffscreenCanvas(width ?? a.width, height ?? a.height);
        const ctx = canvasUtils.getOffscreenCanvasContext(this.canvas);
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
        const radians = angle * Math.PI / 180;
        const absSin = Math.abs(Math.sin(radians));
        const absCos = Math.abs(Math.cos(radians));
        const newWidth = imageWidth * absCos + imageHeight * absSin;
        const newHeight = imageWidth * absSin + imageHeight * absCos;
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(this.canvas, -imageWidth / 2, -imageHeight / 2);
        this.canvas = canvas;
        return this;
    }
    stretch(w: number, h: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
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
        const canvas = new OffscreenCanvas(imageWidth, imageHeight - length);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.drawImage(this.canvas, 0, 0, imageWidth, canvas.height, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutTop(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = new OffscreenCanvas(imageWidth, imageHeight - length);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.drawImage(this.canvas, 0, length, imageWidth, canvas.height, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutLeft(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = new OffscreenCanvas(imageWidth - length, imageHeight);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.drawImage(this.canvas, 0, 0, canvas.width, imageHeight, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    cutRight(length: number) {
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        const canvas = new OffscreenCanvas(imageWidth - length, imageHeight);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.drawImage(this.canvas, length, 0, canvas.width, imageHeight, 0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        return this;
    }
    color(color: RGBcolor | RGBAcolor) {
        const ctx = canvasUtils.getOffscreenCanvasContext(this.canvas);
        ctx.drawImage(this.canvas, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = colorToString(color);
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.globalCompositeOperation = "source-over";
        return this;
    }
    addColor(color: RGBcolor) {
        const canvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        const ctx = canvasUtils.getOffscreenCanvasContext(canvas);
        ctx.drawImage(this.canvas, 0, 0);

        // ---------- 第一步：绘制原图 ----------
        ctx.drawImage(this.canvas, 0, 0);

        // ---------- 第二步：在图像背后垫一层白色 ----------
        // destination-over 会让新绘制的内容出现在现有内容的下方
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 此时：不透明区域保持原图，透明区域变成了白色，半透明边缘变成了半透明白色

        // ---------- 第三步：正片叠底上色 ----------
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = colorToString(color);
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 此时：颜色已经叠加上去，但原本透明的区域因为垫了白色，变成了纯色（不透明）

        // ---------- 第四步：恢复原图的透明度 ----------
        // destination-in 会保留现有画布（已上色）的颜色，但形状裁剪为原图的形状（包含透明度）
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(this.canvas, 0, 0);

        // 透明区域被重新掏空，且边缘颜色是正片叠底后的正确颜色，不再发黑
        ctx.globalCompositeOperation = "source-over";
        this.canvas = canvas;
        return this;
    }
    clone() {
        return new EditableImage(this.canvas);
    }
}