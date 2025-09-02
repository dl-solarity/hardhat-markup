import { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { Parser } from "../parser/Parser.js";
import { ContractInfo } from "../parser/types.js";
import { MDGenerator } from "./md-generator/MDGenerator.js";
import { ArtifactManager } from "hardhat/types/artifacts";

import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { SolidityBuildInfo, SolidityBuildInfoOutput } from "hardhat/types/solidity";

export class Generator {
  private artifacts: ArtifactManager;
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

  async generate(): Promise<string[]> {
    console.log("\nGenerating markups...");

    const _names = (await this.artifacts.getAllFullyQualifiedNames()).keys().toArray();

    const filterer = async (n: any) => {
      const src = (await this.artifacts.readArtifact(n)).sourceName;

      return (this.onlyFiles.length == 0 || this.contains(this.onlyFiles, src)) && !this.contains(this.skipFiles, src);
    };

    const filtered: string[] = _names.filter(filterer);

    this.verboseLog(`\n${_names.length} compiled contracts found, skipping ${_names.length - filtered.length} of them`);

    await this.generateMDs(filtered);

    return filtered;
  }

  async generateMDs(artifactNames: string[]): Promise<void> {
    for (const contractName of artifactNames) {
      const [source, name] = contractName.split(":");

      this.verboseLog(`\nStarted generating markup for ${name} contract`);

      const buildInfoId = await this.artifacts.getBuildInfoId(contractName);

      if (buildInfoId === undefined) {
        continue;
      }

      const buildInfoPath = await this.artifacts.getBuildInfoPath(buildInfoId);
      const buildInfoOutputPath = await this.artifacts.getBuildInfoOutputPath(buildInfoId);

      if (!buildInfoPath || !buildInfoOutputPath) {
        continue;
      }

      const buildInfo: SolidityBuildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf-8"));
      const buildInfoOutput: SolidityBuildInfoOutput = JSON.parse(fs.readFileSync(buildInfoOutputPath, "utf-8"));

      const contractInfo: ContractInfo = await new Parser(buildInfo, buildInfoOutput).parseContractInfo(source, name);

      const genDir = `${this.outDir}/${path.dirname(source)}`;
      const genPath = `${genDir}/${name}.md`;

      await fsp.mkdir(genDir, { recursive: true });
      await fsp.writeFile(genPath, this.mdGenerator.generateContractMDStr(contractInfo));

      this.verboseLog(`Markup for ${name} is successfully generated`);
    }
  }

  async clean(): Promise<void> {
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
      const parentTokens = parent.split(path.posix.sep).filter((i) => i.length);
      const childTokens = child.split(path.posix.sep).filter((i) => i.length);
      return parentTokens.every((t, i) => childTokens[i] === t);
    };

    return pathList === undefined ? false : pathList.some((p: any) => isSubPath(p, source));
  }

  private toUnixPath(userPath: string) {
    return userPath.split(path.sep).join(path.posix.sep);
  }

  private verboseLog(msg: string) {
    if (this.verbose) {
      console.log(msg);
    }
  }
}
