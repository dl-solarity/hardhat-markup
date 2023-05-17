import { ContractInfo, Documentation, DocumentationBlock, NatSpecDocumentation } from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FUNCTION_NAME_H_SIZE } from "./constants";
import { MDConstructor } from "./md-constructor";

class MDGenerator {
  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  generateContractMDStr(contractInfo: ContractInfo): string {
    const mdConstructor: MDConstructor = new MDConstructor();

    mdConstructor.addHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE);

    mdConstructor.addHeaderTag(
      `${contractInfo.isAbstract ? "Abstract " : ""}${this.capitalizeFirstLetter(
        contractInfo.contractKind
      )} Description`
    );

    mdConstructor.addParagraphTag(`License: ${contractInfo.license}`);

    contractInfo.documentations.forEach((blockInfos) => {
      this.generateBlockInfo(mdConstructor, blockInfos);
    });

    return mdConstructor.getContractTagsStr();
  }

  generateBlockInfo(mdConstructor: MDConstructor, blockInfos: DocumentationBlock) {
    if (blockInfos.documentation.length === 0) return;

    mdConstructor.addHeaderTag(blockInfos.name);

    blockInfos.documentation.forEach((blockInfo) => {
      this.generateBlock(mdConstructor, blockInfo);
    });

    return mdConstructor.getContractTagsStr();
  }

  generateBlock(mdConstructor: MDConstructor, blockInfo: Documentation) {
    if (blockInfo.title) mdConstructor.addHeaderTag(blockInfo.title, FUNCTION_NAME_H_SIZE);

    if (blockInfo.fullSign) mdConstructor.addCodeTag([blockInfo.fullSign]);

    if (blockInfo.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, blockInfo.natSpecDocumentation);
  }

  generateDocumentationBlock(mdConstructor: MDConstructor, documentation: NatSpecDocumentation) {
    const res = [];
    if (documentation.author) {
      res.push(`Author: ${documentation.author}`);
    }
    if (documentation.title) {
      res.push(documentation.title);
    }
    if (documentation.notice) {
      res.push(documentation.notice);
    }
    if (documentation.dev) {
      res.push(`_${documentation.dev.trim().split("\n").join("_\n_")}_`);
    }
    if (documentation.custom) {
      for (const key of Object.keys(documentation.custom)) {
        res.push(`${key}: ${documentation.custom[key]}`);
      }
    }

    mdConstructor.addParagraphTag(res.join("\n"));

    if (documentation.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, documentation.params);
    }
    if (documentation.returns) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, documentation.returns);
    }
  }

  generateElementsBlock(
    mdConstructor: MDConstructor,
    documentation: {
      name?: string;
      type?: string;
      description: string;
    }[]
  ) {
    const raws: string[][] = [];

    for (let i = 0; i < documentation.length; i++) {
      const element = documentation[i];
      raws.push([element.name ? element.name : `[${i}]`, element.type || "", element.description]);
    }

    mdConstructor.addTableTag(["Name", "Type", "Description"], raws);
  }

  generateEnumDocumentationBlock(
    mdConstructor: MDConstructor,
    documentation: {
      name?: string;
      type?: string;
      description: string;
    }[]
  ) {
    const raws: string[][] = [];

    for (let i = 0; i < documentation.length; i++) {
      const element = documentation[i];
      raws.push([element.name ? element.name : `[${i}]`, element.description]);
    }

    mdConstructor.addTableTag(["Name", "Description"], raws);
  }
}

export { MDGenerator };
