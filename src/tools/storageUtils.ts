export default {
    get(key: string) {
        return localStorage.getItem(key);
    },
    set(key: string, value: object) {
        const str = JSON.stringify(value);
        localStorage.setItem(key, str);
    },
    remove(key: string) {
        localStorage.removeItem(key);
    },
}
