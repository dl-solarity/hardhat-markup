import "hardhat/types/config";

import { DlMarkupConfig, DlMarkupUserConfig } from "./types.js";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    markup?: DlMarkupUserConfig;
  }

  interface HardhatConfig {
    markup: DlMarkupConfig;
  }
}
