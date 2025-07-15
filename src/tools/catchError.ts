import { ElMessage, ElMessageBox } from 'element-plus';
export function createCatchErrorByMessage<T extends unknown[]>(func: (...args: T) => void, operationName: string = '') {
    return function (...args: T) {
        try {
            func(...args);
            ElMessage.success(`${operationName}成功`);
        }
        catch (err) {
            if (err instanceof Error) {
                ElMessage.error(`${operationName}失败：${err.message}`);
            }
            else {
                ElMessage.error(`${operationName}失败：${err}`);
            }
        }
    }
}
export function catchErrorByMessage(func: () => void, operationName: string = '') {
    createCatchErrorByMessage(func, operationName)();
}
export async function confirm(func: () => void, operationName: string = '') {
    try {
        await ElMessageBox.confirm(`确定要${operationName}吗？`);
        catchErrorByMessage(func, operationName);
    } catch {
        ElMessage.info(`${operationName}已取消`);
    }
}
