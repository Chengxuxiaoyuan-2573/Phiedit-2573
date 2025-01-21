export function formatData(bytes: number, p = 2) {
    return format(['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'], 1024, bytes, p)
}
export function format(units: string[], base: number, num: number, p = 2): string {
    // 输入参数有效性检查
    if (!Array.isArray(units) || units.length == 0) {
        throw new Error("Invalid units array");
    }
    if (typeof base != 'number' || base <= 0) {
        throw new Error("Invalid base: " + base);
    }
    if (!isFinite(num) || isNaN(num)) {
        throw new Error("Invalid number: " + num);
    }
    if (typeof p != 'number' || p < 0 || !Number.isInteger(p)) {
        throw new Error("Invalid precision: " + p);
    }

    let result = '';
    for (let i = 0; i < units.length; i++) {
        if (num < base || i == units.length - 1) {
            result = num.toFixed(p) + ' ' + units[i];
            break;
        }
        num /= base;
    }

    return result;
}
export function getContext(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx;
    else throw new Error("Cannot get the context");
}
export function downloadText(text: string, fileName: string, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
export function sortAndForEach<T>(a: T[], compare: (a: T, b: T) => number, forEach: (value: T, index: number) => void) {
    // 创建一个包含元素及其原始下标的数组
    const indexedArray = a.map((value, index) => ({ value, index }));

    // 按照元素值进行排序
    indexedArray.sort((a, b) => compare(a.value, b.value));

    // 遍历排序后的数组，输出元素及其原始下标
    indexedArray.forEach(item => {
        forEach(item.value, item.index);
    });
}
// 二分查找函数，返回插入位置
export function binarySearchInsertIndex<T>(arr: T[], target: T, compareFn: (a: T, b: T) => number): number {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const comparison = compareFn(arr[mid], target);

        if (comparison < 0) {
            left = mid + 1;
        } else if (comparison > 0) {
            right = mid - 1;
        } else {
            return mid; // 如果找到相同元素，插入到该位置
        }
    }

    return left; // 返回插入位置
}
