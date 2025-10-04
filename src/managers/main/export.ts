/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "../renderer/abstract";
import filesManager from "./files";
import fs from "fs";

class ExportChartManager extends Manager {
    private async packageChartFolderToZip(chartId: string) {
        const folderPath = filesManager.getChartPath(chartId);
        return filesManager.packageFolderToZip(folderPath);
    }
    async export(chartId: string, targetPath: string) {
        const data = await this.packageChartFolderToZip(chartId);
        await fs.promises.writeFile(targetPath, data);
    }
}
export default new ExportChartManager();