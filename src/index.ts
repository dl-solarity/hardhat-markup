import "./type-extensions.js";

import type { SolidityConfig } from "hardhat/types/config";
import type { HardhatPlugin } from "hardhat/types/plugins";

import { overrideTask } from "hardhat/config";

import { HardhatPluginError } from "@nomicfoundation/hardhat-errors";

import markupTask from "./internal/tasks/markup/index.js";

import { PLUGIN_ID } from "./constants.js";
import { Generator } from "./generator/Generator.js";

const hardhatPlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  hookHandlers: {
    config: () => import("./internal/hook-handlers/config.js"),
  },
  tasks: [
    markupTask,
    overrideTask("compile")
      .setAction(async () => ({
        default: async (args, hre, runSuper) => {
          const solidityConfig = hre.config.solidity as SolidityConfig & { compilers: any[] };

          if (!solidityConfig.compilers) {
            solidityConfig.compilers = [];
          }

          for (const compiler of solidityConfig.compilers) {
            compiler.settings ??= {};
            compiler.settings.outputSelection ??= { "*": { "*": [] } };
            compiler.settings.outputSelection["*"] ??= {};
            compiler.settings.outputSelection["*"]["*"] ??= [];

            const sel = compiler.settings.outputSelection["*"]["*"];
            if (!sel.includes("devdoc")) sel.push("devdoc");
            if (!sel.includes("userdoc")) sel.push("userdoc");
          }

          hre.config.solidity = solidityConfig;

          return runSuper(args);
        },
      }))
      .build(),
    overrideTask("clean")
      .setAction(async () => ({
        default: async (args, hre, runSuper) => {
          if (!args.global)
            try {
              await new Generator(hre).clean();
            } catch (e: any) {
              throw new HardhatPluginError(PLUGIN_ID, "Failed to remove markup artifacts", e);
            }

          await runSuper(args);
        },
      }))
      .build(),
  ],
  npmPackage: "@solarity/hardhat-markup",
} satisfies HardhatPlugin;

export default hardhatPlugin;
