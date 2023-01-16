import { Artifacts, HardhatRuntimeEnvironment } from "hardhat/types";
import { Parser } from "../parser/parser";
import { ContractInfo } from "../parser/types";
import { MDGenerator } from "./md-generator/md-generator";

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

module.exports = class Generator {
  private artifacts: Artifacts;
  private outDir: string;
  private only: string;
  private onlyFiles: string[];
  private skipFiles: string[];
  private parser: Parser;
  private mdGenerator: MDGenerator;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.artifacts = hre.artifacts;
    this.outDir = path.resolve(hre.config.markup.outdir);
    this.only = hre.config.markup.only;
    this.parser = new Parser();
    this.mdGenerator = new MDGenerator();
    this.onlyFiles = hre.config.markup.onlyFiles.map((p) => path.normalize(p));
    this.skipFiles = hre.config.markup.skipFiles.map((p) => path.normalize(p));
  }

  async generateAll() {
    console.log("\nGenerating markups...");

    let names;

    if (this.only === "") {
      const _names = await this.artifacts.getAllFullyQualifiedNames();

      const filterer = (n: any) => {
        const src = this.artifacts.readArtifactSync(n).sourceName;
        return (
          (this.onlyFiles.length == 0 || this._contains(this.onlyFiles, src)) && !this._contains(this.skipFiles, src)
        );
      };

      names = _names.filter(filterer);
    } else {
      names = [this.only];
    }

    await this.generateMDs(names);
  }

  async generateMDs(artifactNames: string[]) {
    for (const contractName of artifactNames) {
      const [source, name] = contractName.split(":");

      const buildInfo = (await this.artifacts.getBuildInfo(contractName))?.output.contracts[source][name];

      if (buildInfo === undefined) {
        continue;
      }

      await fsp.mkdir(this.outDir, { recursive: true });

      const { abi, devdoc, userdoc } = buildInfo as any;

      const contractInfo: ContractInfo = this.parser.parseContractInfo(name, devdoc, userdoc, abi);

      const mdInfo = `${this.outDir}/${name}.md`;
      await fsp.writeFile(mdInfo, this.mdGenerator.generateContractMDStr(contractInfo));
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

  _contains(pathList: any, source: any) {
    const isSubPath = (parent: string, child: string) => {
      const parentTokens = parent.split(path.sep).filter((i) => i.length);
      const childTokens = child.split(path.sep).filter((i) => i.length);
      return parentTokens.every((t, i) => childTokens[i] === t);
    };

    return pathList === undefined ? false : pathList.some((p: any) => isSubPath(p, source));
  }
};
