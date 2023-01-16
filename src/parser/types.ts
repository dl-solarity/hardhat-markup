export interface ContractInfo extends BaseDescription {
  title?: string;
  author?: string;
  functions?: FunctionsInfo;
  events?: EventsInfo;
  errors?: ErrorsInfo;
}

export interface FunctionsInfo {
  [funcSig: string]: FunctionInfo;
}

export interface ErrorsInfo {
  [errorSig: string]: ErrorInfo;
}

export interface EventsInfo {
  [eventSig: string]: EventInfo;
}

export interface FunctionInfo extends BaseMethodInfo {
  stateMutability: string;
  selector: string;
  returns?: Return[];
}

export interface ErrorInfo extends BaseMethodInfo {}

export interface EventInfo extends BaseMethodInfo {}

export interface BaseMethodInfo extends BaseDescription {
  params?: Param[];
}

export interface BaseDescription {
  name: string;
  notice?: string;
  details?: string;
}

export interface Param {
  paramName: string;
  paramDescription: string;
  isIndexed?: boolean;
}

export interface Return {
  returnName: string;
  returnDescription: string;
}
