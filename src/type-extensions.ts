import "hardhat/types/config";
import { DlMarkupConfig, DlMarkupUserConfig } from "./types";

declare module "hardhat/types/config" {
  interface HardhatConfig {
    markup: DlMarkupConfig;
  }

  interface HardhatUserConfig {
    markup?: DlMarkupUserConfig;
  }
}
