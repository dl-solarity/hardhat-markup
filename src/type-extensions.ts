import "hardhat/types/config";

import { DlMarkupConfig, DlMarkupUserConfig } from "./types.js";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    markup?: DlMarkupUserConfig;
  }

  export interface HardhatConfig {
    markup: DlMarkupConfig;
  }
}
