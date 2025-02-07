export default {
    ...Math,
    moveAndRotate(x1: number, y1: number, dir: number, x2: number, y2: number) {
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
    },
    pole(x: number, y: number, theta: number, r: number) {
        return this.moveAndRotate(x, y, theta, r, 0);
    },
    convertDegreesToRadians(degrees: number) {
        return degrees * (Math.PI / 180);
    },
    mod(x: number, y: number) {
        return (x % y + y) % y;
    },
    average(a: number[]) {
        return a.reduce((x, y) => x + y) / a.length;
    },
    distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    },
    gcd(a: number, b: number) {
        for (let i = Math.max(a, b); i >= 1; i--) {
            if (a % i == 0 && b % i == 0) {
                return i;
            }
        }
        return 1;
    },
    lcm(a: number, b: number) {
        return (a * b) / this.gcd(a, b);
    },
    randomNumbers(count: number, seed = Date.now(), min = 0, max = 1): number[] {
        // 参数有效性检查
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('count must be a positive integer');
        }
        if (min > max) {
            throw new Error('min cannot be greater than max');
        }

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