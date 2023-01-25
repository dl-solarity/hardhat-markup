import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { ConfigExtender } from "hardhat/types";
import { isAbsolute } from "path";
import { pluginName } from "./constants";
import { DlMarkupConfig } from "./types";

export const getDefaultMarkupConfig: ConfigExtender = (resolvedConfig, config) => {
  const defaultConfig: DlMarkupConfig = {
    outdir: "./generated-markups",
    onlyFiles: [],
    skipFiles: [],
    noCompile: false,
    verbose: false,
  };

  if (config.markup === undefined) {
    resolvedConfig.markup = defaultConfig;
    return;
  }

  if (!areRelativePaths(config.markup.onlyFiles)) {
    throw new NomicLabsHardhatPluginError(pluginName, "config.markup.onlyFiles must only include relative paths");
  }

  if (!areRelativePaths(config.markup.skipFiles)) {
    throw new NomicLabsHardhatPluginError(pluginName, "config.markup.skipFiles must only include relative paths");
  }

  const { cloneDeep } = require("lodash");
  const customConfig = cloneDeep(config.markup);
  resolvedConfig.markup = { ...defaultConfig, ...customConfig };
};

const areRelativePaths = (array?: string[]): boolean => array === undefined || array.every((p) => !isAbsolute(p));
