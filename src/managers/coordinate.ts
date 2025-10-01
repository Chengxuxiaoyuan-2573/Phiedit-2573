import Constants from "@/constants";
import { Beats, secondsToBeats } from "@/models/beats";
import store from "@/store";
import { round, floor } from "lodash";
import Manager from "./abstract";

export default class CoordinateManager extends Manager {
    /** 把鼠标点击的x坐标吸附到最近的竖线上并返回竖线的x坐标 */
    attatchX(x: number) {
        const stateManager = store.useManager("stateManager");
        if (stateManager._state.verticalLineCount <= 1) {
            // 如果竖线数量小于等于1，说明竖线已关闭，直接返回x即可，不用吸附
            return this.unscaleX(x);
        }
        else {
            // 如果有竖线，就吸附
            // 先根据x坐标计算离鼠标最近的是第几条竖线，并四舍五入为整数
            // 再乘以竖线间距，得到吸附之后的x坐标
            return round((x - Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX) / this.verticalLineSpaceScaled) * this.verticalLineSpaceUnscaled;
        }
    }

    /** 把画布的X坐标缩放至编辑视口 */
    scaleX(x: number) {
        const canvas = store.useCanvas();
        return Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX + x / canvas.width * Constants.EDITOR_VIEW_NOTES_VIEWBOX.width;
    }

    /** 把已经缩放进编辑视口的X坐标转换回画布的X坐标 */
    unscaleX(x: number) {
        const canvas = store.useCanvas();
        return (x - Constants.EDITOR_VIEW_NOTES_VIEWBOX.middleX) * canvas.width / Constants.EDITOR_VIEW_NOTES_VIEWBOX.width;
    }

    /** 获取两条竖线之间的间隔，以canvas的宽度为基准 */
    get verticalLineSpaceUnscaled() {
        const canvas = store.useCanvas();
        const stateManager = store.useManager("stateManager");
        return canvas.width / (stateManager._state.verticalLineCount - 1);
    }

    /** 获取两条竖线之间的间隔，以音符编辑视口的宽度为基准 */
    get verticalLineSpaceScaled() {
        const stateManager = store.useManager("stateManager");
        return Constants.EDITOR_VIEW_NOTES_VIEWBOX.width / (stateManager._state.verticalLineCount - 1);
    }

    /*
        在对编辑界面中显示的音符的Y坐标的描述时，有相对坐标和绝对坐标两种：
        相对坐标是相对于canvas顶部的坐标，绝对坐标是相对于第0拍横线的坐标
        绝对坐标越大，相对坐标越小，因为坐标轴方向是相反的
        相对坐标的方向就是canvas的Y轴方向，是向下的
        绝对坐标的方向是向上的
    */

    /** 现在时间点的横线离第0拍的横线有多远，以显示在canvas上的像素为准 */
    get offsetY() {
        const stateManager = store.useManager("stateManager");
        const seconds = store.getSeconds();
        return stateManager._state.verticalZoom * seconds;
    }

    /**
     * 把鼠标点击的y坐标吸附到离鼠标最近的横线上并返回所代表的拍数
     */
    attatchY(y: number): Beats {
        const stateManager = store.useManager("stateManager");
        const beats = this.getBeatsOfRelativePositionY(y);

        const int = floor(beats);
        const decimal = beats - int;

        const fenzi = round(decimal * stateManager._state.horizonalLineCount);
        const fenmu = stateManager._state.horizonalLineCount;
        return [int, fenzi, fenmu];
    }

    /** 把秒数转为绝对坐标 */
    getAbsolutePositionYOfSeconds(sec: number) {
        const stateManager = store.useManager("stateManager");
        return sec * stateManager._state.verticalZoom;
    }

    /** 把秒数转为相对坐标 */
    getRelativePositionYOfSeconds(sec: number) {
        return this.relative(this.getAbsolutePositionYOfSeconds(sec));
    }

    /** 把绝对坐标转为秒数 */
    getSecondsOfAbsolutePositionY(y: number) {
        const stateManager = store.useManager("stateManager");
        return y / stateManager._state.verticalZoom;
    }

    /** 把相对坐标转为秒数 */
    getSecondsOfRelativePositionY(y: number) {
        return this.getSecondsOfAbsolutePositionY(this.absolute(y));
    }

    /** 把绝对坐标转为拍数 */
    getBeatsOfAbsolutePositionY(y: number) {
        const seconds = this.getSecondsOfAbsolutePositionY(y);
        const chart = store.useChart();
        const beats = secondsToBeats(chart.BPMList, seconds);
        return beats;
    }

    /** 把相对坐标转为拍数 */
    getBeatsOfRelativePositionY(y: number) {
        const seconds = this.getSecondsOfRelativePositionY(y);
        const chart = store.useChart();
        const beats = secondsToBeats(chart.BPMList, seconds);
        return beats;
    }

    /** 把相对坐标转为绝对坐标 */
    absolute(relativeY: number) {
        return Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom - relativeY + this.offsetY;
    }

    /** 把绝对坐标转为相对坐标 */
    relative(absoluteY: number) {
        return Constants.EDITOR_VIEW_NOTES_VIEWBOX.bottom - absoluteY + this.offsetY;
    }

    /** 把谱面坐标系的X坐标转换成canvas坐标系的X坐标 */
    convertXToCanvas(x: number) {
        const canvas = store.useCanvas();
        return x + canvas.width / 2;
    }

    /** 把谱面坐标系的Y坐标转换成canvas坐标系的Y坐标 */
    convertYToCanvas(y: number) {
        const canvas = store.useCanvas();
        return canvas.height / 2 - y;
    }

    /** 把canvas坐标系的X坐标转换成谱面坐标系的X坐标 */
    convertXToChart(x: number) {
        const canvas = store.useCanvas();
        return x - canvas.width / 2;
    }

    /** 把canvas坐标系的Y坐标转换成谱面坐标系的Y坐标 */
    convertYToChart(y: number) {
        const canvas = store.useCanvas();
        return canvas.height / 2 - y;
    }

    /**
     * 该函数用于在含有 object-fit:contain 样式的 canvas 上，
     * 根据 MouseEvent 对象计算出点击位置在 canvas 绘制上下文中的坐标
     * 解决了由于 canvas 外部尺寸与内部绘制尺寸不一致导致的坐标偏移问题
     */
    calculatePositionOfObjectFitContainCanvas({ offsetX: x, offsetY: y }: MouseEvent, rect: DOMRect) {
        const canvas = store.useCanvas();
        if (!canvas) throw new Error("canvas is null");

        const innerWidth = canvas.width;
        const innerHeight = canvas.height;
        const innerRatio = innerWidth / innerHeight;

        const outerWidth = rect.width;
        const outerHeight = rect.height;
        const outerRatio = outerWidth / outerHeight;

        // 计算缩放比和边距
        const { ratio, padding } = (() => {
            if (innerRatio > outerRatio) {
                const width = outerWidth;
                const height = width / innerRatio;
                const padding = (outerHeight - height) / 2;
                return { padding, ratio: innerWidth / width };
            }
            else {
                const height = outerHeight;
                const width = height * innerRatio;
                const padding = (outerWidth - width) / 2;
                return { padding, ratio: innerHeight / height };
            }
        })();

        // 根据宽高比返回调整后的坐标
        if (innerRatio > outerRatio) {
            return { x: x * ratio, y: (y - padding) * ratio };
        }
        else {
            return { y: y * ratio, x: (x - padding) * ratio };
        }
    }
}