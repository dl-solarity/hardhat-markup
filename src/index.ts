import { Generator } from "./generator/Generator";

import { TASK_CLEAN, TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { extendConfig, task, types } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { ActionType } from "hardhat/types";
import { getDefaultMarkupConfig } from "./config";
import { pluginName, TASK_MARKUP } from "./constants";
import "./type-extensions";

interface MarkupArgs {
  outdir?: string;
  markupVerbose?: boolean;
  noCompile?: boolean;
}

extendConfig(getDefaultMarkupConfig);

const markup: ActionType<MarkupArgs> = async ({ outdir, markupVerbose, noCompile }, hre) => {
  hre.config.markup.outdir = outdir === undefined ? hre.config.markup.outdir : outdir;
  hre.config.markup.noCompile = !noCompile ? hre.config.markup.noCompile : noCompile;
  hre.config.markup.verbose = !markupVerbose ? hre.config.markup.verbose : markupVerbose;

  if (!hre.config.markup.noCompile) {
    await hre.run(TASK_COMPILE);
  }

  try {
    const contracts = await new Generator(hre).generate();

    console.log(`\nGenerated markups for ${contracts.length} contracts`);
  } catch (e: any) {
    throw new NomicLabsHardhatPluginError(pluginName, e.message);
  }
};

task(TASK_MARKUP, "Generate markups for compiled contracts")
  .addOptionalParam("outdir", "Output directory for generated markups", undefined, types.string)
  .addFlag("noCompile", "Disables contract compilation before generation")
  .addFlag("markupVerbose", "Enables Hardhat-markup verbose logging")
  .setAction(markup);

task(TASK_COMPILE).setAction(async function (args, hre, runSuper) {
  for (let compiler of hre.config.solidity.compilers) {
    compiler.settings.outputSelection["*"]["*"].push("devdoc");
    compiler.settings.outputSelection["*"]["*"].push("userdoc");
  }

  await runSuper();
});

task(TASK_CLEAN, "Clears the cache and deletes all artifacts").setAction(
  async ({ global }: { global: boolean }, hre, runSuper) => {
    if (!global)
      try {
        await new Generator(hre).clean();
      } catch (e: any) {
        throw new NomicLabsHardhatPluginError(pluginName, e.message);
      }

    await runSuper();
  }
);
