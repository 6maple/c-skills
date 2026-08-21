import { createJiti } from "../../../../pi-mp/node_modules/.pnpm/jiti@2.7.0/node_modules/jiti/lib/jiti.mjs";

const jiti = createJiti(import.meta.url, {
  "interopDefault": true,
  "alias": {
    "@dsh-external/brain-dsh-plugin": "D:/Workspace/ai-projects/c-skills/code/brain-dsh-plugin"
  },
  "transformOptions": {
    "babel": {
      "plugins": []
    }
  }
})

/** @type {import("D:/Workspace/ai-projects/c-skills/code/brain-dsh-plugin/src/index.js")} */
const _module = await jiti.import("D:/Workspace/ai-projects/c-skills/code/brain-dsh-plugin/src/index.ts");

export const name = _module.name;
export const inject = _module.inject;
export const Config = _module.Config;
export const resolveProjectRoot = _module.resolveProjectRoot;
export const apply = _module.apply;
export const InstanceManager = _module.InstanceManager;
export const BRAIN_TOOLS = _module.BRAIN_TOOLS;
export const extractText = _module.extractText;