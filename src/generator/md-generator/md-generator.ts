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
  CONTRACT_NAME_H_SIZE,
  DEFAULT_CODE_LANGUAGE,
  FUNCTION_INSIDE_H_SIZE,
  FUNCTION_NAME_H_SIZE,
  TOPIC_H_SIZE,
} from "./constants";

const json2md = require("json2md");

class MDGenerator {
  generateContractMDStr(contractInfo: ContractInfo): any {
    const contractTags: any = [];

    contractTags.push(this.createHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE));

    contractTags.push(this.createHeaderTag("Contract Description", TOPIC_H_SIZE));

    if (contractInfo.author) {
      contractTags.push(this.createParagraphTag(`${this.getBoldStr("Author:")} ${contractInfo.author}`));
    }

    this.generateBaseDescriptionBlock(contractTags, contractInfo);

    const events: EventsInfo | undefined = contractInfo.events;

    if (events) {
      contractTags.push(this.createHeaderTag("Events info", TOPIC_H_SIZE));

      Object.keys(events).forEach((eventSign: string) => {
        this.generateEventBlock(contractTags, eventSign, events[eventSign]);
      });
    }

    const errors: ErrorsInfo | undefined = contractInfo.errors;

    if (errors) {
      contractTags.push(this.createHeaderTag("Errors info", TOPIC_H_SIZE));

      Object.keys(errors).forEach((errorSign: string) => {
        this.generateErrorBlock(contractTags, errorSign, errors[errorSign]);
      });
    }

    const functions: FunctionsInfo | undefined = contractInfo.functions;

    if (functions) {
      contractTags.push(this.createHeaderTag("Functions info", TOPIC_H_SIZE));

      Object.keys(functions).forEach((funcSign: string) => {
        this.generateFunctionBlock(contractTags, funcSign, functions[funcSign]);
      });
    }

    return json2md(contractTags);
  }

  generateFunctionBlock(contractTags: any[], funcSign: string, funcInfo: FunctionInfo) {
    contractTags.push(this.createHeaderTag(`${funcInfo.name} function`, FUNCTION_NAME_H_SIZE));

    const fullFuncSig = `${funcSign} ${funcInfo.stateMutability}`;
    contractTags.push(
      this.createParagraphTag(`${this.getBoldStr("Function signature:")} ${this.getInlineCodeStr(fullFuncSig)}`)
    );

    this.generateBaseDescriptionBlock(contractTags, funcInfo);

    if (funcInfo.params) {
      contractTags.push(this.createHeaderTag("Parameters description", FUNCTION_INSIDE_H_SIZE));

      this.generateParamsBlock(contractTags, funcInfo.params);
    }

    if (funcInfo.returns) {
      contractTags.push(this.createHeaderTag("Returns description", FUNCTION_INSIDE_H_SIZE));

      this.generateReturnsBlock(contractTags, funcInfo.returns);
    }
  }

  generateEventBlock(contractTags: any[], eventSign: string, eventInfo: EventInfo) {
    contractTags.push(this.createHeaderTag(`${eventInfo.name} event`, FUNCTION_NAME_H_SIZE));

    contractTags.push(
      this.createParagraphTag(`${this.getBoldStr("Event signature:")} ${this.getInlineCodeStr(eventSign)}`)
    );

    this.generateBaseDescriptionBlock(contractTags, eventInfo);

    if (eventInfo.params) {
      contractTags.push(this.createHeaderTag("Parameters description", FUNCTION_INSIDE_H_SIZE));

      this.generateParamsBlock(contractTags, eventInfo.params);
    }
  }

  generateErrorBlock(contractTags: any[], errorSign: string, errorInfo: ErrorInfo) {
    contractTags.push(this.createHeaderTag(`${errorInfo.name} error`, FUNCTION_NAME_H_SIZE));

    contractTags.push(
      this.createParagraphTag(`${this.getBoldStr("Error signature:")} ${this.getInlineCodeStr(errorSign)}`)
    );

    this.generateBaseDescriptionBlock(contractTags, errorInfo);

    if (errorInfo.params) {
      contractTags.push(this.createHeaderTag("Parameters description", FUNCTION_INSIDE_H_SIZE));

      this.generateParamsBlock(contractTags, errorInfo.params);
    }
  }

  generateParamsBlock(contractTags: any[], params: Param[]) {
    const paramsDesc: string[] = params.map((param: Param) => {
      let isIndexed: string = "";

      if (param.isIndexed) {
        isIndexed = " (indexed)";
      }

      return `${param.paramName}${isIndexed}: ${param.paramDescription}`;
    });

    contractTags.push(this.createUlTag(paramsDesc));
  }

  generateReturnsBlock(contractTags: any[], returns: Return[]) {
    const returnsDesc: string[] = returns.map((returnEl: Return) => {
      return `${returnEl.returnName}: ${returnEl.returnDescription}`;
    });

    contractTags.push(this.createUlTag(returnsDesc));
  }

  generateBaseDescriptionBlock(contractTags: any[], baseInfo: BaseDescription) {
    if (baseInfo.notice) {
      contractTags.push(this.createParagraphTag(`${this.getBoldStr("Description:")} ${baseInfo.notice}`));
    }

    if (baseInfo.details) {
      contractTags.push(this.createParagraphTag(`${this.getBoldStr("Dev description:")} ${baseInfo.details}`));
    }
  }

  getInlineCodeStr(str: string): string {
    return `\`${str}\``;
  }

  getBoldStr(str: string): string {
    return `**${str}**`;
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
