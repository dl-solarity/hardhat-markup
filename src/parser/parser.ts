import { EVENT_TYPE, FUNCTION_TYPE } from "./constants";
import {
  Return,
  Param,
  BaseDescription,
  BaseMethodInfo,
  EventInfo,
  FunctionInfo,
  EventsInfo,
  FunctionsInfo,
  ContractInfo,
} from "./types";

class Parser {
  parseContractInfo(name: string, devDoc: any, userDoc: any, abi: any): ContractInfo {
    const contractInfo: ContractInfo = this.parseBaseDescription(name, devDoc, userDoc);

    if (devDoc.author) {
      contractInfo.author = devDoc.author;
    }

    if (devDoc.title) {
      contractInfo.title = devDoc.title;
    }

    const events: EventsInfo = this.parseEventsInfo(devDoc, userDoc, abi);

    if (events) {
      contractInfo.events = events;
    }

    const functions: FunctionsInfo = this.parseFunctionsInfo(devDoc, userDoc, abi);

    if (functions) {
      contractInfo.functions = functions;
    }

    return contractInfo;
  }

  parseFunctionsInfo(devDoc: any, userDoc: any, abi: any): FunctionsInfo {
    const functionsInfo: FunctionsInfo = {};

    this.parseSignatures(abi, FUNCTION_TYPE).forEach((functionSign) => {
      const functionName = this.getNameFromSignature(functionSign);
      const stateMutability = this.getStateMutabilityByName(abi, functionName);

      if (!stateMutability) {
        throw new Error(`Failed to parse function ${functionSign}`);
      }

      const devDocFunctionInfo = devDoc.methods ? devDoc.methods[functionSign] : undefined;
      const userDocFunctionInfo = userDoc.methods ? userDoc.methods[functionSign] : undefined;

      functionsInfo[functionSign] = this.parseFunctionInfo(
        functionName,
        stateMutability,
        devDocFunctionInfo,
        userDocFunctionInfo
      );
    });

    return functionsInfo;
  }

  parseEventsInfo(devDoc: any, userDoc: any, abi: any): EventsInfo {
    const eventsInfo: EventsInfo = {};

    this.parseSignatures(abi, EVENT_TYPE).forEach((eventSign) => {
      const devDocEventInfo = devDoc.events ? devDoc.events[eventSign] : undefined;
      const userDocEventInfo = userDoc.events ? userDoc.events[eventSign] : undefined;

      eventsInfo[eventSign] = this.parseEventInfo(
        this.getNameFromSignature(eventSign),
        devDocEventInfo,
        userDocEventInfo
      );
    });

    return eventsInfo;
  }

  parseFunctionInfo(functionName: string, stateMutability: string, devDoc: any, userDoc: any): FunctionInfo {
    const functionInfo: FunctionInfo = { stateMutability, ...this.parseBaseMethodInfo(functionName, devDoc, userDoc) };

    const returns = this.parseReturns(devDoc);

    if (returns) {
      functionInfo.returns = returns;
    }

    return functionInfo;
  }

  parseEventInfo(eventName: string, devDoc: any, userDoc: any): EventInfo {
    return this.parseBaseMethodInfo(eventName, devDoc, userDoc);
  }

  parseBaseMethodInfo(methodName: string, devDoc: any, userDoc: any): BaseMethodInfo {
    const baseMethodInfo: BaseMethodInfo = {
      ...this.parseBaseDescription(methodName, devDoc, userDoc),
    };

    const params = this.parseParams(devDoc);

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

  parseParams(devDoc: any): Param[] | undefined {
    if (devDoc && devDoc.params) {
      const paramsArr: Param[] = [];

      Object.keys(devDoc.params).forEach((paramName) => {
        paramsArr.push({ paramName, paramDescription: devDoc.params[paramName] });
      });

      return paramsArr;
    }

    return undefined;
  }

  parseReturns(devDoc: any): Return[] | undefined {
    if (devDoc && devDoc.returns) {
      const returnsArr: Return[] = [];

      Object.keys(devDoc.returns).forEach((returnName) => {
        returnsArr.push({ returnName, returnDescription: devDoc.returns[returnName] });
      });

      return returnsArr;
    }

    return undefined;
  }

  parseSignatures(abi: any, filterType: string): string[] {
    const signatures: string[] = [];

    const filteredAbis: any = abi.filter((el: any) => {
      return el.type == filterType;
    });

    filteredAbis.forEach((el: any) => {
      signatures.push(this.parseFunctionSignature(el));
    });

    return signatures;
  }

  parseFunctionSignature(functionAbi: any): string {
    return `${functionAbi.name}(${functionAbi.inputs.map((inputElem: any) => this.getSignRecursive(inputElem))})`;
  }

  private getSignRecursive(funcAbi: any): string {
    return funcAbi.components ? `(${funcAbi.components.map((el: any) => this.getSignRecursive(el))})` : funcAbi.type;
  }

  private getStateMutabilityByName(abi: any, name: string): string | undefined {
    const foudAbi = abi.find((el: any) => {
      return el.type == FUNCTION_TYPE && el.name == name;
    });

    return foudAbi ? foudAbi.stateMutability : undefined;
  }

  private getNameFromSignature(sign: string): string {
    return sign.substring(0, sign.indexOf("("));
  }
}

export { Parser };
