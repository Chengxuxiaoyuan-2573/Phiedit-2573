import { ElMessage, ElMessageBox } from 'element-plus';
export function createCatchErrorByMessage<T extends unknown[]>(func: (...args: T) => Promise<void> | void, operationName: string) {
    return async function (...args: T) {
        try {
            await func(...args);
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
export async function catchErrorByMessage(func: () => void, operationName: string = '') {
    await createCatchErrorByMessage(func, operationName)();
}
export async function confirm(func: () => void, message: string, operationName: string) {
    try {
        await ElMessageBox.confirm(message, {
            title: operationName,
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        await catchErrorByMessage(func, operationName);
    } catch {
        // ElMessage.info(`${operationName}已取消`);
    }
}
