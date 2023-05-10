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
  functions: FunctionDefinitionWithDocumentation[];
  stateVariables: VariableDeclarationWithDocumentation[];
  events: EventDefinitionWithDocumentation[];
  errors: ErrorDefinitionWithDocumentation[];
  enums: EnumDefinitionWithDocumentation[];
  structs: StructDefinitionWithDocumentation[];
  modifiers: ModifierDefinitionWithDocumentation[];
  usingForDirectives: UsingForDirectiveWithDocumentation[];
  baseContracts: InheritanceSpecifier[];
  isAbstract: boolean;
  contractKind: "contract" | "interface" | "library";
}

export interface FunctionDefinitionWithDocumentation extends FunctionDefinition, Documentation {}

export interface VariableDeclarationWithDocumentation extends VariableDeclaration, Documentation {}

export interface EventDefinitionWithDocumentation extends EventDefinition, Documentation {}

export interface ErrorDefinitionWithDocumentation extends ErrorDefinition, Documentation {}

export interface EnumDefinitionWithDocumentation extends EnumDefinition, Documentation {}

export interface StructDefinitionWithDocumentation extends StructDefinition, Documentation {}

export interface ModifierDefinitionWithDocumentation extends ModifierDefinition, Documentation {}

export interface UsingForDirectiveWithDocumentation extends UsingForDirective, Documentation {}

export interface Documentation {
  documentationLines: DocumentationLine[];
  fullSign: string;
}

export interface DocumentationLine {
  tag: string;
  description: string;
}
