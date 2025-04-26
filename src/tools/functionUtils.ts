export default class FunctionUtils {
    static merge(...funcs: (() => unknown)[]) {
        return () => {
            const returns = [];
            for (const func of funcs) {
                returns.push(func());
            }
            return returns;
        }
    }
    static pipe<T, U>(fn1: Func<T, U>): Func<T, U>;
    static pipe<T, U, V>(fn1: Func<T, U>, fn2: Func<U, V>): Func<T, V>;
    static pipe<T, U, V, W>(fn1: Func<T, U>, fn2: Func<U, V>, fn3: Func<V, W>): Func<T, W>;
    static pipe<T, U, V, W, X>(fn1: Func<T, U>, fn2: Func<U, V>, fn3: Func<V, W>, fn4: Func<W, X>): Func<T, X>;
    static pipe<T, U, V, W, X, Y>(fn1: Func<T, U>, fn2: Func<U, V>, fn3: Func<V, W>, fn4: Func<W, X>, fn5: Func<X, Y>): Func<T, Y>;
    static pipe<T, U, V, W, X, Y, Z>(fn1: Func<T, U>, fn2: Func<U, V>, fn3: Func<V, W>, fn4: Func<W, X>, fn5: Func<X, Y>, fn6: Func<Y, Z>): Func<T, Z>;
    static pipe(...funcs: Func<anything, anything>[]): Func<anything, anything>;
    static pipe(...funcs: ((arg: unknown) => unknown)[]) {
        return (firstArg: unknown) => {
            let arg = firstArg;
            for (const func of funcs) {
                arg = func(arg);
            }
            return arg;
        }
    }
}
type Func<A, B> = (arg: A) => B;
type anything = ReturnType<typeof JSON.parse>;
/*
export class ForLoop {
    private readonly context: Record<string, anything> = {};
    constructor(
        readonly expression1: (context: Record<string, anything>) => void,
        readonly expression2: (context: Record<string, anything>) => boolean,
        readonly expression3: (context: Record<string, anything>) => void,
        readonly body: (context: Record<string, anything>) => void,
    ) { }
    init() {
        this.expression1(this.context);
    }
    step() {
        if (this.expression2(this.context)) {
            this.body(this.context);
            this.expression3(this.context);
            return true;
        }
        return false;
    }
    run() {
        for (this.expression1(this.context); this.expression2(this.context); this.expression3(this.context)) {
            this.body(this.context);
        }
    }
    runAsync(mode: "promise" | "timeout" | "requestAnimationFrame" = "timeout") {

        this.init();
        const run = () => {
            if (this.step()) {
                switch (mode) {
                    case "promise":
                        Promise.resolve().then(() => {
                            run();
                        })
                        break;
                    case "timeout":
                        setTimeout(() => {
                            run();
                        }, 0);
                        break;
                    case "requestAnimationFrame":
                        requestAnimationFrame(() => {
                            run();
                        });
                        break;
                }
            }
        }
        run();
    }
}
new ForLoop(
    context => context.i=0,
    context => context.i<10,
    context => context.i++,
    context => console.log(context.i)
).run();
*/