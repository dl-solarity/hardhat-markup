import { ConfigExtender } from "hardhat/types";

export const getDefaultMarkupConfig: ConfigExtender = (resolvedConfig, config) => {
  const defaultConfig = {
    outdir: "./generated-markups",
    only: "",
    runOnCompile: false,
    onlyFiles: [],
    skipFiles: [],
  };

  if (config.markup === undefined) {
    resolvedConfig.markup = defaultConfig;
    return;
  }

  const { cloneDeep } = require("lodash");
  const customConfig = cloneDeep(config.markup);
  resolvedConfig.markup = { ...defaultConfig, ...customConfig };
};
