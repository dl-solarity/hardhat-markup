import {
  ContractInfo,
  FunctionsInfo,
  EventsInfo,
  ErrorsInfo,
  FunctionInfo,
  EventInfo,
  ErrorInfo,
  BaseDescription,
  BaseElement,
} from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FUNCTION_NAME_H_SIZE } from "./constants";
import { MDConstructor } from "./md-constructor";

class MDGenerator {
  generateContractMDStr(contractInfo: ContractInfo): any {
    const mdConstructor: MDConstructor = new MDConstructor();

    mdConstructor.addHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE);

    if (contractInfo.notice || contractInfo.details || contractInfo.author) {
      mdConstructor.addHeaderTag("Contract Description");
    }

    if (contractInfo.author) {
      mdConstructor.addParagraphTag(`Authored by ${contractInfo.author}`);
    }

    this.generateBaseDescriptionBlock(mdConstructor, contractInfo);

    const events: EventsInfo | undefined = contractInfo.events;

    if (events) {
      const keys: string[] = Object.keys(events);

      if (keys.length > 0) {
        mdConstructor.addHeaderTag("Events info");

        keys.forEach((eventSign: string) => {
          this.generateEventBlock(mdConstructor, eventSign, events[eventSign]);
        });
      }
    }

    const errors: ErrorsInfo | undefined = contractInfo.errors;

    if (errors) {
      const keys: string[] = Object.keys(errors);

      if (keys.length > 0) {
        mdConstructor.addHeaderTag("Errors info");

        keys.forEach((errorSign: string) => {
          this.generateErrorBlock(mdConstructor, errorSign, errors[errorSign]);
        });
      }
    }

    const functions: FunctionsInfo | undefined = contractInfo.functions;

    if (functions) {
      const keys: string[] = Object.keys(functions);

      if (keys.length > 0) {
        mdConstructor.addHeaderTag("Functions info");

        keys.forEach((funcSign: string) => {
          this.generateFunctionBlock(mdConstructor, funcSign, functions[funcSign]);
        });
      }
    }

    return mdConstructor.getContractTagsStr();
  }

  generateFunctionBlock(mdConstructor: MDConstructor, funcSign: string, funcInfo: FunctionInfo) {
    mdConstructor.addHeaderTag(`${funcInfo.name} (0x${funcInfo.selector})`, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([`function ${funcSign} ${this.getFunctionModifiers(funcInfo.stateMutability)}`]);

    this.generateBaseDescriptionBlock(mdConstructor, funcInfo);

    if (funcInfo.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, funcInfo.params);
    }

    if (funcInfo.returns) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, funcInfo.returns);
    }
  }

  generateEventBlock(mdConstructor: MDConstructor, eventSign: string, eventInfo: EventInfo) {
    mdConstructor.addHeaderTag(`${eventInfo.name} event`, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([`event ${eventSign}`]);

    this.generateBaseDescriptionBlock(mdConstructor, eventInfo);

    if (eventInfo.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, eventInfo.params);
    }
  }

  generateErrorBlock(mdConstructor: MDConstructor, errorSign: string, errorInfo: ErrorInfo) {
    mdConstructor.addHeaderTag(`${errorInfo.name} error`, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([`error ${errorSign}`]);

    this.generateBaseDescriptionBlock(mdConstructor, errorInfo);

    if (errorInfo.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, errorInfo.params);
    }
  }

  generateElementsBlock(mdConstructor: MDConstructor, elements: BaseElement[]) {
    const raws: string[][] = [];

    elements.map((el: BaseElement) => {
      raws.push([el.name, el.type, el.description]);
    });

    mdConstructor.addTableTag(["Name", "Type", "Description"], raws);
  }

  generateBaseDescriptionBlock(mdConstructor: MDConstructor, baseInfo: BaseDescription) {
    if (baseInfo.notice) {
      mdConstructor.addParagraphTag(baseInfo.notice);
    }

    if (baseInfo.details) {
      mdConstructor.addParagraphTag(baseInfo.details);
    }
  }

  getFunctionModifiers(stateMutability: string): string {
    switch (stateMutability) {
      case "payable":
        return "external payable";
      case "nonpayable":
        return "external";
      case "view":
        return "external view";
      case "pure":
        return "external pure";
      default:
        throw new Error(`Failed to get function modifiers from ${stateMutability}`);
    }
  }
}

export { MDGenerator };
