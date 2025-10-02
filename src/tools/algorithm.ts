/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

abstract class AstNode {
    type: string;
    constructor(type: string) {
        this.type = type;
    }
}
class UnaryExpression extends AstNode {
    op: string;
    argument: AstNode;
    constructor(op: string, argument: AstNode) {
        super("UnaryExpression");
        this.op = op;
        this.argument = argument;
    }
}

class BinaryExpression extends AstNode {
    op: string;
    left: AstNode;
    right: AstNode;
    constructor(op: string, left: AstNode, right: AstNode) {
        super("BinaryExpression");
        this.op = op;
        this.left = left;
        this.right = right;
    }
}

class Literal extends AstNode {
    value: number;
    constructor(value: number) {
        super("Literal");
        this.value = value;
    }
}

class CallExpression extends AstNode {
    callee: string;
    arguments: AstNode[];
    constructor(callee: string, arguments_: AstNode[]) {
        super("CallExpression");
        this.callee = callee;
        this.arguments = arguments_;
    }
}

class Identifier extends AstNode {
    name: string;
    constructor(name: string) {
        super("Identifier");
        this.name = name;
    }
}
export class ExpressionCalculator {
    private variables: Record<string, number>;
    private functions: Record<string, (...args: number[]) => number>;

    constructor(
        variables: Record<string, number> = {},
        functions: Record<string, (...args: number[]) => number> = {}
    ) {
        this.variables = variables;
        this.functions = functions;
    }

    calculate(expr: string): number {
        const tokens = this.tokenize(expr);
        const ast = this.parse(tokens);
        return this.evaluate(ast);
    }

    private tokenize(expr: string): string[] {
        const numberRegexStart = /^\d+(\.\d+)?([eE][-+]?\d+)?/;
        const variableRegexStart = /^[a-zA-Z_$][\w$]*/;
        const tokens: string[] = [];
        let index = 0;

        while (index < expr.length) {
            const char = expr[index];
            if (/\s/.test(char)) {
                index++;
                continue;
            }

            // Match numbers
            const numMatch = expr.slice(index).match(numberRegexStart);
            if (numMatch) {
                tokens.push(numMatch[0]);
                index += numMatch[0].length;
                continue;
            }

            // Match identifiers
            const idMatch = expr.slice(index).match(variableRegexStart);
            if (idMatch) {
                tokens.push(idMatch[0]);
                index += idMatch[0].length;
                continue;
            }

            // Match operators
            if (/^[\^()+\-*/%]$/.test(char)) {
                tokens.push(char);
                index++;
                continue;
            }

            throw new Error(`无法解析的符号: ${char}`);
        }
        return tokens;
    }

    private parse(tokens: string[]): AstNode {
        const numberRegex = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;
        const variableRegex = /^[a-zA-Z_$][\w$]*$/;
        let index = 0;

        const parse1 = (): AstNode => {
            let left = parse2();
            while (index < tokens.length && /^[+-]$/.test(tokens[index])) {
                const op = tokens[index++];
                const right = parse2();
                left = new BinaryExpression(op, left, right);
            }
            return left;
        };

        const parse2 = (): AstNode => {
            let left = parse3();
            while (index < tokens.length && /^[*/%]$/.test(tokens[index])) {
                const op = tokens[index++];
                const right = parse3();
                left = new BinaryExpression(op, left, right);
            }
            return left;
        };

        const parse3 = (): AstNode => {
            let left = parse4();
            while (index < tokens.length && /^\^$/.test(tokens[index])) {
                const op = tokens[index++];
                const right = parse3();
                left = new BinaryExpression(op, left, right);
            }
            return left;
        };

        const parse4 = (): AstNode => {
            if (tokens[index] === "(") {
                index++;
                const expr = parse1();
                if (index >= tokens.length || tokens[index] !== ")") throw new Error("括号不匹配");
                index++;
                return expr;
            }

            if (numberRegex.test(tokens[index])) {
                return new Literal(Number(tokens[index++]));
            }

            if (variableRegex.test(tokens[index])) {
                const id = tokens[index++];
                if (tokens[index] === "(") {
                    index++;
                    const args = [];
                    while (tokens[index] !== ")") {
                        args.push(parse1());
                        if (index < tokens.length && tokens[index] === ",") {
                            index++;
                        }

                        if (index >= tokens.length) {
                            throw new Error(`函数 ${id} 的括号不匹配`);
                        }
                    }
                    index++;
                    return new CallExpression(id, args);
                }
                return new Identifier(id);
            }

            if (/^[+-]$/.test(tokens[index])) {
                return new UnaryExpression(tokens[index++], parse4());
            }
            throw new Error(`无法解析的符号: ${tokens[index]}`);
        };

        const result = parse1();
        if (index < tokens.length) {
            throw new Error(`无法解析: ${tokens[index]}`);
        }
        return result;
    }

