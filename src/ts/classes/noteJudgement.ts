import { calculateLineEquation, distance, solveLinearSystem } from "../tools";

export class NoteJudgement {
    x: number;
    y: number;
    angle: number;
    size: number;
    /**
     * 给定一点判断这个点是否在垂直判定范围内。
     */
    judge(x: number, y: number) {
        const { k: k1, b: b1 } = calculateLineEquation(this.x, this.y, this.angle); // note所在的直线
        const { k: k2, b: b2 } = calculateLineEquation(x, y, this.angle + 90); // 过点击点做note的垂线
        const { x: px, y: py } = solveLinearSystem(-k1, 1, b1, -k2, 1, b2);
        const d = distance(px, py, this.x, this.y);
        return d <= this.size;
    }
    /**
     * @param x note中心点的x坐标
     * @param y note中心点的y坐标
     * @param angle note的角度
     * @param size note的宽度的一半
     */
    constructor(x: number, y: number, angle: number, size: number) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.size = size;
    }
}