import { BuildInfo } from "hardhat/types";
import {
  ContractDefinition,
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  FunctionDefinition,
  ModifierDefinition,
  ModifierInvocation,
  SourceLocation,
  SourceUnit,
  StructDefinition,
  VariableDeclaration,
} from "solidity-ast";
import { Node } from "solidity-ast/node";
import { ASTDereferencer, astDereferencer, findAll, isNodeType } from "solidity-ast/utils";
import {
  CONSTANTS_BLOCK_NAME,
  DEFAULT_LICENSE,
  ENUMS_BLOCK_NAME,
  ERRORS_BLOCK_NAME,
  EVENTS_BLOCK_NAME,
  FUNCTIONS_BLOCK_NAME,
  MODIFIERS_BLOCK_NAME,
  STATE_VARIABLES_BLOCK_NAME,
  STRUCTS_BLOCK_NAME,
} from "./constants";
import { ContractInfo, DocumentationBlock, NatSpecDocumentation } from "./types";

import pluginSolidity from "prettier-plugin-solidity";
import prettier = require("prettier");

export class Parser {
  private contractBuildInfo: BuildInfo;
  private deref: ASTDereferencer;

  constructor(contractBuildInfo: BuildInfo) {
    this.contractBuildInfo = contractBuildInfo;

    this.deref = astDereferencer(contractBuildInfo.output);
  }

