/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Manager from "../renderer/abstract";
import fs from "fs";
import { app } from "electron";
import path from "path";
import Constants from "@/constants";

class SettingsManager extends Manager {
    /** 设置文件的文件，绝对路径 */
    private readonly settingsFile: string;

    constructor() {
        super();
        const userDataDir = app.getPath("userData");
        this.settingsFile = path.join(userDataDir, "settings.json");
    }

    saveSettings(settings: object) {
        return fs.promises.writeFile(this.settingsFile, JSON.stringify(settings));
    }

    async readSettings(): Promise<object> {
        const text = await fs.promises.readFile(this.settingsFile, Constants.ENCODING);
        try {
            return JSON.parse(text);
        }
        catch {
            return {};
        }
    }
}
export default new SettingsManager();