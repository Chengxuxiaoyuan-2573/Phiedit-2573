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
