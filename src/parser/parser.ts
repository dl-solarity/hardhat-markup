import { BuildInfo } from "hardhat/types";
import {
  ContractDefinition,
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  Expression,
  FunctionDefinition,
  Identifier,
  ModifierDefinition,
  ModifierInvocation,
  SourceUnit,
  StructDefinition,
  StructuredDocumentation,
  UsingForDirective,
  VariableDeclaration,
} from "solidity-ast";
import { ASTDereferencer, astDereferencer, findAll, SrcDecoder, srcDecoder } from "solidity-ast/utils";
import { DEFAULT_LICENSE } from "./constants";
import {
  ContractInfo,
  Documentation,
  DocumentationLine,
  EnumDefinitionWithDocumentation,
  ErrorDefinitionWithDocumentation,
  EventDefinitionWithDocumentation,
  FunctionDefinitionWithDocumentation,
  ModifierDefinitionWithDocumentation,
  StructDefinitionWithDocumentation,
  UsingForDirectiveWithDocumentation,
  VariableDeclarationWithDocumentation,
} from "./types";

class Parser {
  private contractBuildInfo: BuildInfo;
  private deref: ASTDereferencer;
  private decodeSrc: SrcDecoder;

  constructor(contractBuildInfo: BuildInfo) {
    this.contractBuildInfo = contractBuildInfo;

    this.deref = astDereferencer(contractBuildInfo.output);
    this.decodeSrc = srcDecoder(contractBuildInfo.input, contractBuildInfo.output);
  }

  writeToFile(fileName: string, data: any) {
    var fs = require("fs");
    fs.writeFile("parser2/" + fileName + ".json", JSON.stringify(data), "utf8", function () {});
  }

  parseContractInfo(source: string, name: string): ContractInfo {
    const desiredSource = this.contractBuildInfo.output.sources[source];
    const sourceUnit = desiredSource.ast as SourceUnit;

    const license = this.parseLicense(sourceUnit);
    const contractNode = sourceUnit.nodes.find(
      (node) => node.nodeType === "ContractDefinition" && node.name === name
    ) as ContractDefinition;

    const contractInfo: ContractInfo = {
      name: contractNode.name,
      license: license,
      baseDescription: this.parseDocumentation(contractNode),
      functions: this.parseFunctions(contractNode),
      stateVariables: this.parseStateVariables(contractNode),
      events: this.parseEvents(contractNode),
      errors: this.parseErrors(contractNode),
      enums: this.parseEnums(contractNode),
      structs: this.parseStructs(contractNode),
      modifiers: this.parseModifiers(contractNode),
      usingForDirectives: this.parseUsingForDirectives(contractNode),
      baseContracts: contractNode.baseContracts,
      isAbstract: contractNode.abstract,
      contractKind: contractNode.contractKind,
    };

    return contractInfo;
  }

  parseFunctions(contractDefinition: ContractDefinition): FunctionDefinitionWithDocumentation[] {
    const functionGenerator = findAll("FunctionDefinition", contractDefinition);

    const functions: FunctionDefinitionWithDocumentation[] = [];
    for (const functionDefinition of functionGenerator) {
      const functionDefinitionWithParsedData: FunctionDefinitionWithDocumentation = {
        ...functionDefinition,
        fullSign: this.parseFullFunctionSign(functionDefinition),
        documentationLines: this.parseDocumentation(functionDefinition),
      };

      functions.push(functionDefinitionWithParsedData);
    }

    return functions;
  }

  parseStateVariables(contractDefinition: ContractDefinition): VariableDeclarationWithDocumentation[] {
    const stateVariableGenerator = findAll("VariableDeclaration", contractDefinition);

    const stateVariables: VariableDeclarationWithDocumentation[] = [];
    for (const stateVariable of stateVariableGenerator) {
      const stateVariableWithParsedData: VariableDeclarationWithDocumentation = {
        ...stateVariable,
        fullSign: this.parseFullStateVariableSign(stateVariable),
        documentationLines: [],
        // documentationLines: this.parseDocumentation(stateVariable),
      };

      stateVariables.push(stateVariableWithParsedData);
    }

    return stateVariables;
  }

