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
export function calculateExpression(expr: string, context: Record<string, number>, functions: Record<string, (...args: number[]) => number>) {
    // 词法分析：拆分运算符、变量、数字、括号
    const tokens = tokenize(expr);
    // 语法分析：生成抽象语法树 (AST)
    const ast = parse(tokens);
    // 递归求值AST
    return evaluate(ast, context, functions);
}
// 工具函数：分解表达式为词法单元
function tokenize(expr: string) {
    const tokens: string[] = [];
    let index = 0;

    while (index < expr.length) {
        const char = expr[index];

        if (/\s/.test(char)) { // 跳过空格
            index++;
            continue;
        }

        // 匹配数字（包括科学计数法）
        const numMatch = expr.slice(index).match(/^-?\d+(\.\d+)?([eE][-+]?\d+)?/);
        if (numMatch) {
            tokens.push(numMatch[0]);
            index += numMatch[0].length;
            continue;
        }

        // 匹配变量名或函数名
        const idMatch = expr.slice(index).match(/^[a-zA-Z_$][\w$]*/);
        if (idMatch) {
            tokens.push(idMatch[0]);
            index += idMatch[0].length;
            continue;
        }

        if (/^[\^()+\-*/]$/.test(char)) { // 运算符或括号
            tokens.push(char);
            index++;
            continue;
        }


        throw new Error(`无法解析的符号: ${char}`);
    }

    console.log(tokens);
    return tokens;
}
// 语法分析：生成AST（递归下降解析）
function parse(tokens: string[]) {
    let index = 0;
    /** 解析加法和减法表达式 */
    function parse1(): AstNode {
        let left = parse2();
        while (index < tokens.length && /^[+-]$/.test(tokens[index])) {
            const op = tokens[index++];
            const right = parse2();
            left = new BinaryExpression(op, left, right);
        }
        return left;
    }

    /** 解析乘法和除法表达式 */
    function parse2(): AstNode {
        let left = parse3();
        while (index < tokens.length && /^[*/]$/.test(tokens[index])) {
            const op = tokens[index++];
            const right = parse3();
            left = new BinaryExpression(op, left, right);
        }
        return left;
    }

    /** 解析幂运算表达式 */
    function parse3(): AstNode {
        let left = parse4();
        while (index < tokens.length && /^\^$/.test(tokens[index])) {
            const op = tokens[index++];
            const right = parse3();
            left = new BinaryExpression(op, left, right);
        }
        return left;
    }
    /** 解析括号内的表达式、数字和变量 */
    function parse4(): AstNode {
        if (tokens[index] === '(') {
            index++;
            const expr = parse1();
            if (tokens[index++] !== ')') throw new Error('括号不匹配');
            return expr;
        }
        if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(tokens[index])) { // 数字
            return new Literal(Number(tokens[index++]));
        }
        if (/^[a-zA-Z_$][\w$]*$/.test(tokens[index])) { // 变量或函数
            const id = tokens[index++];
            if (tokens[index] === '(') { // 函数调用
                index++;
                const args = [];
                while (tokens[index] !== ')') {
                    args.push(parse1());
                    if (index < tokens.length && tokens[index] === ',') {
                        index++;
                    } 
                    // 如果索引超出范围或者下一个字符不是逗号或者右括号，则抛出错误
                    if (index >= tokens.length || tokens[index] !== ')' && tokens[index] !== ',') {
                        throw new Error(`括号不匹配`);
                    }
                }
                index++;
                return new CallExpression(id, args);
            }
            return new Identifier(id); // 变量
        }
        if (/^[+-]$/.test(tokens[index])) {
            return new UnaryExpression(tokens[index++], parse4());
        }
        throw new Error(`无法解析的符号: ${tokens[index]}`);
    }

    return parse1();
}

// AST求值
function evaluate(node: AstNode, variables: Record<string, number>, functions: Record<string, (...args: number[]) => number>): number {
    if (node instanceof Literal) {
        return node.value;
    }
    else if (node instanceof Identifier) {
        if (variables[node.name] === undefined) {
            throw new Error(`变量 ${node.name} 未定义`);
        }
        if (typeof variables[node.name] !== 'number') {
            throw new Error(`变量 ${node.name} 不是数字`);
        }
        return variables[node.name];
    }
    else if (node instanceof BinaryExpression) {
        const left = evaluate(node.left, variables, functions);
        const right = evaluate(node.right, variables, functions);
        switch (node.op) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '^': return left ** right;
            default: throw new Error(`未知运算符: ${node.op}`);
        }
    }
    else if (node instanceof CallExpression) {
        const func = functions[node.callee];
        if (typeof func !== 'function') {
            throw new Error(`${node.callee} 不是函数`);
        }
        const args = node.arguments.map(arg => evaluate(arg, variables, functions));
        return func(...args);
    }
    else if (node instanceof UnaryExpression) {
        const argument = evaluate(node.argument, variables, functions);
        switch (node.op) {
            case '+': return +argument;
            case '-': return -argument;
            default: throw new Error(`未知运算符: ${node.op}`);
        }
    }
    else {
        throw new Error(`未知节点类型: ${node.type}`);
    }
}
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
export function max<T>(arr: T[], compare: (a: T, b: T) => number) {
    return arr.reduce((max, current) => compare(current, max) > 0 ? current : max, arr[0]);
}
export function min<T>(arr: T[], compare: (a: T, b: T) => number) {
    return arr.reduce((min, current) => compare(current, min) < 0 ? current : min, arr[0]);
}
export function formatData(bytes: number, p = 2) {
    return format(['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'], 1024, bytes, p)
}
export function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
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