export default class KeyboardUtils {
    static createKeyOptions(e: KeyboardEvent | MouseEvent) {
        return {
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey,
        };
    }

    /**
     * 将键盘事件对象格式化为可读的按键组合字符串
     *
     * 功能说明：
     * 1. 检测并拼接修饰键（按Ctrl -> Shift -> Alt -> Meta的顺序）
     * 2. 转换特殊按键的显示名称（如 Space、Esc 等）
     * 3. 自动排除修饰键自身事件（如单独按下 Control 键）
     *
     * @param e - 键盘事件对象，包含按键信息和修饰键状态
     * @returns 格式化后的组合按键字符串（例如 "Ctrl Shift S"）
     */
    static formatKey(e: KeyboardEvent) {
        // 特殊情况，修饰键自身事件
        if (e.key === "Control") {
            return "Ctrl";
        }

        if (e.key === "Shift") {
            return "Shift";
        }

        if (e.key === "Alt") {
            return "Alt";
        }

        if (e.key === "Meta") {
            return "Meta";
        }

        let str = "";

        // 处理修饰键：按固定顺序拼接 Ctrl/Shift/Alt/Meta
        if (e.ctrlKey) str += "Ctrl ";
        if (e.shiftKey) str += "Shift ";
        if (e.altKey) str += "Alt ";
        if (e.metaKey) str += "Meta ";

        /**
         * 格式化单个按键的显示文本
         * @param key - 原始按键值
         * @returns 转换后的标准按键名称（全大写，特殊按键转换）
         */
        function formatSingleKey(key: string) {
            switch (key) {
                case " ":
                    return "Space";
                case "Escape":
                    return "Esc";
                case "Delete":
                    return "Del";
                case "ArrowLeft":
                    return "Left";
                case "ArrowRight":
                    return "Right";
                case "ArrowUp":
                    return "Up";
                case "ArrowDown":
                    return "Down";
                default:
                    // 判断按键是否为单个字符，如果是则转换为大写，否则返回原始值
                    // 避免将Home、End等按键转换为大写
                    if (key.length === 1) return key.toUpperCase();
                    else return key;
            }
        }

        str += formatSingleKey(e.key);

        return str;
    }
}