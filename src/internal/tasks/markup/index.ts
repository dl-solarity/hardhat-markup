import { ArgumentType } from "hardhat/types/arguments";
import type { NewTaskDefinition } from "hardhat/types/tasks";

import { task } from "hardhat/config";

const markupTask: NewTaskDefinition = task(["markup"], "Generate markups for compiled contracts")
  .addOption({
    name: "outdir",
    type: ArgumentType.STRING_WITHOUT_DEFAULT,
    description: "Output directory for generated markups",
    defaultValue: "./generated-markups",
  })
  .addFlag({
    name: "noCompile",
    description: "Disables contract compilation before generation",
  })
  .addFlag({
    name: "markupVerbose",
    description: "Enables Hardhat-markup verbose logging",
  })
  .setAction(() => import("./task-action.ts"))
  .build();

export default markupTask;
