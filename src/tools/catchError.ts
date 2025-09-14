import { ElMessage, ElMessageBox } from "element-plus";
export function createCatchErrorByMessage<T extends unknown[]>(func: (...args: T) => Promise<unknown> | unknown, operationName: string, hintWhenSucceeded = true) {
    return async function (...args: T) {
        try {
            const result = await func(...args);
            if (hintWhenSucceeded) {
                if (result !== undefined && result !== null) {
                    ElMessage.success(`${operationName}成功：${result}`);
                }
                else {
                    ElMessage.success(`${operationName}成功`);
                }
            }
        }
        catch (err) {
            if (err instanceof Error) {
                ElMessage.error(`${operationName}失败：${err.message}`);
            }
            else {
                ElMessage.error(`${operationName}失败：${err}`);
            }
        }
    };
}
export async function catchErrorByMessage(func: () => void, operationName: string = "", hintWhenSucceeded = true) {
    await createCatchErrorByMessage(func, operationName, hintWhenSucceeded)();
}
export async function confirm(func: () => void, message: string, operationName: string) {
    try {
        await ElMessageBox.confirm(message, {
            title: operationName,
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });
        await catchErrorByMessage(func, operationName);
    }
    catch {
        // ElMessage.info(`${operationName}已取消`);
    }
}
