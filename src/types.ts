export interface DlMarkupConfig {
  outdir: string;
  only: string;
  runOnCompile: boolean;
  onlyFiles: string[];
  skipFiles: string[];
}

export interface DlMarkupUserConfig extends Partial<DlMarkupConfig> {}
