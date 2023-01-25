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
  selector: string;
  returns?: Return[];
}

export interface ErrorInfo extends BaseMethodInfo {}

export interface EventInfo extends BaseMethodInfo {}

export interface BaseMethodInfo extends BaseDescription {
  methodAbi: any;
  fullMethodSign: FullMethodSign;
  params?: Param[];
}

export interface FullMethodSign {
  methodType: string;
  methodName: string;
  modifiers?: string[];
  parameters?: string[];
  returns?: string[];
}

export interface BaseDescription {
  name: string;
  notice?: string;
  details?: string;
}

export interface Param extends BaseElement {
  isIndexed?: boolean;
}

export interface Return extends BaseElement {}

export interface BaseElement {
  name: string;
  type: string;
  description: string;
}
