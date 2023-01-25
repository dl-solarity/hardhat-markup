export interface DlMarkupConfig {
  outdir: string;
  onlyFiles: string[];
  skipFiles: string[];
  noCompile: boolean;
  verbose: boolean;
}

export interface DlMarkupUserConfig extends Partial<DlMarkupConfig> {}
