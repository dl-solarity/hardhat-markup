import {
  ContractInfo,
  FunctionsInfo,
  EventsInfo,
  ErrorsInfo,
  FunctionInfo,
  EventInfo,
  ErrorInfo,
  BaseDescription,
  Param,
  Return,
} from "../../parser/types";
import {
  AlignTypes,
  CONTRACT_NAME_H_SIZE,
  DEFAULT_CODE_LANGUAGE,
  DEFAULT_TABLE_ALIGN,
  FUNCTION_NAME_H_SIZE,
  TOPIC_H_SIZE,
} from "./constants";

const json2md = require("json2md");

class MDGenerator {
  generateContractMDStr(contractInfo: ContractInfo): any {
    const contractTags: any = [];

    contractTags.push(this.createHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE));

    if (contractInfo.notice || contractInfo.details || contractInfo.author) {
      contractTags.push(this.createHeaderTag("Contract Description", TOPIC_H_SIZE));
    }

    if (contractInfo.author) {
      contractTags.push(this.createParagraphTag(`Authored by ${contractInfo.author}`));
    }

    this.generateBaseDescriptionBlock(contractTags, contractInfo);

    const events: EventsInfo | undefined = contractInfo.events;

    if (events) {
      const keys: string[] = Object.keys(events);

      if (keys.length > 0) {
        contractTags.push(this.createHeaderTag("Events info", TOPIC_H_SIZE));

        keys.forEach((eventSign: string) => {
          this.generateEventBlock(contractTags, eventSign, events[eventSign]);
        });
      }
    }

    const errors: ErrorsInfo | undefined = contractInfo.errors;

    if (errors) {
      const keys: string[] = Object.keys(errors);

      if (keys.length > 0) {
        contractTags.push(this.createHeaderTag("Errors info", TOPIC_H_SIZE));

        keys.forEach((errorSign: string) => {
          this.generateErrorBlock(contractTags, errorSign, errors[errorSign]);
        });
      }
    }

    const functions: FunctionsInfo | undefined = contractInfo.functions;

    if (functions) {
      const keys: string[] = Object.keys(functions);

      if (keys.length > 0) {
        contractTags.push(this.createHeaderTag("Functions info", TOPIC_H_SIZE));

        keys.forEach((funcSign: string) => {
          this.generateFunctionBlock(contractTags, funcSign, functions[funcSign]);
        });
      }
    }

    return json2md(contractTags);
  }

  generateFunctionBlock(contractTags: any[], funcSign: string, funcInfo: FunctionInfo) {
    contractTags.push(this.createHeaderTag(`${funcInfo.name} (0x${funcInfo.selector})`, FUNCTION_NAME_H_SIZE));

    contractTags.push(
      this.createCodeTag([`function ${funcSign} ${this.getFunctionModifiers(funcInfo.stateMutability)}`])
    );

    this.generateBaseDescriptionBlock(contractTags, funcInfo);

    if (funcInfo.params) {
      contractTags.push(this.createParagraphTag("Parameters:"));

      this.generateParamsBlock(contractTags, funcInfo.params);
    }

    if (funcInfo.returns) {
      contractTags.push(this.createParagraphTag("Return values:"));

      this.generateReturnsBlock(contractTags, funcInfo.returns);
    }
  }

  generateEventBlock(contractTags: any[], eventSign: string, eventInfo: EventInfo) {
    contractTags.push(this.createHeaderTag(`${eventInfo.name} event`, FUNCTION_NAME_H_SIZE));

    contractTags.push(this.createCodeTag([`event ${eventSign}`]));

    this.generateBaseDescriptionBlock(contractTags, eventInfo);

    if (eventInfo.params) {
      contractTags.push(this.createParagraphTag("Parameters:"));

      this.generateParamsBlock(contractTags, eventInfo.params);
    }
  }

  generateErrorBlock(contractTags: any[], errorSign: string, errorInfo: ErrorInfo) {
    contractTags.push(this.createHeaderTag(`${errorInfo.name} error`, FUNCTION_NAME_H_SIZE));

    contractTags.push(this.createCodeTag([`error ${errorSign}`]));

    this.generateBaseDescriptionBlock(contractTags, errorInfo);

    if (errorInfo.params) {
      contractTags.push(this.createParagraphTag("Parameters:"));

      this.generateParamsBlock(contractTags, errorInfo.params);
    }
  }

  generateParamsBlock(contractTags: any[], params: Param[]) {
    const raws: string[][] = [];

    params.map((param: Param) => {
      raws.push([param.paramName, param.paramDescription]);
    });

    contractTags.push(this.createTableTag(["Name", "Description"], raws));
  }

  generateReturnsBlock(contractTags: any[], returns: Return[]) {
    const raws: string[][] = [];

    returns.map((returnEl: Return) => {
      raws.push([returnEl.returnName, returnEl.returnDescription]);
    });

    contractTags.push(this.createTableTag(["Name", "Description"], raws));
  }

  generateBaseDescriptionBlock(contractTags: any[], baseInfo: BaseDescription) {
    if (baseInfo.notice) {
      contractTags.push(this.createParagraphTag(baseInfo.notice));
    }

    if (baseInfo.details) {
      contractTags.push(this.createParagraphTag(baseInfo.details));
    }
  }

  getInlineCodeStr(str: string): string {
    return `\`${str}\``;
  }

  getBoldStr(str: string): string {
    return `**${str}**`;
  }

  getFunctionModifiers(stateMutability: string): string {
    switch (stateMutability) {
      case "payable":
        return "external payable";
      case "nonpayable":
        return "external";
      case "view":
        return "external view";
      default:
        throw new Error(`Failed to get function modifiers from ${stateMutability}`);
    }
  }

  private createHeaderTag(headerContent: string, headerSize: number): any {
    switch (headerSize) {
      case 1:
        return { h1: headerContent };
      case 2:
        return { h2: headerContent };
      case 3:
        return { h3: headerContent };
      case 4:
        return { h4: headerContent };
      case 5:
        return { h5: headerContent };
      case 6:
        return { h6: headerContent };
      default:
        throw new Error("Invalid header size number");
    }
  }

  private createParagraphTag(pContent: string): any {
    return { p: pContent };
  }

  private createUlTag(ulContent: string[]): any {
    return { ul: ulContent };
  }

  private createTableTag(
    headers: string[],
    rows: string[][],
    aligns: AlignTypes[] = [],
    isPretty: boolean = true
  ): any {
    rows.forEach((row: string[]) => {
      if (row.length != headers.length) {
        throw new Error(
          `Failed to create Table tag. Expected ${headers.length} columns, actual - ${row.length} columns in ${row} row`
        );
      }
    });

    const alignments: string[] = aligns.map((_, index: number) => {
      return aligns && aligns[index] ? aligns[index] : DEFAULT_TABLE_ALIGN;
    });

    return {
      table: {
        headers: headers,
        rows: rows,
        pretty: isPretty,
        aligns: alignments,
      },
    };
  }

  private createCodeTag(codeContent: string[], language: string = DEFAULT_CODE_LANGUAGE): any {
    return {
      code: {
        language: language,
        content: codeContent,
      },
    };
  }
}

export { MDGenerator };
