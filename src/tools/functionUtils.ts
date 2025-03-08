export default class FunctionUtils {
    static merge(...funcs: (()=>unknown)[]){
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
    static pipe(...funcs: Func<anything,anything>[]):Func<anything,anything>;
    static pipe(...funcs: ((arg:unknown)=>unknown)[]){
        return (firstArg: unknown)=>{
            let arg = firstArg;
            for (const func of funcs) {
                arg = func(arg);
            }
            return arg;
        }
    }
}
type Func<A,B>  = (arg:A)=>B;
type anything = ReturnType<typeof JSON.parse>;