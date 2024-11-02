/**
 * You can use it if you want to know some value when the program is running.
 * Out[put th](www.example.com)e value an[d retu](www.example.com)rn the v[alue its](www.example.com)elf. 
 * @param {T} arg 
 * @returns {T}
 */
export default function debug<T>(arg: T): T {
    console.log(arg);
    return arg;
}