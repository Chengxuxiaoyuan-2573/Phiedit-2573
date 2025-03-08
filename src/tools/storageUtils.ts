abstract class Storage {
    abstract get<T>(key: string, defaultValue: null): T | null;
    abstract get<T>(key: string, defaultValue: T): T;
    abstract set(key: string, value: unknown): void;
}
export class LocalStorage extends Storage {
    get<T>(key: string, defaultValue: null): T | null;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue: T | null = null): T | null {
        const value = localStorage.getItem(key);
        if(value == null) return defaultValue;
        else return JSON.parse(value);
    }
    set<T>(key: string, value: T) {
        const str = JSON.stringify(value);
        localStorage.setItem(key, str);
    }
    remove(key: string) {
        localStorage.removeItem(key);
    }
}
/*
export class BackendStorage extends Storage {
    readonly apiUrl: string;

    constructor(apiUrl: string) {
        super();
        this.apiUrl = apiUrl;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const res = await fetch(`${this.apiUrl}?key=${key}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const json = await res.json();
            return json as T;
        } catch (error) {
            console.error('Failed to fetch data:', error);
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            const res = await fetch(`${this.apiUrl}?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value),
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const json = await res.json();
            return json.success || false;
        } catch (error) {
            console.error('Failed to set data:', error);
            return false;
        }
    }
}
*/