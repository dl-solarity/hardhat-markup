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

class Parser {
  private contractBuildInfo: BuildInfo;
  private deref: ASTDereferencer;

  constructor(contractBuildInfo: BuildInfo) {
    this.contractBuildInfo = contractBuildInfo;

    this.deref = astDereferencer(contractBuildInfo.output);
  }

  parseContractInfo(source: string, name: string): ContractInfo {
    const sourceUnit: SourceUnit = this.contractBuildInfo.output.sources[source].ast;

    const contractNode: ContractDefinition = sourceUnit.nodes.find(
      (node) => isNodeType("ContractDefinition", node) && node.name === name
    ) as ContractDefinition;
    if (!contractNode) throw new Error(`Contract ${name} not found in ${source}`);

    const contractInfo: ContractInfo = {
      name: contractNode.name,
      isAbstract: contractNode.abstract,
      contractKind: contractNode.contractKind,
      license: this.parseLicense(sourceUnit),
      documentations: [
        this.parseDocumentation([contractNode], ""),
        this.parseDocumentation([...findAll("EnumDefinition", contractNode)], ENUMS_BLOCK_NAME),
        this.parseDocumentation([...findAll("StructDefinition", contractNode)], STRUCTS_BLOCK_NAME),
        this.parseDocumentation([...findAll("EventDefinition", contractNode)], EVENTS_BLOCK_NAME),
        this.parseDocumentation([...findAll("ErrorDefinition", contractNode)], ERRORS_BLOCK_NAME),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => node.constant && this.isPublicOrExternal(node)
          ),
          CONSTANTS_BLOCK_NAME
        ),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => !node.constant && this.isPublicOrExternal(node)
          ),
          STATE_VARIABLES_BLOCK_NAME
        ),
        this.parseDocumentation([...findAll("ModifierDefinition", contractNode)], MODIFIERS_BLOCK_NAME),
        this.parseDocumentation(
          [...findAll("FunctionDefinition", contractNode)].filter((node) => this.isPublicOrExternal(node)),
          FUNCTIONS_BLOCK_NAME
        ),
      ],
    };

    return contractInfo;
  }

  isPublicOrExternal(node: FunctionDefinition | VariableDeclaration): boolean {
    return node.visibility === "public" || node.visibility === "external";
  }

  parseSelector(node: FunctionDefinition | VariableDeclaration): string {
    return node.functionSelector ? ` (0x${node.functionSelector})` : "";
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

  parseFullSign(node: any): string {
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

  parseDocumentation(nodes: Node[], name: string): DocumentationBlock {
    return {
      blockName: name,
      documentation: nodes.map((node) => ({
        fullSign: this.parseFullSign(node),
        header: this.parseHeader(node),
        natSpecDocumentation: this.parseNatSpecDocumentation(node),
      })),
    };
  }

  buildParameterString(
    parameters: VariableDeclaration[],
    delimiter: string = ", ",
    beginning: string = "",
    ending: string = ""
  ): string {
    return parameters
      .map(
        (variableDeclaration) =>
          `${beginning}${variableDeclaration.typeDescriptions.typeString}${
            variableDeclaration.storageLocation === "default" ? "" : ` ${variableDeclaration.storageLocation}`
          }${variableDeclaration.indexed ? " indexed" : ""}${
            variableDeclaration.name ? ` ${variableDeclaration.name}` : ""
          }${ending}`
      )
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
                  if (isNodeType("Identifier", expression)) return expression.name;
                  if (isNodeType("Literal", expression)) return expression.value;
                  // TODO: handle other cases
                  // EXPERIMENTAL
                  return this.parseStringFromSourceCode(expression.src);
                })
                .join(", ")})`
            : "")
      )
      .join(" ");
  }

  parseFullFunctionSign(functionDefinition: FunctionDefinition): string {
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

    return `${kind}${functionName}(${parameters})${visibility}${stateMutability}${modifiers}${virtual}${overrides}${returns}`;
  }

  parseStringFromSourceCode(src: SourceLocation): string {
    const [start, end, id] = src.split(":").map((x) => parseInt(x));

    const sourceFile =
      this.contractBuildInfo.input.sources[
        Object.values(this.contractBuildInfo.output.sources).find((source) => source.id === id)?.ast.absolutePath
      ].content;

    return sourceFile.substring(start, start + end);
  }

  parseFullStateVariableSign(stateVariable: VariableDeclaration): string {
    let res = `${stateVariable.typeDescriptions.typeString}${
      stateVariable.mutability === "mutable" ? "" : ` ${stateVariable.mutability}`
    } ${stateVariable.name}`;

    // TODO: Extract the source code
    // EXPERIMENTAL
    if (stateVariable.value) {
      res += ` = ${this.parseStringFromSourceCode(stateVariable.value.src)}`;
    }

    return res + ";";
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
      ";"
    )}\n}`;
  }

  parseFullEnumSign(enumDefinition: EnumDefinition): string {
    const parameters = enumDefinition.members.map((enumValue) => `\t ${enumValue.name}`).join(",\n");

    return `enum ${enumDefinition.name} {\n${parameters}\n}`;
  }

  parseFullModifierSign(modifierDefinition: ModifierDefinition): string {
    return `modifier ${modifierDefinition.name}(${this.buildParameterString(
      modifierDefinition.parameters.parameters
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

  extractTextFromComments(text: string): string {
    const reCommentSymbols = /\/\*[\s\S]*?\*\/|(?:^|[^:])\/\/.*$/gm;
    const reSpaceAtBeginningOfLine = /^[ \t]*[ \t]?/gm;
    return text.replace(reCommentSymbols, "").replace(reSpaceAtBeginningOfLine, "").trim();
  }

  getValidParentNodeToInheritDocumentation(
    baseNode: FunctionDefinition | VariableDeclaration
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
    contractName: string
  ): FunctionDefinition | undefined {
    if (this.deref("ContractDefinition", node.scope).canonicalName === contractName) {
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

      let sourceText: string = node.documentation.text;

      if (sourceText) {
        const text = this.extractTextFromComments(sourceText);

        const natSpecRegex = /^(?:@(\w+|custom:[a-z][a-z-]*) )?((?:(?!^@(?:\w+|custom:[a-z][a-z-]*) )[^])*)/gm;

        for (const match of text.matchAll(natSpecRegex)) {
          const [, tag = "notice", text] = match;

          switch (tag) {
            case "title": {
              break;
            }
            case "author": {
              if (!natSpec.author) natSpec.author = text;
              break;
            }
            case "notice": {
              if (!natSpec.notice) natSpec.notice = text;
              break;
            }
            case "dev": {
              if (!natSpec.dev) natSpec.dev = text;
              break;
            }
            case "param": {
              natSpec.params ??= [];

              const paramRegex = /^(\w+) (.*)$/gm;
              const matches = paramRegex.exec(text);
              if (!matches) {
                throw new Error(`Invalid param tag: ${text}`);
              }
              const [, paramName, paramDescription] = matches;

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
              if (!variableDeclaration) {
                throw new Error(`Invalid param name: ${paramName}`);
              }

              const type = variableDeclaration.typeDescriptions?.typeString || "";

              natSpec.params.push({ name: paramName, type: type, description: paramDescription });
              break;
            }
            case "return": {
              natSpec.returns ??= [];

              let currentParameter: VariableDeclaration = isNodeType("FunctionDefinition", node)
                ? node.returnParameters.parameters[natSpec.returns.length]
                : node;

              if (!currentParameter) {
                break;
              }

              const currentParameterName = currentParameter.name;
              const type = currentParameter.typeDescriptions.typeString!;

              // if name is not defined for return parameter
              if (!currentParameterName) {
                natSpec.returns.push({ type: type, description: text });
              } else {
                const returnRegex = /^(\w+) (.*)$/gm;
                const matches = returnRegex.exec(text);

                if (!matches) {
                  throw new Error(`Invalid return tag: ${text}`);
                }

                const [, paramName, paramDescription] = matches;

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
              const parentNode = this.findFunctionDefinitionByContractName(node, parentName);
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
export { Parser };