  parseEvents(contractDefinition: ContractDefinition): EventDefinitionWithDocumentation[] {
    const eventGenerator = findAll("EventDefinition", contractDefinition);

    const events: EventDefinitionWithDocumentation[] = [];
    for (const event of eventGenerator) {
      const eventWithParsedData: EventDefinitionWithDocumentation = {
        ...event,
        fullSign: this.parseFullEventSign(event),
        documentationLines: this.parseDocumentation(event),
      };

      events.push(eventWithParsedData);
    }

    return events;
  }

  parseErrors(contractDefinition: ContractDefinition): ErrorDefinitionWithDocumentation[] {
    const errorGenerator = findAll("ErrorDefinition", contractDefinition);

    const errors: ErrorDefinitionWithDocumentation[] = [];
    for (const error of errorGenerator) {
      const errorWithParsedData: ErrorDefinitionWithDocumentation = {
        ...error,
        fullSign: this.parseFullErrorSign(error),
        documentationLines: this.parseDocumentation(error),
      };

      errors.push(errorWithParsedData);
    }

    return errors;
  }

  parseEnums(contractDefinition: ContractDefinition): EnumDefinitionWithDocumentation[] {
    const enumGenerator = findAll("EnumDefinition", contractDefinition);

    const enums: EnumDefinitionWithDocumentation[] = [];
    for (const enumDefinition of enumGenerator) {
      const enumDefinitionWithParsedData: EnumDefinitionWithDocumentation = {
        ...enumDefinition,
        fullSign: this.parseFullEnumSign(enumDefinition),
        documentationLines: this.parseDocumentation(enumDefinition),
      };

      enums.push(enumDefinitionWithParsedData);
    }

    return enums;
  }

  parseStructs(contractDefinition: ContractDefinition): StructDefinitionWithDocumentation[] {
    const structGenerator = findAll("StructDefinition", contractDefinition);

    const structs: StructDefinitionWithDocumentation[] = [];
    for (const struct of structGenerator) {
      const structWithParsedData: StructDefinitionWithDocumentation = {
        ...struct,
        fullSign: this.parseFullStructSign(struct),
        documentationLines: this.parseDocumentation(struct),
      };

      structs.push(structWithParsedData);
    }

    return structs;
  }

  parseModifiers(contractDefinition: ContractDefinition): ModifierDefinitionWithDocumentation[] {
    const modifierGenerator = findAll("ModifierDefinition", contractDefinition);

    const modifiers: ModifierDefinitionWithDocumentation[] = [];
    for (const modifier of modifierGenerator) {
      const modifierWithParsedData: ModifierDefinitionWithDocumentation = {
        ...modifier,
        fullSign: this.parseFullModifierSign(modifier),
        documentationLines: this.parseDocumentation(modifier),
      };

      modifiers.push(modifierWithParsedData);
    }

    return modifiers;
  }

  parseUsingForDirectives(contractDefinition: ContractDefinition): UsingForDirectiveWithDocumentation[] {
    const usingForDirectiveGenerator = findAll("UsingForDirective", contractDefinition);

    const usingForDirectives: UsingForDirectiveWithDocumentation[] = [];
    for (const usingForDirective of usingForDirectiveGenerator) {
      const usingForDirectiveWithParsedData: UsingForDirectiveWithDocumentation = {
        ...usingForDirective,
        fullSign: this.parseFullUsingForDirectiveSign(usingForDirective),
        documentationLines: this.parseDocumentation(usingForDirective),
      };

      usingForDirectives.push(usingForDirectiveWithParsedData);
    }

    return usingForDirectives;
  }

