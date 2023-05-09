import {
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  FunctionDefinition,
  InheritanceSpecifier,
  ModifierDefinition,
  StructDefinition,
  UsingForDirective,
  VariableDeclaration,
} from "solidity-ast";

export interface ContractInfo {
  name: string;
  license: string;
  baseDescription: DocumentationLine[];
  functions: FunctionDefinitionWithParsedData[];
  stateVariables: VariableDeclaration[];
  events: EventDefinition[];
  errors: ErrorDefinition[];
  enums: EnumDefinition[];
  structs: StructDefinition[];
  modifiers: ModifierDefinition[];
  usingForDirectives: UsingForDirective[];
  baseContracts: InheritanceSpecifier[];
  isAbstract: boolean;
  contractKind: "contract" | "interface" | "library";
  documentations: Map<Number, Documentation>;
}

export interface FunctionDefinitionWithParsedData extends FunctionDefinition {
  fullMethodSign: string;
}

export interface Documentation {
  documentationLines: DocumentationLine[];
}

export interface DocumentationLine {
  tag: string;
  description: string;
}