  async parseContractInfo(source: string, name: string): Promise<ContractInfo> {
    const sourceUnit: SourceUnit = this.contractBuildInfo.output.sources[source].ast;
    const contractNode: ContractDefinition = sourceUnit.nodes.find(
      (node) => isNodeType("ContractDefinition", node) && node.name === name,
    ) as ContractDefinition;

    if (!contractNode) {
      throw new Error(`Contract ${name} not found in ${source}`);
    }

    const allFunctions: FunctionDefinition[] = [...findAll("FunctionDefinition", contractNode)];

    let functions: FunctionDefinition[];

    if (contractNode.contractKind === "library" && allFunctions.every((fn) => this.isPrivateOrInternal(fn))) {
      functions = allFunctions.filter((node) => this.isInternal(node));
    } else {
      functions = allFunctions.filter((node) => this.isPublicOrExternal(node));
    }

    return {
      name: contractNode.name,
      isAbstract: contractNode.abstract,
      contractKind: contractNode.contractKind,
      license: this.parseLicense(sourceUnit),
      documentations: await Promise.all([
        this.parseDocumentation([contractNode], ""),
        this.parseDocumentation([...findAll("EnumDefinition", contractNode)], ENUMS_BLOCK_NAME),
        this.parseDocumentation([...findAll("StructDefinition", contractNode)], STRUCTS_BLOCK_NAME),
        this.parseDocumentation([...findAll("EventDefinition", contractNode)], EVENTS_BLOCK_NAME),
        this.parseDocumentation([...findAll("ErrorDefinition", contractNode)], ERRORS_BLOCK_NAME),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => node.constant && this.isPublicOrExternal(node),
          ),
          CONSTANTS_BLOCK_NAME,
        ),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => !node.constant && this.isPublicOrExternal(node),
          ),
          STATE_VARIABLES_BLOCK_NAME,
        ),
        this.parseDocumentation([...findAll("ModifierDefinition", contractNode)], MODIFIERS_BLOCK_NAME),
        this.parseDocumentation(functions, FUNCTIONS_BLOCK_NAME),
      ]),
    };
  }

  isInternal(node: FunctionDefinition | VariableDeclaration): boolean {
    return node.visibility === "internal";
  }

  isPrivateOrInternal(node: FunctionDefinition | VariableDeclaration): boolean {
    return node.visibility === "private" || this.isInternal(node);
  }

  isPublicOrExternal(node: FunctionDefinition | VariableDeclaration): boolean {
    return node.visibility === "public" || node.visibility === "external";
  }

  parseSelector(node: FunctionDefinition | VariableDeclaration): string {
    return node.functionSelector ? ` (0x${node.functionSelector})` : "";
  }

  async applyPrettier(text: string): Promise<string> {
    return (await prettier.format(text, { parser: "solidity-parse", plugins: [pluginSolidity] })).trim();
  }

  parseHeader(node: any): string {
    switch (node.nodeType) {
      case "FunctionDefinition": {
        return `${node.name ? node.name : node.kind}${this.parseSelector(node)}`;
      }
      case "VariableDeclaration": {
        return `${node.name}${this.parseSelector(node)}`;
      }
      case "ContractDefinition": {
        return "";
      }
      default: {
        return node.name;
      }
    }
  }

  async parseFullSign(node: any): Promise<string> {
    switch (node.nodeType) {
      case "FunctionDefinition": {
        return this.parseFullFunctionSign(node);
      }
      case "VariableDeclaration": {
        return this.parseFullStateVariableSign(node);
      }
      case "EventDefinition": {
        return this.parseFullEventSign(node);
      }
      case "ErrorDefinition": {
        return this.parseFullErrorSign(node);
      }
      case "EnumDefinition": {
        return this.parseFullEnumSign(node);
      }
      case "StructDefinition": {
        return this.parseFullStructSign(node);
      }
      case "ModifierDefinition": {
        return this.parseFullModifierSign(node);
      }
      case "ContractDefinition": {
        return this.parseFullContractSign(node);
      }
      default: {
        throw new Error(`Unknown node type ${node.nodeType}`);
      }
    }
  }

  async parseDocumentation(nodes: Node[], name: string): Promise<DocumentationBlock> {
    return {
      blockName: name,
      documentation: await Promise.all(
        nodes.map(async (node) => ({
          fullSign: await this.parseFullSign(node),
          header: this.parseHeader(node),
          natSpecDocumentation: this.parseNatSpecDocumentation(node),
        })),
      ),
    };
  }

  removeTypePrefix(typeString: string): string {
    if (typeString.includes("enum ")) {
      return typeString.replace("enum ", "");
    } else if (typeString.includes("struct ")) {
      return typeString.replace("struct ", "");
    } else if (typeString.includes("contract ")) {
      return typeString.replace("contract ", "");
    }

    return typeString;
  }

  buildParameterString(
    parameters: VariableDeclaration[],
    delimiter: string = ", ",
    beginning: string = "",
    ending: string = "",
  ): string {
    return parameters
      .map((variableDeclaration) => {
        return `${beginning}${this.removeTypePrefix(variableDeclaration.typeDescriptions.typeString || "")}${
          variableDeclaration.storageLocation === "default" ? "" : ` ${variableDeclaration.storageLocation}`
        }${variableDeclaration.indexed ? " indexed" : ""}${
          variableDeclaration.name ? ` ${variableDeclaration.name}` : ""
        }${ending}`;
      })
      .join(delimiter);
  }

  parseModifiersString(modifiers: ModifierInvocation[]): string {
    return modifiers
      .map(
        (modifier) =>
          modifier.modifierName.name +
          (modifier.arguments
            ? `(${modifier.arguments
                .map((expression) => {
                  // EXPERIMENTAL
                  return this.parseStringFromSourceCode(expression.src);
                })
                .join(", ")})`
            : ""),
      )
      .join(" ");
  }

  async parseFullFunctionSign(functionDefinition: FunctionDefinition): Promise<string> {
    const kind = functionDefinition.kind;
    const functionName = functionDefinition.name.length === 0 ? "" : ` ${functionDefinition.name}`;
    const parameters = this.buildParameterString(functionDefinition.parameters.parameters);
    const visibility = kind === "constructor" ? "" : ` ${functionDefinition.visibility}`;
    const stateMutability =
      functionDefinition.stateMutability === "nonpayable" ? "" : ` ${functionDefinition.stateMutability}`;
    const modifiers =
      functionDefinition.modifiers.length === 0 ? "" : ` ${this.parseModifiersString(functionDefinition.modifiers)}`;

    const virtual = functionDefinition.virtual ? " virtual" : "";
    const overrides = functionDefinition.overrides ? " override" : "";
    const returns =
      functionDefinition.returnParameters.parameters.length === 0
        ? ""
        : ` returns (${this.buildParameterString(functionDefinition.returnParameters.parameters)})`;

    const formattedRes = await this.applyPrettier(
      `${kind}${functionName}(${parameters})${visibility}${stateMutability}${modifiers}${virtual}${overrides}${returns};`,
    );

    return formattedRes.substring(0, formattedRes.length - 1);
  }

  parseStringFromSourceCode(src: SourceLocation): string {
    const [start, end, id] = src.split(":").map((x) => parseInt(x));

    const sourceFile =
      this.contractBuildInfo.input.sources[
        Object.values(this.contractBuildInfo.output.sources).find((source) => source.id === id)?.ast.absolutePath
      ].content;

    return Buffer.from(sourceFile, "utf-8")
      .subarray(start, start + end)
      .toString();
  }

  parseFullStateVariableSign(stateVariable: VariableDeclaration): string {
    let res = `${stateVariable.typeDescriptions.typeString}${
      stateVariable.mutability === "mutable" ? "" : ` ${stateVariable.mutability}`
    } ${stateVariable.name}`;

    // EXPERIMENTAL
    if (stateVariable.value) {
      res += ` = ${this.parseStringFromSourceCode(stateVariable.value.src)}`;
    }

    return res;
  }

  parseFullEventSign(eventDefinition: EventDefinition): string {
    return `event ${eventDefinition.name}(${this.buildParameterString(eventDefinition.parameters.parameters)})${
      eventDefinition.anonymous ? " anonymous" : ""
    }`;
  }

  parseFullErrorSign(errorDefinition: ErrorDefinition): string {
    return `error ${errorDefinition.name}(${this.buildParameterString(errorDefinition.parameters.parameters)})`;
  }

  parseFullStructSign(structDefinition: StructDefinition): string {
    return `struct ${structDefinition.name} {\n${this.buildParameterString(
      structDefinition.members,
      "\n",
      "\t",
      ";",
    )}\n}`;
  }

  parseFullEnumSign(enumDefinition: EnumDefinition): string {
    const parameters = enumDefinition.members.map((enumValue) => `\t ${enumValue.name}`).join(",\n");

    return `enum ${enumDefinition.name} {\n${parameters}\n}`;
  }

  parseFullModifierSign(modifierDefinition: ModifierDefinition): string {
    return `modifier ${modifierDefinition.name}(${this.buildParameterString(
      modifierDefinition.parameters.parameters,
    )})`;
  }

  parseFullContractSign(contractDefinition: ContractDefinition): string {
    return `${contractDefinition.abstract ? "abstract " : ""}${contractDefinition.contractKind} ${
      contractDefinition.name
    }${
      contractDefinition.baseContracts.length === 0
        ? ""
        : ` is ${contractDefinition.baseContracts.map((x) => x.baseName.name).join(", ")}`
    }`;
  }

  parseLicense(node: SourceUnit): string {
    return node.license || DEFAULT_LICENSE;
  }

  deleteCommentSymbols(text: string): string {
    let inCommentBlock = false;
    let startOfCommentBlock = false;
    let spacesToRemove = 0;

    return text
      .replace(/^\/\*\*([\s\S]*?)\*\/$/m, "$1")
      .trim()
      .replace(/^[ \t]*((\*{1,2}|\/{2,3}))+([ \t]*)(.*\n?)/gm, (match, p1, p2, p3, p4) => {
        if (p4.includes("```")) {
          inCommentBlock = !inCommentBlock;
          startOfCommentBlock = true;
          return p4;
        }

        if (inCommentBlock) {
          if (startOfCommentBlock) {
            spacesToRemove = p3.length;
            startOfCommentBlock = false;
          }

          return p3.substring(spacesToRemove) + p4;
        }

        return p4;
      })
      .trim();
  }

  replaceMultipleNewLinesWithOne(text: string): string {
    return text.replace(/\n{3,}/g, "\n");
  }

  getValidParentNodeToInheritDocumentation(
    baseNode: FunctionDefinition | VariableDeclaration,
  ): FunctionDefinition | null {
    if (!baseNode.baseFunctions || baseNode.baseFunctions.length !== 1) {
      return null;
    }

    const parentNode = this.deref("FunctionDefinition", baseNode.baseFunctions[0]);

    if (isNodeType("VariableDeclaration", baseNode)) {
      return parentNode;
    }

    if (baseNode.parameters.parameters.length !== parentNode.parameters.parameters.length) {
      return null;
    }

    for (let i = 0; i < baseNode.parameters.parameters.length; i++) {
      if (baseNode.parameters.parameters[i].name !== parentNode.parameters.parameters[i].name) {
        return null;
      }
    }

    return parentNode;
  }

  findFunctionDefinitionByContractName(
    node: FunctionDefinition | VariableDeclaration,
    contractName: string,
  ): FunctionDefinition | undefined {
    const contract = this.deref("ContractDefinition", node.scope);

    if (contract.canonicalName === contractName || contract.name === contractName) {
      return node as FunctionDefinition;
    }

    if (!node.baseFunctions) {
      return undefined;
    }

    for (let i = 0; i < node.baseFunctions.length; i++) {
      const baseFunction = this.deref("FunctionDefinition", node.baseFunctions[i]);
      const result = this.findFunctionDefinitionByContractName(baseFunction, contractName);

      if (result) {
        return result;
      }
    }
  }

  findModifierDefinitionByContractName(node: ModifierDefinition, contractName: string): ModifierDefinition | undefined {
    // Since we cannot access the scope (Contract) in which the modifier is defined,
    // we are looking for the topmost parent modifier documentation without the @inheritdoc tag.
    const inheritDocsRegex = /@inheritdoc (\w+)/gm;
    const matches = inheritDocsRegex.exec(node.documentation?.text!);

    if (!matches) {
      return node as ModifierDefinition;
    }

    if (!node.baseModifiers) {
      return undefined;
    }

    for (let i = 0; i < node.baseModifiers.length; i++) {
      const baseModifier = this.deref("ModifierDefinition", node.baseModifiers[i]);
      const result = this.findModifierDefinitionByContractName(baseModifier, contractName);

      if (result) {
        return result;
      }
    }
  }

  parseNameAndDescription(text: string): [name: string, description: string] {
    const nameAndDescriptionRegex = /^(\w+).? ([\s\S]*)?/gm;
    const matches = nameAndDescriptionRegex.exec(text);

    if (!matches) {
      throw new Error(`Invalid name and description: ${text}`);
    }

    const [, name, description] = matches;

    return [name, description];
  }

  joinDescriptionLines(text: string): string {
    return text.replace(/\n/g, " ");
  }

  parseNatSpecDocumentation(baseNode: any): NatSpecDocumentation {
    const natSpec: NatSpecDocumentation = {};
    const nodes = [baseNode];

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];

      if (!node.documentation) {
        const parentNode = this.getValidParentNodeToInheritDocumentation(node);

        if (parentNode) {
          nodes.push(parentNode);
        }

        continue;
      }

      let sourceText: string = this.parseStringFromSourceCode(node.documentation.src);

      if (sourceText) {
        const text = this.deleteCommentSymbols(sourceText);

        const natSpecRegex = /^(?:@(\w+|custom:[a-z][a-z-]*) )?((?:(?!^@(?:\w+|custom:[a-z][a-z-]*) )[^])*)/gm;

        const matches = [...text.matchAll(natSpecRegex)];

        for (let i = 0; i < matches.length; i++) {
          const [, tag = "notice", rawText] = matches[i];
          const text = this.replaceMultipleNewLinesWithOne(rawText);

          switch (tag) {
            case "title": {
              break;
            }
            case "author": {
              if (!natSpec.author) {
                natSpec.author = text;
              }

              break;
            }
            case "notice": {
              if (!natSpec.notice) {
                natSpec.notice = text;
              }

              break;
            }
            case "dev": {
              if (!natSpec.dev) {
                natSpec.dev = text;
              }

              break;
            }
            case "param": {
              natSpec.params ??= [];

              const [paramName, paramDescriptionRaw] = this.parseNameAndDescription(text);
              const paramDescription = this.joinDescriptionLines(paramDescriptionRaw);

              // if tag is already defined, skip it
              if (natSpec.params.find((param) => param.name == paramName)) {
                continue;
              }

              let params: VariableDeclaration[];

              if (node.nodeType === "EnumDefinition" || node.nodeType === "StructDefinition") {
                params = node.members;
              } else {
                params = node.parameters.parameters;
              }

              const variableDeclaration = params.find((param) => param.name == paramName);

              // so that tag was not found, and it may be a return tag
              if (!variableDeclaration) {
                // protection from infinite loop
                if (node.nodeType !== "EventDefinition") {
                  matches[i][1] = "return";
                  i--;
                }
                break;
              }

              const type = variableDeclaration.typeDescriptions?.typeString || undefined;

              natSpec.params.push({ name: paramName, type: type, description: paramDescription });

              break;
            }
            case "return": {
              // there is no return tag in events, so it is a param tag
              if (node.nodeType === "EventDefinition") {
                matches[i][1] = "param";
                i--;
                break;
              }

              natSpec.returns ??= [];

              let currentParameter: VariableDeclaration = isNodeType("FunctionDefinition", node)
                ? node.returnParameters.parameters[natSpec.returns.length]
                : node;

              if (!currentParameter) {
                break;
              }

              const currentParameterName = currentParameter.name;
              const type = currentParameter.typeDescriptions?.typeString!;

              // if name is not defined for return parameter
              if (!currentParameterName) {
                natSpec.returns.push({ type: type, description: this.joinDescriptionLines(text) });
              } else {
                const [paramName, paramDescriptionRaw] = this.parseNameAndDescription(text);
                const paramDescription = this.joinDescriptionLines(paramDescriptionRaw);

                if (paramName !== currentParameterName) {
                  break;
                }

                natSpec.returns.push({ name: paramName, type: type, description: paramDescription });
              }

              break;
            }
            case tag.startsWith("custom:") ? tag : "": {
              const customTag = tag.replace("custom:", "");

              natSpec.custom ??= {};
              natSpec.custom[customTag] = text;

              break;
            }
            case "inheritdoc": {
              const parentNodeRegex = /^(\w+)$/gm;
              const matches = parentNodeRegex.exec(text);

              if (!matches) {
                throw new Error(`Invalid inheritdoc tag: ${text}`);
              }

              const [, parentName] = matches;

              let parentNode;
              if (node.nodeType === "FunctionDefinition") {
                parentNode = this.findFunctionDefinitionByContractName(node, parentName);
              } else if (node.nodeType === "ModifierDefinition") {
                parentNode = this.findModifierDefinitionByContractName(node, parentName);
              }

              if (!parentNode) {
                throw new Error(`Invalid inheritdoc tag: ${text}`);
              }

              nodes.push(parentNode);

              break;
            }
            default: {
              throw new Error(`Unknown tag: ${tag}`);
            }
          }
        }
      }
    }

    return natSpec;
  }
}
