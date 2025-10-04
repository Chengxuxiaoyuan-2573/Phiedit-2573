/**
 * @license MIT
 * Copyright © 2025 程序小袁_2573. All rights reserved.
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 */

import Constants from "@/constants";
import Manager from "../renderer/abstract";
import filesManager from "./files";
import fs from "fs";

class ShaderLoader extends Manager {
    async loadShaderFile(shaderName: string) {
        const vshPath = filesManager.getResourcePath("shaders", `default.vsh`);
        const fshPath = filesManager.getResourcePath("shaders", `${shaderName}.glsl`);
        const vsh = await fs.promises.readFile(vshPath, Constants.ENCODING)
            .catch(() => null);
        const fsh = await fs.promises.readFile(fshPath, Constants.ENCODING)
            .catch(() => null);
        return { vsh, fsh };
    }
}
export default new ShaderLoader();