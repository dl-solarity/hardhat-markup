import { Artifacts, HardhatRuntimeEnvironment } from "hardhat/types";
import { Parser } from "../parser/Parser";
import { ContractInfo } from "../parser/types";
import { MDGenerator } from "./md-generator/MDGenerator";

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

export class Generator {
  private artifacts: Artifacts;
  private outDir: string;
  private onlyFiles: string[];
  private skipFiles: string[];
  private verbose: boolean;
  private mdGenerator: MDGenerator;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.artifacts = hre.artifacts;
    this.outDir = path.resolve(hre.config.markup.outdir);
    this.mdGenerator = new MDGenerator();
    this.onlyFiles = hre.config.markup.onlyFiles.map((p) => this.toUnixPath(path.normalize(p)));
    this.skipFiles = hre.config.markup.skipFiles.map((p) => this.toUnixPath(path.normalize(p)));
    this.verbose = hre.config.markup.verbose;
  }

  async generate() {
    console.log("\nGenerating markups...");

    const _names = await this.artifacts.getAllFullyQualifiedNames();

    const filterer = (n: any) => {
      const src = this.artifacts.readArtifactSync(n).sourceName;

      return (this.onlyFiles.length == 0 || this.contains(this.onlyFiles, src)) && !this.contains(this.skipFiles, src);
    };

    const filtered: string[] = _names.filter(filterer);

    this.verboseLog(`\n${_names.length} compiled contracts found, skipping ${_names.length - filtered.length} of them`);

    await this.generateMDs(filtered);

    return filtered;
  }

  async generateMDs(artifactNames: string[]) {
    for (const contractName of artifactNames) {
      const [source, name] = contractName.split(":");

      this.verboseLog(`\nStarted generating markup for ${name} contract`);

      const buildInfo = await this.artifacts.getBuildInfo(contractName);

      if (buildInfo === undefined) {
        continue;
      }

      const contractInfo: ContractInfo = new Parser(buildInfo).parseContractInfo(source, name);

      const genDir = `${this.outDir}/${path.dirname(source)}`;
      const genPath = `${genDir}/${name}.md`;

      await fsp.mkdir(genDir, { recursive: true });
      await fsp.writeFile(genPath, this.mdGenerator.generateContractMDStr(contractInfo));

      this.verboseLog(`Markup for ${name} is successfully generated`);
    }
  }

  async clean() {
    if (!fs.existsSync(this.outDir)) {
      return;
    }

    const dirStats = await fsp.stat(this.outDir);

    if (!dirStats.isDirectory()) {
      throw new Error(`outdir is not a directory: ${this.outDir}`);
    }

    await fsp.rm(this.outDir, { recursive: true });
  }

  private contains(pathList: any, source: any) {
    const isSubPath = (parent: string, child: string) => {
      const parentTokens = parent.split(path.sep).filter((i) => i.length);
      const childTokens = child.split(path.sep).filter((i) => i.length);
      return parentTokens.every((t, i) => childTokens[i] === t);
    };

    return pathList === undefined ? false : pathList.some((p: any) => isSubPath(p, source));
  }

  private toUnixPath(path: string) {
    return path.replace(/[\\/]+/g, "/");
  }

  private verboseLog(msg: string) {
    if (this.verbose) {
      console.log(msg);
    }
  }
}