    private evaluate(node: AstNode): number {
        if (node instanceof Literal) return node.value;
        if (node instanceof Identifier) {
            const value = this.variables[node.name];
            if (value === undefined) throw new Error(`变量 ${node.name} 未定义`);
            if (typeof value !== "number") throw new Error(`变量 ${node.name} 不是数字`);
            return value;
        }

        if (node instanceof BinaryExpression) {
            const left = this.evaluate(node.left);
            const right = this.evaluate(node.right);
            switch (node.op) {
                case "+": return left + right;
                case "-": return left - right;
                case "*": return left * right;
                case "/": return left / right;
                case "^": return left ** right;
                case "%": return left % right;
                default: throw new Error(`未知运算符: ${node.op}`);
            }
        }

        if (node instanceof CallExpression) {
            const func = this.functions[node.callee];
            if (typeof func !== "function") throw new Error(`${node.callee} 不是函数`);
            return func(...node.arguments.map(arg => this.evaluate(arg)));
        }

        if (node instanceof UnaryExpression) {
            const arg = this.evaluate(node.argument);
            return node.op === "-" ? -arg : +arg;
        }
        throw new Error(`未知节点类型: ${node.type}`);
    }
}

// export function binarySearchInsertIndex<T>(arr: T[], target: T, compareFn: (a: T, b: T) => number): number {
//     let left = 0;
//     let right = arr.length - 1;

//     while (left <= right) {
//         const mid = Math.floor((left + right) / 2);
//         const comparison = compareFn(arr[mid], target);

//         if (comparison < 0) {
//             left = mid + 1;
//         } else if (comparison > 0) {
//             right = mid - 1;
//         } else {
//             return mid; // 如果找到相同元素，插入到该位置
//         }
//     }

//     return left; // 返回插入位置
// }
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

export function isSorted<T>(arr: T[], compare: (a: T, b: T) => number) {
    for (let i = 1; i < arr.length; i++) {
        if (compare(arr[i - 1], arr[i]) > 0) {
            return false;
        }
    }
    return true;
}

export function checkAndSort<T>(arr: T[], compare: (a: T, b: T) => number) {
    if (!isSorted(arr, compare)) {
        arr.sort(compare);
    }
}

/**
 * 移除数组中的连续重复项。
 * 注意：本函数仅处理相邻重复项，若需完全去重，输入数组必须已排序。
 * @param array - 待处理的数组（原地修改）
 */
export function unique<T>(array: T[]): void {
    if (array.length === 0) return;

    let writeIndex = 1;
    for (let readIndex = 1; readIndex < array.length; readIndex++) {
        if (array[readIndex] !== array[readIndex - 1]) {
            array[writeIndex] = array[readIndex];
            writeIndex++;
        }
    }

    array.length = writeIndex;
}

/**
 * 对数组进行去重。不会修改原数组。
 * @param array 待去重的数组
 * @returns 新的已经去重的数组
 */
export function toUnique<T>(array: T[]) {
    return [...new Set(array)];
}

export function isEqualDeep(obj1: unknown, obj2: unknown, ignoreArrayOrders = false) {
    // Check if types are different
    if (typeof obj1 !== typeof obj2) {
        return false;
    }

    // For non-object types, use strict equality
    if (obj1 === null || obj2 === null || typeof obj1 !== "object" || typeof obj2 !== "object") {
        return obj1 === obj2;
    }

    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) {
            return false;
        }

        if (ignoreArrayOrders) {
            // For ignoring order, we need to check if every element in obj1
            // exists in obj2, and vice versa
            const obj2Copy = [...obj2];
            for (const item of obj1) {
                const index = obj2Copy.findIndex((obj2Item) => isEqualDeep(item, obj2Item, ignoreArrayOrders));
                if (index === -1) {
                    return false;
                }
                obj2Copy.splice(index, 1);
            }
            return true;
        }
        else {
            // Compare elements in order
            for (let i = 0; i < obj1.length; i++) {
                if (!isEqualDeep(obj1[i], obj2[i], ignoreArrayOrders)) {
                    return false;
                }
            }
            return true;
        }
    }

    // If one is array and other is not
    if (Array.isArray(obj1) || Array.isArray(obj2)) {
        return false;
    }

    // Handle objects
    const obj1AsRecord = obj1 as Record<string, unknown>;
    const obj2AsRecord = obj2 as Record<string, unknown>;

    const keys1 = Object.keys(obj1AsRecord);
    const keys2 = Object.keys(obj2AsRecord);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!(key in obj2AsRecord)) {
            return false;
        }

        if (!isEqualDeep(obj1AsRecord[key], obj2AsRecord[key], ignoreArrayOrders)) {
            return false;
        }
    }

    return true;
}

