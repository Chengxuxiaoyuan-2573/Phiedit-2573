import { Reactive } from 'vue';
export default abstract class Effect {
    abstract options: Reactive<Record<string, unknown>>;
    abstract generate(): void;
}