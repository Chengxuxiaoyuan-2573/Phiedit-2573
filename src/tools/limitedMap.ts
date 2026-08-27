/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

export default class LimitedMap<K, V> extends Map<K, V> {
    limit: number;

    constructor(limit: number) {
        super();
        this.limit = limit;
    }

    set(key: K, value: V) {
        // 如果当前大小已达上限，且要设置的键尚不存在
        if (this.size >= this.limit && !this.has(key)) {
            // 删除最早插入的键（即迭代器的第一个键）
            const firstKey = this.keys().next().value;
            if (firstKey !== undefined) {
                this.delete(firstKey);
            }
        }

        // 调用父类的 set 方法添加/更新值
        return super.set(key, value);
    }
}