  parseFullFunctionSign(functionDefinition: FunctionDefinition): string {
    const kind = functionDefinition.kind;
    const functionName = functionDefinition.name.length === 0 ? "" : ` ${functionDefinition.name}`;
    const parameters = functionDefinition.parameters.parameters
      .map(
        (variableDeclaration: VariableDeclaration) =>
          variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name
      )
      .join(", ");
    const visibility = kind === "constructor" ? "" : ` ${functionDefinition.visibility}`;
    const stateMutability =
      functionDefinition.stateMutability === "nonpayable" ? "" : ` ${functionDefinition.stateMutability}`;
    const modifiers =
      functionDefinition.modifiers.length === 0
        ? ""
        : " " +
          functionDefinition.modifiers
            .map(
              (modifier: ModifierInvocation) =>
                modifier.modifierName.name +
                (modifier.arguments
                  ? `(${modifier.arguments
                      .map((expression: Expression) => (expression as Identifier).name)
                      .join(", ")})`
                  : "")
            )
            .join(" ");

    const virtual = functionDefinition.virtual ? " virtual" : "";
    const overrides = functionDefinition.overrides ? " override" : "";
    const returns =
      functionDefinition.returnParameters.parameters.length === 0
        ? ""
        : " returns (" +
          functionDefinition.returnParameters.parameters
            .map((variableDeclaration: VariableDeclaration) =>
              (variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name).trim()
            )
            .join(", ") +
          ")";
    const fullMethodSign: string = `${kind}${functionName}(${parameters})${visibility}${stateMutability}${modifiers}${virtual}${overrides}${returns}`;

    return fullMethodSign;
  }

  parseFullStateVariableSign(stateVariable: VariableDeclaration): string {
    return "";
  }

  parseFullEventSign(eventDefinition: EventDefinition): string {
    const parameters = eventDefinition.parameters.parameters
      .map((variableDeclaration) => variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name)
      .join(", ");

    return `event ${eventDefinition.name}(${parameters})`;
  }

  parseFullErrorSign(errorDefinition: ErrorDefinition): string {
    const parameters = errorDefinition.parameters.parameters
      .map((variableDeclaration) => variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name)
      .join(", ");

    return `error ${errorDefinition.name}(${parameters})`;
  }

  parseFullStructSign(structDefinition: StructDefinition): string {
    const parameters = structDefinition.members
      .map(
        (variableDeclaration) =>
          "\t" + variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name + ";"
      )
      .join("\n");

    return `struct ${structDefinition.name} {\n${parameters}\n}`;
  }

  parseFullEnumSign(enumDefinition: EnumDefinition): string {
    const parameters = enumDefinition.members.map((enumValue) => "\t" + enumValue.name).join(",\n");

    return `enum ${enumDefinition.name} {\n${parameters}\n}`;
  }

  parseFullModifierSign(modifierDefinition: ModifierDefinition): string {
    const parameters = modifierDefinition.parameters.parameters
      .map((variableDeclaration) => variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name)
      .join(", ");

    return `modifier ${modifierDefinition.name}(${parameters})`;
  }

  parseFullUsingForDirectiveSign(usingForDirective: UsingForDirective): string {
    return `using ${usingForDirective.libraryName?.name} for ${usingForDirective.typeName?.typeDescriptions.typeString}`;
  }

  parseLicense(node: SourceUnit): string {
    return node.license || DEFAULT_LICENSE;
  }

  deleteComments(text: string): string {
    const reCommentSymbols = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
    const reSpaceAtBeginningOfLine = /^[ \t]*[ \t]?/gm;
    return text.replace(reCommentSymbols, "").replace(reSpaceAtBeginningOfLine, "").trim();
  }

  getNearestDocumentation(node: FunctionDefinition): string | null {
    if (node.documentation) {
      return node.documentation.text;
    }
    if (node.baseFunctions) {
      for (const id of node.baseFunctions) {
        const newNode = this.deref(node.nodeType, id);
        const documentation = this.getNearestDocumentation(newNode);
        if (documentation) {
          return documentation;
        }
      }
    }
    return null;
  }

  parseDocumentation(node: any): DocumentationLine[] {
    const sourceText = this.getNearestDocumentation(node);
    if (!sourceText) {
      return [];
    }

    const text = this.deleteComments(sourceText);

    const natSpecRegex = /^(?:@(\w+|custom:[a-z][a-z-]*) )?((?:(?!^@(?:\w+|custom:[a-z][a-z-]*) )[^])*)/gm;

    const matches = [...text.matchAll(natSpecRegex)];

    const documentationLines: DocumentationLine[] = matches.map((match) => {
      const [, tag, text] = match;
      return {
        tag: tag || "notice",
        description: text,
      };
    });

    return documentationLines;
  }
}

export { Parser };
