/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { RGBAcolor } from "../tools/color";
import { NoteType } from "./note";
import MediaUtils from "../tools/mediaUtils";
interface IResourcePackage {
    tap: HTMLImageElement;
    flick: HTMLImageElement;
    drag: HTMLImageElement;
    hold: HTMLImageElement;
    holdHead: HTMLCanvasElement;
    holdEnd: HTMLCanvasElement;
    holdBody: HTMLCanvasElement;
    tapHL: HTMLImageElement;
    flickHL: HTMLImageElement;
    dragHL: HTMLImageElement;
    holdHL: HTMLImageElement;
    holdHLHead: HTMLCanvasElement;
    holdHLEnd: HTMLCanvasElement;
    holdHLBody: HTMLCanvasElement;
    tapSound: AudioBuffer;
    dragSound: AudioBuffer;
    flickSound: AudioBuffer;
    perfectHitFxFrames: HTMLCanvasElement[];
    goodHitFxFrames: HTMLCanvasElement[];
    config: ResourceConfig;
}
interface ResourceConfig {

    /** 打击特效的持续时间，以秒为单位 */
    hitFxDuration: number;

    /** 打击特效缩放比例，该属性已经在加载资源包时预先乘以该属性的值 */
    // hitFxScale: number;

    /** 打击特效是否随 Note 旋转 */
    hitFxRotate: boolean;

    /** 打击特效是否依照判定线颜色着色，该属性已经在加载资源包时预先给打击特效上了色 */
    // hitFxTinted: boolean;

    /** 打击时是否隐藏方形粒子效果 */
    hideParticles: boolean;

    /** Hold 触线后是否还显示头部 */
    holdKeepHead: boolean;

    /** Hold 的中间部分是否采用重复式拉伸 */
    holdRepeat: boolean;

    /** 是否把 Hold 的头部和尾部与 Hold 中间重叠 */
    holdCompact: boolean;

    /** AP（全 Perfect）情况下的判定线颜色 */
    colorPerfect: RGBAcolor;

    /** FC（全连）情况下的判定线颜色 */
    colorGood: RGBAcolor;
}

export class ResourcePackage implements IResourcePackage {
    tap: HTMLImageElement;
    flick: HTMLImageElement;
    drag: HTMLImageElement;
    hold: HTMLImageElement;
    holdHead: HTMLCanvasElement;
    holdEnd: HTMLCanvasElement;
    holdBody: HTMLCanvasElement;
    tapHL: HTMLImageElement;
    flickHL: HTMLImageElement;
    dragHL: HTMLImageElement;
    holdHL: HTMLImageElement;
    holdHLHead: HTMLCanvasElement;
    holdHLEnd: HTMLCanvasElement;
    holdHLBody: HTMLCanvasElement;
    tapSound: AudioBuffer;
    dragSound: AudioBuffer;
    flickSound: AudioBuffer;
    perfectHitFxFrames: HTMLCanvasElement[];
    goodHitFxFrames: HTMLCanvasElement[];
    config: ResourceConfig;
    getSkin(noteType: NoteType.Hold, highlight: boolean): { head: HTMLCanvasElement, body: HTMLCanvasElement, end: HTMLCanvasElement };
    getSkin(noteType: NoteType.Tap | NoteType.Drag | NoteType.Flick, highlight: boolean): HTMLImageElement;
    getSkin(noteType: NoteType, highlight: boolean) {
        if (noteType === NoteType.Drag) {
            if (highlight) {
                return this.dragHL;
            }
            else {
                return this.drag;
            }
        }
        else if (noteType === NoteType.Flick) {
            if (highlight) {
                return this.flickHL;
            }
            else {
                return this.flick;
            }
        }
        else if (noteType === NoteType.Tap) {
            if (highlight) {
                return this.tapHL;
            }
            else {
                return this.tap;
            }
        }
        else {
            if (highlight) {
                return {
                    head: this.holdHLHead,
                    body: this.holdHLBody,
                    end: this.holdHLEnd
                };
            }
            else {
                return {
                    head: this.holdHead,
                    body: this.holdBody,
                    end: this.holdEnd
                };
            }
        }
    }
    playSound(audioContext: AudioContext, noteType: NoteType, volume = 1) {
        switch (noteType) {
            case NoteType.Tap:
            case NoteType.Hold:
                MediaUtils.playSound.call(audioContext, this.tapSound, undefined, volume);
                return;
            case NoteType.Drag:
                MediaUtils.playSound.call(audioContext, this.dragSound, undefined, volume);
                return;
            case NoteType.Flick:
                MediaUtils.playSound.call(audioContext, this.flickSound, undefined, volume);
                return;
        }
    }
    constructor(resourcePackage: IResourcePackage) {
        this.tap = resourcePackage.tap;
        this.flick = resourcePackage.flick;
        this.drag = resourcePackage.drag;
        this.hold = resourcePackage.hold;
        this.holdHead = resourcePackage.holdHead;
        this.holdEnd = resourcePackage.holdEnd;
        this.holdBody = resourcePackage.holdBody;
        this.tapHL = resourcePackage.tapHL;
        this.flickHL = resourcePackage.flickHL;
        this.dragHL = resourcePackage.dragHL;
        this.holdHL = resourcePackage.holdHL;
        this.holdHLHead = resourcePackage.holdHLHead;
        this.holdHLEnd = resourcePackage.holdHLEnd;
        this.holdHLBody = resourcePackage.holdHLBody;
        this.tapSound = resourcePackage.tapSound;
        this.dragSound = resourcePackage.dragSound;
        this.flickSound = resourcePackage.flickSound;
        this.perfectHitFxFrames = resourcePackage.perfectHitFxFrames;
        this.goodHitFxFrames = resourcePackage.goodHitFxFrames;
        this.config = resourcePackage.config;
    }
}