export function syncToAsync<A extends unknown[], R>(func: (...args: A) => R) {
    return function (...args: A) {
        return new Promise<R>((resolve, reject) => {
            try {
                resolve(func(...args));
            }
            catch (error) {
                reject(error);
            }
        });
    };
}

/** 让操作对象像操作数组一样 */
export class ArrayedObject<K extends string | number | symbol, V> {
    object: Record<K, V>;

    /** 返回原始对象 */
    toObject(): Record<K, V> {
        return this.object;
    }
    constructor(object: Record<K, V>) {
        this.object = { ...object };
    }

    /**
     * 把对象中的值进行映射
     * @param mapFunc 映射函数
     * @returns ArrayedObject \{ k: f(v) | (k, v) ∈ A \}
     */
    map<M>(mapFunc: (key: K, value: V) => M): ArrayedObject<K, M> {
        return ArrayedObject.fromEntries(this.entries().map(([key, value]) => [key, mapFunc(key, value)]));
    }

    /**
     * 筛选对象中的键值
     * @param filterFunc 筛选函数
     * @returns ArrayedObject \{ k: v | (k, v) ∈ A, f(k, v) \}
     */
    filter(filterFunc: (key: K, value: V) => boolean): ArrayedObject<K, V> {
        return ArrayedObject.fromEntries(this.entries().filter(([key, value]) => filterFunc(key, value)));
    }

    /**
     * 判断对象中的所有键值是否都满足给定的函数
     * @param filterFunc 判断函数
     * @returns ∀(k, v) ∈ A, f(k, v)
     */
    every(filterFunc: (key: K, value: V) => boolean) {
        return this.entries().every(([key, value]) => filterFunc(key, value));
    }

    /**
     * 判断对象中是否存在键值满足给定的函数
     * @param filterFunc 判断函数
     * @returns ∃(k, v) ∈ A, f(k, v)
     */
    some(filterFunc: (key: K, value: V) => boolean) {
        return this.entries().some(([key, value]) => filterFunc(key, value));
    }

    keys(): K[] {
        return Object.keys(this.object) as K[];
    }

    values(): V[] {
        return Object.values(this.object) as V[];
    }

    entries(): [K, V][] {
        return Object.entries(this.object) as [K, V][];
    }
    find(predicate: (key: K, value: V) => boolean): V | undefined {
        for (const [key, value] of this.entries()) {
            if (predicate(key, value)) {
                return value;
            }
        }
        return undefined;
    }
    forEach(callback: (key: K, value: V, index: number) => void): void {
        let index = 0;
        for (const [key, value] of this.entries()) {
            callback(key, value, index++);
        }
    }
    reduce<M>(callback: (accumulator: M, key: K, value: V) => M, initialValue: M): M {
        let accumulator = initialValue;
        for (const [key, value] of this.entries()) {
            accumulator = callback(accumulator, key, value);
        }
        return accumulator;
    }
    has(key: K): boolean {
        return key in this.object;
    }
    get(key: K): V | undefined {
        return this.object[key];
    }
    set(key: K, value: V) {
        this.object[key] = value;
    }

    /** 调试用，链式调用中穿插断点查看对象 */
    // log() {
    //     // 为了防止浏览器 console.log 的特性，需要先复制 this.object 再打印
    //     console.log({ ...this.object });
    //     return this;
    // }

    /** 把值中的所有 Promise 解析为值，并返回一个新的 Promise，链式调用完后需要 await 一下 */
    async waitPromises(): Promise<ArrayedObject<K, Awaited<V>>> {
        const entries: [K, Awaited<V>][] = [];
        for (const [key, value] of this.entries()) {
            entries.push([key, await value]);
        }
        return new ArrayedObject(fromEntries(entries));
    }
    static fromEntries<K extends string | number | symbol, V>(entries: [K, V][]): ArrayedObject<K, V> {
        return new ArrayedObject(fromEntries(entries));
    }
}

/** 与 Object.fromEntries 相同，只是做了一下类型标注 */
export function fromEntries<K extends string | number | symbol, V>(entries: [K, V][]): Record<K, V> {
    return Object.fromEntries(entries) as Record<K, V>;
}

export function useless(...args: unknown[]) {
    if (args) {
        return;
    }
    return;
}