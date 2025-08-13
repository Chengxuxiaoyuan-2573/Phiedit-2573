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
            if (/^[\^()+\-*/]$/.test(char)) {
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
            while (index < tokens.length && /^[*/]$/.test(tokens[index])) {
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
            if (tokens[index] === '(') {
                index++;
                const expr = parse1();
                if (index >= tokens.length || tokens[index] !== ')') throw new Error('括号不匹配');
                index++;
                return expr;
            }
            if (numberRegex.test(tokens[index])) {
                return new Literal(Number(tokens[index++]));
            }
            if (variableRegex.test(tokens[index])) {
                const id = tokens[index++];
                if (tokens[index] === '(') {
                    index++;
                    const args = [];
                    while (tokens[index] !== ')') {
                        args.push(parse1());
                        if (index < tokens.length && tokens[index] === ',') index++;
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
            if (typeof value !== 'number') throw new Error(`变量 ${node.name} 不是数字`);
            return value;
        }
        if (node instanceof BinaryExpression) {
            const left = this.evaluate(node.left);
            const right = this.evaluate(node.right);
            switch (node.op) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '^': return left ** right;
                default: throw new Error(`未知运算符: ${node.op}`);
            }
        }
        if (node instanceof CallExpression) {
            const func = this.functions[node.callee];
            if (typeof func !== 'function') throw new Error(`${node.callee} 不是函数`);
            return func(...node.arguments.map(arg => this.evaluate(arg)));
        }
        if (node instanceof UnaryExpression) {
            const arg = this.evaluate(node.argument);
            return node.op === '-' ? -arg : +arg;
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
// export function max<T>(arr: T[], compare: (a: T, b: T) => number) {
//     return arr.reduce((max, current) => compare(current, max) > 0 ? current : max, arr[0]);
// }
// export function min<T>(arr: T[], compare: (a: T, b: T) => number) {
//     return arr.reduce((min, current) => compare(current, min) < 0 ? current : min, arr[0]);
// }
export function formatData(bytes: number, p = 2) {
    return format(['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'], 1024, bytes, p)
}
// export function formatTime(seconds: number) {
//     const min = Math.floor(seconds / 60).toString().padStart(2, '0');
//     const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
//     return `${min}:${sec}`;
// }
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