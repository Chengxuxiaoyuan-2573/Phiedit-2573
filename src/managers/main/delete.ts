/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import chartListManager from "./chartList";
import filesManager from "./files";
import fs from "fs";

class DeleteManager {
    async permantlyDelete(chartId: string) {
        const chartPath = filesManager.getChartPath(chartId);
        if (fs.existsSync(chartPath)) {
            await fs.promises.rmdir(chartPath, { recursive: true });
            chartListManager.deleteIdFromChartList(chartId);
        }
        else {
            throw new Error("删除谱面：路径不存在");
        }
    }
}
export default new DeleteManager();