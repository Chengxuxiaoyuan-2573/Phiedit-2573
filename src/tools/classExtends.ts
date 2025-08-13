export class FileReaderExtends extends FileReader {
    async readAsync(blob: Blob, type: 'arraybuffer', progressHandler: typeof this.onprogress): Promise<ArrayBuffer>;
    async readAsync(blob: Blob, type: 'dataurl', progressHandler: typeof this.onprogress): Promise<string>;
    async readAsync(blob: Blob, type: 'text', progressHandler: typeof this.onprogress): Promise<string>;
    async readAsync(blob: Blob, type: 'arraybuffer' | 'dataurl' | 'text', progressHandler: typeof this.onprogress = null) {
        this.onprogress = progressHandler;
        const promise = this._waitLoad();
        if (type == 'arraybuffer')
            this.readAsArrayBuffer(blob);
        else if (type == 'dataurl')
            this.readAsDataURL(blob);
        else if (type == 'text')
            this.readAsText(blob);
        return await promise;
    }
    _waitLoad() {
        return new Promise<typeof this.result>((resolve) => {
            this.onload = () => {
                resolve(this.result);
            }
        })
    }
}
// export class SortedArray<T> {
//     compare: (a: T, b: T) => number;
//     private arr: T[];
//     constructor(compare: (a: T, b: T) => number, ...items: T[]) {
//         this.arr = items;
//         this.compare = compare;
//         this.arr.sort(compare);
//     }
//     add(...items: T[]) {
//         // 用二分插入的方式把元素插入到正确的位置
//         for (const item of items) {
//             let left = 0;
//             let right = this.arr.length;
//             while (left < right) {
//                 const mid = Math.floor((left + right) / 2);
//                 if (this.compare(item, this.arr[mid]) < 0) {
//                     right = mid;
//                 } else {
//                     left = mid + 1;
//                 }
//             }
//             this.arr.splice(left, 0, item);
//         }
//         return this.arr.length;
//     }
//     delete(index: number) {
//         this.arr.splice(index, 1);
//     }
// }