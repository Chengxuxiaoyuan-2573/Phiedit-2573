/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import { app } from "electron";
import path from "path";

// 固定用户数据目录为 phiedit2573，避免项目改名为 openphi 后旧的谱面数据丢失。
// 本模块必须在其他 manager 之前被导入，因为它们在模块加载时就会读取 app.getPath("userData")。
app.setPath("userData", path.join(app.getPath("appData"), "phiedit2573"));
