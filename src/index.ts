const Generator = require("./generator/generator");

import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { extendConfig, task, types } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import "./type-extensions";
import { getDefaultMarkupConfig } from "./config";
import { TASK_MARKUP, pluginName } from "./constants";
import { ActionType } from "hardhat/types";

interface BindingArgs {
  output?: string;
  only?: string;
  compile: boolean;
}

extendConfig(getDefaultMarkupConfig);

const markup: ActionType<BindingArgs> = async ({ output, only, compile }, hre) => {
  hre.config.markup.outdir = output === undefined ? hre.config.markup.outdir : output;
  hre.config.markup.only = only === undefined ? hre.config.markup.only : only;

  if (compile) {
    await hre.run(TASK_COMPILE, { generateBind: false });
  }

  try {
    await new Generator(hre).generateAll();
  } catch (e: any) {
    throw new NomicLabsHardhatPluginError(pluginName, e.message);
  }

  console.log(`\nMarkups generated`);
};

task(TASK_MARKUP, "Generate markups for compiled contracts")
  .addOptionalParam("outdir", "Output directory for generated markups", undefined, types.string)
  .addOptionalParam("only", "File name", undefined, types.string)
  .addFlag("compile", "Compile smart contracts before the generation")
  .setAction(markup);

task(TASK_COMPILE).setAction(async function (args, hre, runSuper) {
  for (let compiler of hre.config.solidity.compilers) {
    compiler.settings.outputSelection["*"]["*"].push("devdoc");
    compiler.settings.outputSelection["*"]["*"].push("userdoc");
  }

  await runSuper();
});
