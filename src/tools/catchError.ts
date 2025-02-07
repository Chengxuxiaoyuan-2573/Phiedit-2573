import { ElMessage } from 'element-plus';
export function catchError(func: () => void, s: string) {
    try {
        func();
        ElMessage.success(`${s}成功`);
    }
    catch (err) {
        console.error(err)
        ElMessage.error(`${s}失败：${err}`);
    }
}