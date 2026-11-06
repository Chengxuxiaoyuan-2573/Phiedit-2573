/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { dialog } from "electron";
import Manager from "../renderer/abstract";

class DialogManager extends Manager {
    async showOpenDialog(dialogOptions: OpenDialogOptions) {
        const properties: Array<"openFile" | "multiSelections" | "openDirectory" | "createDirectory"> = [];

        // 如果是要选择文件夹，就不能选择文件
        if (dialogOptions.directory) {
            properties.push("openDirectory");
            properties.push("createDirectory");
        }
        else {
            properties.push("openFile");

            // 如果允许多选，则添加 multiSelections 属性
            if (dialogOptions.multiple) {
                properties.push("multiSelections");
            }
        }

        const result = await dialog.showOpenDialog({
            title: dialogOptions.title,
            defaultPath: dialogOptions.defaultPath,
            properties,
            filters: dialogOptions.filters,
        });
        if (result.canceled) {
            return null;
        }
        return result.filePaths;
    }
    async showSaveDialog(dialogOptions: SaveDialogOptions) {
        const result = await dialog.showSaveDialog({
            title: dialogOptions.title,
            defaultPath: dialogOptions.defaultPath,
            filters: dialogOptions.filters,
        });
        if (result.canceled) {
            return null;
        }
        return result.filePath;
    }
}
interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    multiple?: boolean;

    /** 为 true 时选择的是文件夹而不是文件 */
    directory?: boolean;
    filters?: {
        name: string;
        extensions: string[];
    }[]
}
interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    filters?: {
        name: string;
        extensions: string[];
    }[]
}
export default new DialogManager();