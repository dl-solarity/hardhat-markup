import { DEFAULT_LICENSE, ERROR_TYPE, EVENT_TYPE, FUNCTION_TYPE } from "./constants";
import {
  Return,
  Param,
  BaseDescription,
  BaseMethodInfo,
  EventInfo,
  FunctionInfo,
  ErrorsInfo,
  EventsInfo,
  FunctionsInfo,
  ContractInfo,
  FullMethodSign,
  ContractBuildData,
  StateVariablesInfo,
  StateVariableInfo,
} from "./types";

class Parser {
  parseContractInfo(contractBuildData: ContractBuildData): ContractInfo {
    const contractInfo: ContractInfo = {
      license: this.parseLicenseFromMetadata(contractBuildData.contractSource, contractBuildData.metadata),
      ...this.parseBaseDescription(contractBuildData.contractName, contractBuildData.devdoc, contractBuildData.userdoc),
    };

    if (contractBuildData.devdoc && contractBuildData.devdoc.author) {
      contractInfo.author = contractBuildData.devdoc.author;
    }

    if (contractBuildData.devdoc && contractBuildData.devdoc.title) {
      contractInfo.title = contractBuildData.devdoc.title;
    }

    const events: EventsInfo = this.parseEventsInfo(
      contractBuildData.devdoc,
      contractBuildData.userdoc,
      contractBuildData.abi
    );

    if (events) {
      contractInfo.events = events;
    }

    const functions: FunctionsInfo = this.parseFunctionsInfo(
      contractBuildData.devdoc,
      contractBuildData.userdoc,
      contractBuildData.abi,
      contractBuildData.evm
    );

    if (functions) {
      contractInfo.functions = functions;
    }

    const stateVariables: StateVariablesInfo = this.parseFunctionsInfo(
      contractBuildData.devdoc,
      contractBuildData.userdoc,
      contractBuildData.abi,
      contractBuildData.evm,
      true
    );

    if (stateVariables) {
      contractInfo.stateVariables = stateVariables;
    }

    const errors: ErrorsInfo = this.parseErrorsInfo(
      contractBuildData.devdoc,
      contractBuildData.userdoc,
      contractBuildData.abi
    );

    if (errors) {
      contractInfo.errors = errors;
    }

    return contractInfo;
  }

  parseFunctionsInfo(
    devDoc: any,
    userDoc: any,
    abi: any,
    evmInfo: any,
    isStateVars: boolean = false
  ): FunctionsInfo | StateVariablesInfo {
    const functionsInfo: FunctionsInfo | StateVariablesInfo = {};

    this.getAbisByType(abi, devDoc, FUNCTION_TYPE, isStateVars).forEach((currentAbi: any) => {
      const currentSign = this.parseMethodSignature(currentAbi);

      let devDocFunctionInfo: any = {};

      if (isStateVars) {
        devDocFunctionInfo = devDoc.stateVariables ? devDoc.stateVariables[currentAbi.name] : undefined;
      } else {
        devDocFunctionInfo = devDoc.methods ? devDoc.methods[currentSign] : undefined;
      }

      const userDocFunctionInfo = userDoc.methods ? userDoc.methods[currentSign] : undefined;

      const funcSelector = evmInfo.methodIdentifiers[currentSign];

      if (!funcSelector) {
        throw new Error(`Failed to parse selector for ${currentSign} function`);
      }

      functionsInfo[currentSign] = this.parseFunctionInfo(
        currentAbi.name,
        funcSelector,
        devDocFunctionInfo,
        userDocFunctionInfo,
        currentAbi
      );
    });

    return functionsInfo;
  }

  parseEventsInfo(devDoc: any, userDoc: any, abi: any): EventsInfo {
    const eventsInfo: EventsInfo = {};

    this.getAbisByType(abi, devDoc, EVENT_TYPE).forEach((currentAbi: any) => {
      const currentSign = this.parseMethodSignature(currentAbi);

      const devDocEventInfo = devDoc.events ? devDoc.events[currentSign] : undefined;
      const userDocEventInfo = userDoc.events ? userDoc.events[currentSign] : undefined;

      const eventInfo: EventInfo = this.parseEventInfo(currentAbi.name, devDocEventInfo, userDocEventInfo, currentAbi);

      eventsInfo[currentSign] = eventInfo;
    });

    return eventsInfo;
  }

  parseErrorsInfo(devDoc: any, userDoc: any, abi: any): ErrorsInfo {
    const errorsInfo: ErrorsInfo = {};

    this.getAbisByType(abi, devDoc, ERROR_TYPE).forEach((currentAbi: any) => {
      const currentSign = this.parseMethodSignature(currentAbi);

      const devDocErrorInfo = devDoc.errors ? devDoc.errors[currentSign][0] : undefined;
      const userDocErrorInfo = userDoc.errors ? userDoc.errors[currentSign][0] : undefined;

      errorsInfo[currentSign] = this.parseErrorInfo(currentAbi.name, devDocErrorInfo, userDocErrorInfo, currentAbi);
    });

    return errorsInfo;
  }

  parseFunctionInfo(
    functionName: string,
    selector: string,
    devDoc: any,
    userDoc: any,
    functionAbi: any
  ): FunctionInfo | StateVariableInfo {
    const functionInfo: FunctionInfo = {
      selector,
      ...this.parseBaseMethodInfo(functionName, devDoc, userDoc, functionAbi),
    };

    const returns = this.parseReturns(devDoc, functionAbi);

    if (returns) {
      functionInfo.returns = returns;
    }

    return functionInfo;
  }

