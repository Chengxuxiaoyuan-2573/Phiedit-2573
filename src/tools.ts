
export function getContext(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx;
    else throw new Error("Cannot get the context");
}

