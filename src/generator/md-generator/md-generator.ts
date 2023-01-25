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
  BaseMethodInfo,
  FullMethodSign,
} from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FULL_METHOD_SIGN_MAX_LENGTH, FUNCTION_NAME_H_SIZE } from "./constants";
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
          this.generateEventBlock(mdConstructor, events[eventSign]);
        });
      }
    }

    const errors: ErrorsInfo | undefined = contractInfo.errors;

    if (errors) {
      const keys: string[] = Object.keys(errors);

      if (keys.length > 0) {
        mdConstructor.addHeaderTag("Errors info");

        keys.forEach((errorSign: string) => {
          this.generateErrorBlock(mdConstructor, errors[errorSign]);
        });
      }
    }

    const functions: FunctionsInfo | undefined = contractInfo.functions;

    if (functions) {
      const keys: string[] = Object.keys(functions);

      if (keys.length > 0) {
        mdConstructor.addHeaderTag("Functions info");

        keys.forEach((funcSign: string) => {
          this.generateFunctionBlock(mdConstructor, functions[funcSign]);
        });
      }
    }

    return mdConstructor.getContractTagsStr();
  }

  generateFunctionBlock(mdConstructor: MDConstructor, funcInfo: FunctionInfo) {
    const funcHeader = `${funcInfo.name} (0x${funcInfo.selector})`;

    this.generateBaseMethodBlock(mdConstructor, funcHeader, funcInfo);

    if (funcInfo.returns) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, funcInfo.returns);
    }
  }

  generateEventBlock(mdConstructor: MDConstructor, eventInfo: EventInfo) {
    this.generateBaseMethodBlock(mdConstructor, `${eventInfo.name} event`, eventInfo);
  }

  generateErrorBlock(mdConstructor: MDConstructor, errorInfo: ErrorInfo) {
    this.generateBaseMethodBlock(mdConstructor, `${errorInfo.name} error`, errorInfo);
  }

  generateBaseMethodBlock(mdConstructor: MDConstructor, methodHeader: string, methodInfo: BaseMethodInfo) {
    mdConstructor.addHeaderTag(methodHeader, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag(this.getFullMethodSignArr(methodInfo.fullMethodSign));

    this.generateBaseDescriptionBlock(mdConstructor, methodInfo);

    if (methodInfo.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, methodInfo.params);
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

  getFullMethodSignArr(fullMethodSign: FullMethodSign, isPretty: boolean = true): string[] {
    const modifiersArr: string[] = fullMethodSign.modifiers ? fullMethodSign.modifiers : [];
    const parametersArr: string[] = fullMethodSign.parameters ? fullMethodSign.parameters : [];
    const returnsArr: string[] = fullMethodSign.returns ? fullMethodSign.returns : [];

    const fullMethodSignArr: string[] = [];

    const methodStartStr: string = `${fullMethodSign.methodType} ${fullMethodSign.methodName}(`;
    const methodEndStr: string = `${modifiersArr.length > 0 ? ` ${modifiersArr.join(" ")}` : ""}${
      returnsArr.length > 0 ? ` (${returnsArr.join(", ")})` : ""
    }`;

    const fullMethodSignWithoutPretty: string = `${methodStartStr}${parametersArr.join(", ")})${methodEndStr};`;

    if (isPretty && fullMethodSignWithoutPretty.length > FULL_METHOD_SIGN_MAX_LENGTH) {
      fullMethodSignArr.push(`${methodStartStr}`);

      if (parametersArr.length > 0) {
        fullMethodSignArr.push(...this.getFormattedElementsArr(parametersArr));
        fullMethodSignArr.push(")");
      } else {
        this.concatToLastElement(fullMethodSignArr, ")");
      }

      if (methodEndStr.length > FULL_METHOD_SIGN_MAX_LENGTH) {
        fullMethodSignArr.push(...this.getFormattedElementsArr(modifiersArr, "", "("));
        fullMethodSignArr.push(...this.getFormattedElementsArr(returnsArr, ",", "", "\t\t"));
        fullMethodSignArr.push("\t)");
      } else {
        this.concatToLastElement(fullMethodSignArr, methodEndStr);
      }

      this.concatToLastElement(fullMethodSignArr, ";");
    } else {
      fullMethodSignArr.push(fullMethodSignWithoutPretty);
    }

    return fullMethodSignArr;
  }

  private concatToLastElement(elementsArr: string[], stringToConcat: string) {
    elementsArr[elementsArr.length - 1] = elementsArr[elementsArr.length - 1].concat(stringToConcat);
  }

  private getFormattedElementsArr(
    elementsArr: string[],
    beforeLastElementSuffix: string = ",",
    lastElementSuffix: string = "",
    tabPrefix: string = "\t"
  ): string[] {
    const formattedArr: string[] = [];

    elementsArr.forEach((elementStr: string, index: number) => {
      formattedArr.push(
        `${tabPrefix}${elementStr}${index != elementsArr.length - 1 ? beforeLastElementSuffix : lastElementSuffix}`
      );
    });

    return formattedArr;
  }
}

export { MDGenerator };
