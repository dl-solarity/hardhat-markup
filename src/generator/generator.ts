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
  private onlyFiles: string[];
  private skipFiles: string[];
  private verbose: boolean;
  private parser: Parser;
  private mdGenerator: MDGenerator;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.artifacts = hre.artifacts;
    this.outDir = path.resolve(hre.config.markup.outdir);
    this.parser = new Parser();
    this.mdGenerator = new MDGenerator();
    this.onlyFiles = hre.config.markup.onlyFiles.map((p) => path.normalize(p));
    this.skipFiles = hre.config.markup.skipFiles.map((p) => path.normalize(p));
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

    await this.generateMDs(filtered);

    return filtered;
  }

  async generateMDs(artifactNames: string[]) {
    for (const contractName of artifactNames) {
      const [source, name] = contractName.split(":");

      this.verboseLog(`Start generating markup for ${name} contract`);

      const buildInfo = (await this.artifacts.getBuildInfo(contractName))?.output.contracts[source][name];

      if (buildInfo === undefined) {
        continue;
      }

      const { abi, devdoc, userdoc, evm } = buildInfo as any;

      this.verboseLog(`Start parsing the information for the ${name} contract`);

      const contractInfo: ContractInfo = this.parser.parseContractInfo(name, devdoc, userdoc, abi, evm);

      this.verboseLog(`Information about the contract has been successfully parsed`);

      const genDir = `${this.outDir}/${path.dirname(source)}`;
      const genPath = `${genDir}/${name}.md`;

      await fsp.mkdir(genDir, { recursive: true });
      await fsp.writeFile(genPath, this.mdGenerator.generateContractMDStr(contractInfo));

      this.verboseLog(`Markup for ${name} successfully generated`);
      this.verboseLog(`-------------------------------------------------------`);
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

  private verboseLog(msg: string) {
    if (this.verbose) {
      console.log(msg);
    }
  }
};
