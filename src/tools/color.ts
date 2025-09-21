export type RGBcolor = [number, number, number]
export type RGBAcolor = [number, number, number, number]

export const HEX_SHORT_LENGTH = 4;
export const HEX_LONG_LENGTH = 7;
export const RGB_LENGTH = 3;
export const RGBA_LENGTH = 4;
export const RED_INDEX = 0;
export const GREEN_INDEX = 1;
export const BLUE_INDEX = 2;
export const ALPHA_INDEX = 3;
export const BYTE_LENGTH = 8;
export function colorToString(color: RGBcolor | RGBAcolor) {
    if (color.length === RGBA_LENGTH) {
        return `rgba(${color[RED_INDEX]},${color[GREEN_INDEX]},${color[BLUE_INDEX]},${color[ALPHA_INDEX]})`;
    }
    else {
        return `rgb(${color[RED_INDEX]},${color[GREEN_INDEX]},${color[BLUE_INDEX]})`;
    }
}

/**
 * 由数字解析出RGBA颜色。
 * 数字应该是 32 位的二进制数：
 * - 最高的 8 位为 alpha
 * - 然后 8 位为 red
 * - 然后 8 位为 green
 * - 然后 8 位为 blue
 */
export function parseRGBAfromNumber(num: number): RGBAcolor {
    if (num > 0xffffffff) {
        throw new Error("数字超出32位");
    }
    return [num >> 2 * BYTE_LENGTH & 0xff, num >> BYTE_LENGTH & 0xff, num & 0xff, num >> 3 * BYTE_LENGTH & 0xff / 255];
}

export function formatRGBcolor(color: RGBcolor) {
    return `${color[0].toFixed(0)},${color[1].toFixed(0)},${color[2].toFixed(0)}`;
}

export function isEqualRGBcolors(color1: RGBcolor, color2: RGBcolor) {
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2];
}

export function parseRGBcolor(color: string): RGBcolor | null {
    if (color.startsWith("#")) {
        if (color.length < HEX_SHORT_LENGTH) {
            return null;
        }

        if (color.length < HEX_LONG_LENGTH) {
            const parts = [];
            for (let index = 1; index < color.length; index++) {
                const part = parseInt(color.substring(index, index + 1), 16);
                parts.push(part);
            }
            return parts as RGBcolor;

            // const r = parseInt(color.substring(1, 2), 16);
            // const g = parseInt(color.substring(2, 3), 16);
            // const b = parseInt(color.substring(3, 4), 16);
            // if (isNaN(r) || isNaN(g) || isNaN(b)) {
            //     return null;
            // }
            // return [r << 4 | r, g << 4 | g, b << 4 | b];
        }
        else {
            const parts = [];
            for (let index = 1; index < color.length; index += 2) {
                const part = parseInt(color.substring(index, index + 2), 16);
                if (isNaN(part)) {
                    return null;
                }
                parts.push(part);
            }
            return parts as RGBcolor;

            // const r = parseInt(color.substring(1, 3), 16);
            // const g = parseInt(color.substring(3, 5), 16);
            // const b = parseInt(color.substring(5, 7), 16);
            // if (isNaN(r) || isNaN(g) || isNaN(b)) {
            //     return null;
            // }
            // return [r, g, b];
        }
    }
    else {
        const split = color.split(",");
        if (split.length !== RGB_LENGTH) {
            return null;
        }

        const r = +split[0], g = +split[1], b = +split[2];
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return null;
        }
        return [r, g, b];
    }
}

export function RGBAtoRGB(color: RGBAcolor): RGBcolor {
    return [color[0], color[1], color[2]];
}

export function RGBtoRGBA(color: RGBcolor, alpha: number): RGBAcolor {
    return [color[0], color[1], color[2], alpha];
}

export function colorToHex(color: RGBcolor): string {
    // eslint-disable-next-line no-magic-numbers
    return `#${(color[0] | 0).toString(16).padStart(2, "0")}${(color[1] | 0).toString(16).padStart(2, "0")}${(color[2] | 0).toString(16).padStart(2, "0")}`;
}

export function invert(color: RGBcolor): RGBcolor {
    return [255 - color[0], 255 - color[1], 255 - color[2]];
}

export const
    WHITE: RGBcolor = [255, 255, 255],
    BLACK: RGBcolor = [0, 0, 0],
    RED: RGBcolor = [255, 0, 0],
    GREEN: RGBcolor = [0, 255, 0],
    BLUE: RGBcolor = [0, 0, 255],
    YELLOW: RGBcolor = [255, 255, 0],
    CYAN: RGBcolor = [0, 255, 255],
    MAGENTA: RGBcolor = [255, 0, 255];