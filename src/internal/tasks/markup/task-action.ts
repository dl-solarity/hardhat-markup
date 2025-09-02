import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { HardhatPluginError } from "@nomicfoundation/hardhat-errors";

import type { DlMarkupArgs } from "./types.js";

import { Generator } from "../../../generator/Generator.js";
import { PLUGIN_ID } from "../../../constants.js";

const verifyEtherscanAction: NewTaskActionFunction<DlMarkupArgs> = async (
  { outdir, noCompile, markupVerbose },
  hre,
) => {
  hre.config.markup.outdir = outdir === undefined ? hre.config.markup.outdir : outdir;
  hre.config.markup.noCompile = !noCompile ? hre.config.markup.noCompile : noCompile;
  hre.config.markup.verbose = !markupVerbose ? hre.config.markup.verbose : markupVerbose;

  if (!hre.config.markup.noCompile) {
    await hre.tasks.getTask("compile").run({
      quiet: true,
      defaultBuildProfile: "production",
    });
  }

  try {
    const contracts = await new Generator(hre).generate();

    console.log(`\nGenerated markups for ${contracts.length} contracts`);
  } catch (e: any) {
    throw new HardhatPluginError(PLUGIN_ID, `Failed to generate markups: ${e.message}`, e);
  }
};

export default verifyEtherscanAction;
