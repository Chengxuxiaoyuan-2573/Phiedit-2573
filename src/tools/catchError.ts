/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { ElMessage, ElMessageBox } from "element-plus";
export function createCatchErrorByMessage<T extends unknown[]>(func: (...args: T) => Promise<unknown> | unknown, operationName?: string, hintWhenSucceeded = true) {
    function _getErrorMessage(error: unknown) {
        if (error instanceof Error) {
            return error.message;
        }
        else {
            return String(error);
        }
    }

    function _getMessage(isSucceeded: boolean, operationName: string | undefined, result: unknown) {
        if (operationName === undefined) {
            if (result !== undefined && result !== null) {
                return isSucceeded ? result : _getErrorMessage(result);
            }
            return isSucceeded ? "成功" : "失败";
        }
        else {
            if (result !== undefined && result !== null) {
                return isSucceeded ? `${operationName}成功: ${result}` : `${operationName}失败: ${_getErrorMessage(result)}`;
            }
            return isSucceeded ? `${operationName}成功` : `${operationName}失败`;
        }
    }

    return async function (...args: T) {
        try {
            const result = await func(...args);
            if (hintWhenSucceeded) {
                ElMessage.success(_getMessage(true, operationName, result));
            }
        }
        catch (err) {
            ElMessage.error(_getMessage(false, operationName, err));
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
