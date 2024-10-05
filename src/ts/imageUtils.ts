export default {
    rotate(img: HTMLImageElement, angle: number) {
        return new Promise<HTMLImageElement>((resolve) => {
            const radians = angle * Math.PI / 180;
            const absSin = Math.abs(Math.sin(radians));
            const absCos = Math.abs(Math.cos(radians));
            const newWidth = img.width * absCos + img.height * absSin;
            const newHeight = img.width * absSin + img.height * absCos;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(radians);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            const newImage = new Image();
            newImage.src = canvas.toDataURL('image/png');
            newImage.style.display = 'block';
            newImage.onload = () => {
                resolve(newImage);
            }
        })
    },
    stretch(img: HTMLImageElement, w: number, h?: number) {
        return new Promise<HTMLImageElement>((resolve) => {
            h ||= img.height / img.width * w;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, w, h);
            const newImage = new Image();
            newImage.src = canvas.toDataURL('image/png');
            newImage.style.display = 'block';
            newImage.onload = () => {
                resolve(newImage);
            }
        })
    },
    cutBottom(img: HTMLImageElement, length: number): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                reject(); // 或者抛出一个错误  
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height - length; // 裁剪掉底部 length 像素  
            ctx.drawImage(img, 0, 0, img.width, canvas.height, 0, 0, canvas.width, canvas.height); // 只绘制原始图片的上部区域  
            const newImage = new Image();
            newImage.src = canvas.toDataURL('image/png');
            newImage.onload = () => {
                resolve(newImage);
            };
            newImage.onerror = (error) => {
                console.error('Failed to create new image:', error);
                reject(); // 或者抛出一个错误 
            };
        });
    },
    cutTop(img: HTMLImageElement, length: number): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            // ... 与 cutBottom 类似，但 ctx.drawImage 的参数需要调整以裁剪掉顶部 length 像素  
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                reject(); // 或者抛出一个错误 
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height - length; // 裁剪掉顶部 length 像素  
            ctx.drawImage(img, 0, length, img.width, canvas.height, 0, 0, canvas.width, canvas.height); // 从原始图片的下方开始绘制  
            const newImage = new Image();
            newImage.src = canvas.toDataURL('image/png');
            newImage.onload = () => {
                resolve(newImage);
            };
            newImage.onerror = (error) => {
                console.error('Failed to create new image:', error);
                reject(); // 或者抛出一个错误 
            };
        });
    }
}