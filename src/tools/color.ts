export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]
export function colorToString(color: RGBcolor | RGBAcolor) {
    if (color.length == 4) {
        return `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`;
    }
    else {
        return `rgb(${color[0]},${color[1]},${color[2]})`;
    }
}

export function color(num: number):RGBAcolor {
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff, (num >> 24) & 0xff / 255];
}
