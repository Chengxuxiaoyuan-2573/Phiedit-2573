/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

export class Box {
    left = 0;
    right = 0;
    top = 0;
    bottom = 0;
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
        const minX = Math.min(this.left, this.right);
        const maxX = Math.max(this.left, this.right);
        const minY = Math.min(this.top, this.bottom);
        const maxY = Math.max(this.top, this.bottom);

        return minX <= x && x <= maxX && minY <= y && y <= maxY;
    }
    overlap(box: Box) {
        const thisMinX = Math.min(this.left, this.right);
        const thisMaxX = Math.max(this.left, this.right);
        const thisMinY = Math.min(this.top, this.bottom);
        const thisMaxY = Math.max(this.top, this.bottom);
        const boxMinX = Math.min(box.left, box.right);
        const boxMaxX = Math.max(box.left, box.right);
        const boxMinY = Math.min(box.top, box.bottom);
        const boxMaxY = Math.max(box.top, box.bottom);
        return thisMinX <= boxMaxX && boxMinX <= thisMaxX && thisMinY <= boxMaxY && boxMinY <= thisMaxY;
    }
    constructor(top: number, bottom: number, left: number, right: number) {
        if (top > bottom) [bottom, top] = [top, bottom];
        if (left > right) [right, left] = [left, right];
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
    }
}
export class BoxWithData<T> extends Box {
    data: T;
    constructor(top: number, bottom: number, left: number, right: number, data: T) {
        super(top, bottom, left, right);
        this.data = data;
    }
}