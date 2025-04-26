import Validation from "./validation";

export default class MathUtils {
    /**
     * 求从(x1, y1)点往dir方向移动x2，左转90度，再移动y2得到的坐标  
     * dir为0表示向右（x轴正方向），为90表示向下（y轴负方向）
     */
    static moveAndRotate(x1: number, y1: number, dir: number, x2: number, y2: number) {
        // 初始方向向量（单位向量）  
        const dx = Math.cos(dir * (Math.PI / 180)); // x方向分量
        const dy = -Math.sin(dir * (Math.PI / 180)); // y方向分量
        // 计算初始移动后的坐标
        const x2_new = x1 + x2 * dx;
        const y2_new = y1 + x2 * dy;
        // 左转90度后的新方向向量
        const newDx = -dy; // 原来的y分量变成新的-x分量
        const newDy = dx;  // 原来的x分量变成新的y分量
        // 计算最终坐标
        const x_final = x2_new + y2 * newDx;
        const y_final = y2_new + y2 * newDy;
        return { x: x_final, y: y_final };
    }
    /**
     * 把以(x, y)为原点的极坐标转换为直角坐标  
     * theta为0表示向右（x轴正方向），为90表示向下（y轴负方向）
     */
    static pole(x: number, y: number, theta: number, r: number) {
        return this.moveAndRotate(x, y, theta, r, 0);
    }
    static convertDegreesToRadians(degrees: number) {
        return degrees * (Math.PI / 180);
    }
    static mod(x: number, y: number) {
        return (x % y + y) % y;
    }
    static average(a: number[]) {
        return a.reduce((x, y) => x + y) / a.length;
    }
    static distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    static gcd(a: number, b: number): number {
        new Validation(a).is("number").integer();
        new Validation(b).is("number").integer();

        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a === 0 && b === 0 ? 0 : a;
    }
    static lcm(a: number, b: number) {
        new Validation(a).is("number").integer();
        new Validation(b).is("number").integer();

        a = Math.abs(a);
        b = Math.abs(b);
        if (a === 0 || b === 0) {
            return 0;
        }

        return a / this.gcd(a, b) * b;
    }
    static randomNumbers(count: number, seed = Date.now(), min = 0, max = 1): number[] {
        /*
        const LCG_MULTIPLIER = 9301;
        const LCG_INCREMENT = 49297;
        const LCG_MODULUS = 233280;
        */
        new Validation(count).is("number").integer().positive();
        new Validation(seed).is("number").finite().notNaN();
        new Validation(min).is("number").finite().notNaN().max(max);
        new Validation(max).is("number").finite().notNaN().min(min);

        // 种子值更新函数
        function updateSeed(seed: number): number {
            return (seed * 9301 + 49297) % 233280;
        }

        // 初始化结果数组
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            seed = updateSeed(seed);
            result.push(min + (seed / 233280) * (max - min));
        }

        return result;
    }
}