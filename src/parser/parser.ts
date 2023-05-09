import { BuildInfo } from "hardhat/types";
import {
  ContractDefinition,
  Expression,
  FunctionDefinition,
  Identifier,
  ModifierInvocation,
  SourceUnit,
  VariableDeclaration,
} from "solidity-ast";
import { ASTDereferencer, astDereferencer, findAll, SrcDecoder, srcDecoder } from "solidity-ast/utils";
import { DEFAULT_LICENSE } from "./constants";
import { ContractInfo, Documentation, DocumentationLine, FunctionDefinitionWithParsedData } from "./types";

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
    // base
    const license = this.parseLicense(sourceUnit);
    const contractNode = sourceUnit.nodes.find(
      (node) => node.nodeType === "ContractDefinition" && node.name === name
    ) as ContractDefinition;

    const events = [...findAll("EventDefinition", contractNode)];
    const functions = this.parseFunctions(contractNode);
    const stateVariables = [...findAll("VariableDeclaration", contractNode)]; // TODO: do we need to parse this?
    const errors = [...findAll("ErrorDefinition", contractNode)];

    const documentation = new Map<Number, Documentation>();

    // added
    // const enums = this.parseEnums(contractNode);
    const enums = [...findAll("EnumDefinition", contractNode)];
    const structs = [...findAll("StructDefinition", contractNode)];
    const modifiers = [...findAll("ModifierDefinition", contractNode)];
    const usingForDirectives = [...findAll("UsingForDirective", contractNode)];
    const baseContracts = contractNode.baseContracts;
    const isAbstract = contractNode.abstract;
    const contractKind = contractNode.contractKind;

    const contractInfo: ContractInfo = {
      name: contractNode.name,
      license: license,
      baseDescription: this.parseDocumentation(contractNode),
      functions: functions,
      stateVariables: stateVariables,
      events: events,
      errors: errors,
      enums: enums,
      structs: structs,
      modifiers: modifiers,
      usingForDirectives: usingForDirectives,
      baseContracts: baseContracts,
      isAbstract: isAbstract,
      contractKind: contractKind,
      documentations: documentation,
    };
    this.addDocumentationToEachNode(contractInfo);

    this.writeToFile("contractBuildInfo", this.contractBuildInfo);
    this.writeToFile("documentations", [...documentation.entries()]);
    return contractInfo;
  }

  parseFunctions(contractDefinition: ContractDefinition): FunctionDefinitionWithParsedData[] {
    const functionGenerator = findAll("FunctionDefinition", contractDefinition);

    const functions: FunctionDefinitionWithParsedData[] = [];
    for (const functionDefinition of functionGenerator) {
      const functionDefinitionWithParsedData: FunctionDefinitionWithParsedData = {
        ...functionDefinition,
        fullMethodSign: this.parseFullMethodSign(functionDefinition),
        functionSelector: this.parseSelector(functionDefinition),
      };

      functions.push(functionDefinitionWithParsedData);
    }

    return functions;
  }

  parseSelector(functionDefinition: FunctionDefinition): string | undefined {
    if (functionDefinition.functionSelector) {
      return functionDefinition.functionSelector;
    }
    if (
      functionDefinition.kind === "constructor" ||
      functionDefinition.kind === "fallback" ||
      functionDefinition.kind === "receive"
    ) {
      return;
    }
    if (!functionDefinition.baseFunctions) {
      return;
    }

    for (const baseFunction of this.parseBaseFunctions(functionDefinition.baseFunctions)) {
      if (baseFunction.functionSelector) {
        return baseFunction.functionSelector;
      }
    }
  }

  parseBaseFunctions(ids: number[]): FunctionDefinition[] {
    return ids.map((id) => this.deref("FunctionDefinition", id));
  }

  parseFullMethodSign(functionDefinition: FunctionDefinition): string {
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

  addDocumentationToEachNode(contractInfo: ContractInfo) {
    const nodes = [
      ...contractInfo.functions,
      ...contractInfo.stateVariables,
      ...contractInfo.events,
      ...contractInfo.errors,
      ...contractInfo.enums,
      ...contractInfo.structs,
    ];

    for (const node of nodes) {
      const documentation: Documentation = {
        documentationLines: this.parseDocumentation(node),
      };
      contractInfo.documentations.set(node.id, documentation);
    }
  }

  parseLicense(node: SourceUnit): string {
    return node.license || DEFAULT_LICENSE;
  }

  deleteComments(text: string): string {
    const reCommentSymbols = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
    const reSpaceAtBeginningOfLine = /^[ \t]*[ \t]?/gm;
    return text.replace(reCommentSymbols, "").replace(reSpaceAtBeginningOfLine, "").trim();
  }

  parseDocumentation(node: any): DocumentationLine[] {
    if (node.documentation == null) {
      return [];
    }
    const text = this.deleteComments(node.documentation.text);

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