  parseEventInfo(eventName: string, devDoc: any, userDoc: any, eventAbi: any): EventInfo {
    return this.parseBaseMethodInfo(eventName, devDoc, userDoc, eventAbi);
  }

  parseErrorInfo(errorName: string, devDoc: any, userDoc: any, errorAbi: any): EventInfo {
    return this.parseBaseMethodInfo(errorName, devDoc, userDoc, errorAbi);
  }

  parseBaseMethodInfo(methodName: string, devDoc: any, userDoc: any, methodAbi: any): BaseMethodInfo {
    const baseMethodInfo: BaseMethodInfo = {
      methodAbi,
      fullMethodSign: this.parseFullMethodSign(methodAbi),
      ...this.parseBaseDescription(methodName, devDoc, userDoc),
    };

    const params = this.parseParams(devDoc, methodAbi);

    if (params) {
      baseMethodInfo.params = params;
    }

    return baseMethodInfo;
  }

  parseBaseDescription(name: string, devDoc: any, userDoc: any): BaseDescription {
    const baseDesc: BaseDescription = { name };

    if (userDoc && userDoc.notice) {
      baseDesc.notice = userDoc.notice;
    }

    if (devDoc && devDoc.details) {
      baseDesc.details = devDoc.details;
    }

    return baseDesc;
  }

  parseParams(devDoc: any, methodAbi: any): Param[] | undefined {
    if (devDoc && devDoc.params) {
      const paramsArr: Param[] = [];

      if (methodAbi.inputs) {
        const devDocParamKeys = Object.keys(devDoc.params);

        methodAbi.inputs.forEach((param: any, index: number) => {
          const paramName = param.name ? param.name : devDocParamKeys[index];
          const paramDesc = devDoc.params[paramName];

          if (!paramDesc) {
            return;
          }

          const paramToAdd: Param = {
            name: paramName,
            type: param.type,
            description: paramDesc,
          };

          if (methodAbi.type == EVENT_TYPE) {
            paramToAdd.isIndexed = param.indexed;
          }

          paramsArr.push(paramToAdd);
        });
      }

      return paramsArr;
    }

    return undefined;
  }

  parseReturns(devDoc: any, methodAbi: any): Return[] | undefined {
    if (devDoc && devDoc.returns) {
      const returnsArr: Return[] = [];

      if (methodAbi.outputs) {
        methodAbi.outputs.forEach((output: any, outIndex: number) => {
          const outName = output.name ? output.name : `_${outIndex}`;

          if (!devDoc.returns[outName]) {
            return;
          }

          returnsArr.push({
            name: outName,
            type: output.type,
            description: devDoc.returns[outName],
          });
        });
      }

      return returnsArr;
    }

    return undefined;
  }

  parseMethodSignature(methodAbi: any): string {
    return `${methodAbi.name}(${methodAbi.inputs.map((inputElem: any) => this.getSignRecursive(inputElem))})`;
  }

  parseFullMethodSign(methodAbi: any): FullMethodSign {
    const fullMethodSign: FullMethodSign = { methodType: methodAbi.type, methodName: methodAbi.name };

    const params: string[] = methodAbi.inputs.map((inputElem: any) => {
      let isIndexed: string = "";

      if (fullMethodSign.methodType == EVENT_TYPE) {
        isIndexed = inputElem.indexed ? " indexed" : "";
      }

      const inputElementName = inputElem.name ? ` ${inputElem.name}` : "";

      return `${inputElem.type}${isIndexed}${inputElementName}`;
    });

    if (params.length > 0) {
      fullMethodSign.parameters = params;
    }

    if (fullMethodSign.methodType == FUNCTION_TYPE) {
      const modifiers: string[] = this.getFunctionModifiers(methodAbi.stateMutability).split(" ");

      const returns: string[] = methodAbi.outputs.map((outputElem: any) => {
        const outputName = outputElem.name ? ` ${outputElem.name}` : "";

        return `${outputElem.type}${outputName}`;
      });

      if (returns.length > 0) {
        modifiers.push("returns");

        fullMethodSign.returns = returns;
      }

      fullMethodSign.modifiers = modifiers;
    }

    return fullMethodSign;
  }

  parseLicenseFromMetadata(contractSource: string, metadata: any): string {
    let license: string = DEFAULT_LICENSE;

    if (metadata) {
      const metadataObj = JSON.parse(metadata.replace("/\\/g"));
      const metadataSource = metadataObj.sources[contractSource];

      if (metadataSource) {
        license = metadataSource.license ? metadataSource.license : DEFAULT_LICENSE;
      } else {
        throw new Error(`Failed to get metadata source for ${contractSource}`);
      }
    }

    return license;
  }

  private isStateVar(devDoc: any, funcAbi: any): boolean {
    return !!(devDoc && devDoc.stateVariables && devDoc.stateVariables[funcAbi.name]);
  }

  private getSignRecursive(funcAbi: any): string {
    if (funcAbi.components) {
      const tupleArrSufix = funcAbi.type == "tuple[]" ? "[]" : "";

      return `(${funcAbi.components.map((el: any) => this.getSignRecursive(el))})${tupleArrSufix}`;
    }

    return funcAbi.type;
  }

  private getAbisByType(abi: any, devDoc: any, methotType: string, isStateVar: boolean = false): any[] {
    const abis: any[] = [];

    abi.map((currentAbi: any) => {
      if (currentAbi.type == methotType && this.isStateVar(devDoc, currentAbi) == isStateVar) {
        abis.push(currentAbi);
      }
    });

    return abis;
  }

  private getFunctionModifiers(stateMutability: string): string {
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

export { Parser };
