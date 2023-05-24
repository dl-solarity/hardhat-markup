import { ContractInfo, Documentation, DocumentationBlock, NatSpecDocumentation } from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FUNCTION_NAME_H_SIZE } from "./constants";
import { MDFactory } from "./MDFactory";

export class MDGenerator {
  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  generateContractMDStr(contractInfo: ContractInfo): string {
    const mdFactory: MDFactory = new MDFactory();

    mdFactory.addHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE);
    mdFactory.addHeaderTag(
      `${contractInfo.isAbstract ? "Abstract " : ""}${this.capitalizeFirstLetter(
        contractInfo.contractKind
      )} Description`
    );
    mdFactory.addParagraphTag(`License: ${contractInfo.license}`);

    contractInfo.documentations.forEach((blockInfos) => {
      this.generateBlockInfo(mdFactory, blockInfos);
    });

    return mdFactory.getContractTagsStr();
  }

  generateBlockInfo(mdFactory: MDFactory, blockInfos: DocumentationBlock) {
    if (blockInfos.documentation.length === 0) return;

    mdFactory.addHeaderTag(blockInfos.blockName);

    blockInfos.documentation.forEach((blockInfo) => {
      this.generateBlock(mdFactory, blockInfo);
    });

    return mdFactory.getContractTagsStr();
  }

  generateBlock(mdFactory: MDFactory, blockInfo: Documentation) {
    if (blockInfo.header) {
      mdFactory.addHeaderTag(blockInfo.header, FUNCTION_NAME_H_SIZE);
    }

    if (blockInfo.fullSign) {
      mdFactory.addCodeTag([blockInfo.fullSign]);
    }

    if (blockInfo.natSpecDocumentation) {
      this.generateDocumentationBlock(mdFactory, blockInfo.natSpecDocumentation);
    }
  }

  generateDocumentationBlock(mdFactory: MDFactory, documentation: NatSpecDocumentation) {
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
      res.push(documentation.dev);
    }

    if (documentation.custom) {
      for (const key of Object.keys(documentation.custom)) {
        res.push(`${key}: ${documentation.custom[key]}`);
      }
    }

    mdFactory.addPlainText(res.join("\n"));

    if (documentation.params) {
      mdFactory.addParagraphTag("Parameters:");

      if (documentation.params.every((param) => param.type === undefined)) {
        this.generateEnumElementsBlock(mdFactory, documentation.params);
      } else {
        this.generateElementsBlock(mdFactory, documentation.params);
      }
    }

    if (documentation.returns) {
      mdFactory.addParagraphTag("Return values:");

      this.generateElementsBlock(mdFactory, documentation.returns);
    }
  }

  generateElementsBlock(
    mdFactory: MDFactory,
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

    mdFactory.addTableTag(["Name", "Type", "Description"], raws);
  }

  generateEnumElementsBlock(
    mdFactory: MDFactory,
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

    mdFactory.addTableTag(["Name", "Description"], raws);
  }
}
