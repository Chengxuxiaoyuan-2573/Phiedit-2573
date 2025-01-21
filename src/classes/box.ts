import { getContext } from "../tools";

export class Box<T = void> {
    left = 0;
    right = 0;
    top = 0;
    bottom = 0;
    data?: T;
    get width() {
        return this.right - this.left;
    }
    get height() {
        return this.bottom - this.top;
    }
    get middleX() {
        return (this.left + this.right) / 2;
    }
    get middleY() {
        return (this.top + this.bottom) / 2;
    }
    touch(x: number, y: number) {
        return this.left <= x && x <= this.right && this.top <= y && y <= this.bottom;
    }
    overlap(left: number, top: number, right: number, bottom: number) {
        return this.right > left && this.left < right && this.bottom > top && this.top < bottom;
    }
    show(canvas: HTMLCanvasElement) {
        const ctx = getContext(canvas);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 5;
        ctx.strokeRect(this.left, this.top, this.width, this.height);
    }
    constructor(top: number, bottom: number, left: number, right: number, data?: T) {
        if (top > bottom) [bottom, top] = [top, bottom];
        if (left > right) [right, left] = [left, right];
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.data = data;
    }
}