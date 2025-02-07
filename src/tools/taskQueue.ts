export class TaskQueue<T, M extends number = number> {
    _tasks: {
        task: () => T,
        priority: M
    }[];
    _isRunning: boolean;
    constructor() {
        this._tasks = [];
        this._isRunning = false;
    }
    _findInsertPosition(priority: M) {
        let left = 0;
        let right = this._tasks.length;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this._tasks[mid].priority < priority) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left;
    }

    // 添加任务，优先级可以是任意数字，数字越小优先级越高  
    addTask(taskFunction: () => T, priority: M) {
        if (this._isRunning) {
            throw new Error("Cannot add tasks after run method has been called.");
        }
        const position = this._findInsertPosition(priority);
        this._tasks.splice(position, 0, { task: taskFunction, priority });
    }

    run() {
        if (this._isRunning) {
            throw new Error("Task queue is already running.");
        }
        this._isRunning = true;
        const returns: T[] = [];
        this._tasks.forEach(task => {
            try {
                returns.push(task.task());
            } catch (error) {
                console.error("Error: ")
                console.error(error);
            }
        });
        return returns;
    }
}