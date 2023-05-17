import { BuildInfo } from "hardhat/types";
import {
  ContractDefinition,
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  FunctionDefinition,
  ModifierDefinition,
  SourceLocation,
  SourceUnit,
  StructDefinition,
  UsingForDirective,
  VariableDeclaration,
} from "solidity-ast";
import { Node } from "solidity-ast/node";
import { ASTDereferencer, astDereferencer, findAll, isNodeType } from "solidity-ast/utils";
import { DEFAULT_LICENSE } from "./constants";
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
        this.parseDocumentation([...findAll("UsingForDirective", contractNode)], "Using for directives info"),
        this.parseDocumentation([...findAll("EnumDefinition", contractNode)], "Enums info"),
        this.parseDocumentation([...findAll("StructDefinition", contractNode)], "Structs info"),
        this.parseDocumentation([...findAll("EventDefinition", contractNode)], "Events info"),
        this.parseDocumentation([...findAll("ErrorDefinition", contractNode)], "Errors info"),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => node.constant && this.isPublicOrExternal(node)
          ),
          "Constants info"
        ),
        this.parseDocumentation(
          [...findAll("VariableDeclaration", contractNode)].filter(
            (node) => !node.constant && this.isPublicOrExternal(node)
          ),
          "State variables info"
        ),
        this.parseDocumentation([...findAll("ModifierDefinition", contractNode)], "Modifiers info"),
        this.parseDocumentation(
          [...findAll("FunctionDefinition", contractNode)].filter((node) => this.isPublicOrExternal(node)),
          "Functions info"
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

  parseTitle(node: any): string {
    if (node.nodeType === "FunctionDefinition") {
      return `${node.name ? node.name : node.kind}${this.parseSelector(node)}`;
    }
    if (node.nodeType === "VariableDeclaration") {
      return `${node.name}${this.parseSelector(node)}`;
    }
    if (node.nodeType === "ContractDefinition") {
      return "";
    }
    return node.name;
  }

  parseFullSign(node: any): string {
    if (node.nodeType === "FunctionDefinition") {
      return this.parseFullFunctionSign(node);
    }
    if (node.nodeType === "VariableDeclaration") {
      return this.parseFullStateVariableSign(node);
    }
    if (node.nodeType === "EventDefinition") {
      return this.parseFullEventSign(node);
    }
    if (node.nodeType === "ErrorDefinition") {
      return this.parseFullErrorSign(node);
    }
    if (node.nodeType === "EnumDefinition") {
      return this.parseFullEnumSign(node);
    }
    if (node.nodeType === "StructDefinition") {
      return this.parseFullStructSign(node);
    }
    if (node.nodeType === "ModifierDefinition") {
      return this.parseFullModifierSign(node);
    }
    if (node.nodeType === "UsingForDirective") {
      return this.parseFullUsingForDirectiveSign(node);
    }
    if (node.nodeType === "ContractDefinition") {
      return this.parseFullContractSign(node);
    }
    //TODO: error
    return "";
  }

  parseDocumentation(nodes: Node[], name: string): DocumentationBlock {
    return {
      name: name,
      documentation: nodes.map((node) => ({
        fullSign: this.parseFullSign(node),
        title: this.parseTitle(node),
        natSpecDocumentation: this.parseNatSpecDocumentation(node),
      })),
    };
  }

  parseFullFunctionSign(functionDefinition: FunctionDefinition): string {
    const kind = functionDefinition.kind;
    const functionName = functionDefinition.name.length === 0 ? "" : ` ${functionDefinition.name}`;
    const parameters = functionDefinition.parameters.parameters
      .map(
        (variableDeclaration) =>
          variableDeclaration.typeDescriptions.typeString +
          (variableDeclaration.name ? ` ${variableDeclaration.name}` : "")
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
              (modifier) =>
                modifier.modifierName.name +
                (modifier.arguments
                  ? `(${modifier.arguments
                      .map((expression) => {
                        if (isNodeType("Identifier", expression)) return expression.name;
                        if (isNodeType("Literal", expression)) return expression.value;
                        // TODO: handle other cases
                        return "";
                      })
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
            .map(
              (variableDeclaration) =>
                `${variableDeclaration.typeDescriptions.typeString}${
                  variableDeclaration.storageLocation === "default" ? "" : ` ${variableDeclaration.storageLocation}`
                }${variableDeclaration.name ? ` ${variableDeclaration.name}` : ""}`
            )
            .join(", ") +
          ")";
    const fullMethodSign: string = `${kind}${functionName}(${parameters})${visibility}${stateMutability}${modifiers}${virtual}${overrides}${returns}`;

    return fullMethodSign;
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
    // TODO: Extract the source code
    // EXPERIMENTAL
    if (stateVariable.value) {
      return `${stateVariable.typeDescriptions.typeString}${
        stateVariable.mutability === "mutable" ? "" : ` ${stateVariable.mutability}`
      } ${stateVariable.name} = ${this.parseStringFromSourceCode(stateVariable.value.src)};`;
    }
    return `${stateVariable.typeDescriptions.typeString}${
      stateVariable.mutability === "mutable" ? "" : ` ${stateVariable.mutability}`
    } ${stateVariable.name};`;
  }

  parseFullEventSign(eventDefinition: EventDefinition): string {
    const parameters = eventDefinition.parameters.parameters
      .map(
        (variableDeclaration) =>
          variableDeclaration.typeDescriptions.typeString +
          (variableDeclaration.indexed ? " indexed" : "") +
          (variableDeclaration.name ? ` ${variableDeclaration.name}` : "")
      )
      .join(", ");

    return `event ${eventDefinition.name}(${parameters})${eventDefinition.anonymous ? " anonymous" : ""}`;
  }

  parseFullErrorSign(errorDefinition: ErrorDefinition): string {
    const parameters = errorDefinition.parameters.parameters
      .map(
        (variableDeclaration) =>
          variableDeclaration.typeDescriptions.typeString +
          (variableDeclaration.name ? ` ${variableDeclaration.name}` : "")
      )
      .join(", ");

    return `error ${errorDefinition.name}(${parameters})`;
  }

  parseFullStructSign(structDefinition: StructDefinition): string {
    const parameters = structDefinition.members
      .map((variableDeclaration) => `\t${variableDeclaration.typeDescriptions.typeString} ${variableDeclaration.name};`)
      .join("\n");

    return `struct ${structDefinition.name} {\n${parameters}\n}`;
  }

  parseFullEnumSign(enumDefinition: EnumDefinition): string {
    const parameters = enumDefinition.members.map((enumValue) => `\t ${enumValue.name}`).join(",\n");

    return `enum ${enumDefinition.name} {\n${parameters}\n}`;
  }

  parseFullModifierSign(modifierDefinition: ModifierDefinition): string {
    const parameters = modifierDefinition.parameters.parameters
      .map(
        (variableDeclaration) =>
          variableDeclaration.typeDescriptions.typeString +
          (variableDeclaration.name ? ` ${variableDeclaration.name}` : "")
      )
      .join(", ");

    return `modifier ${modifierDefinition.name}(${parameters})`;
  }

  parseFullUsingForDirectiveSign(usingForDirective: UsingForDirective): string {
    return `using ${usingForDirective.libraryName?.name} for ${
      usingForDirective.typeName ? usingForDirective.typeName.typeDescriptions.typeString : "*"
    }`;
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

  deleteComments(text: string): string {
    const reCommentSymbols = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
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
        const text = this.deleteComments(sourceText);

        const natSpecRegex = /^(?:@(\w+|custom:[a-z][a-z-]*) )?((?:(?!^@(?:\w+|custom:[a-z][a-z-]*) )[^])*)/gm;

        for (const match of text.matchAll(natSpecRegex)) {
          const [, tag = "notice", text] = match;
          if (tag == "title" && !natSpec.title) {
            // skip title
            // natSpec.title = text;
          } else if (tag == "author" && !natSpec.author) {
            natSpec.author = text;
          } else if (tag == "notice" && !natSpec.notice) {
            natSpec.notice = text;
          } else if (tag == "dev" && !natSpec.dev) {
            natSpec.dev = text;
          } else if (tag == "param") {
            natSpec.params ??= [];

            const paramRegex = /^(\w+) (.*)$/gm;
            const matches = paramRegex.exec(text);
            if (!matches) {
              // TODO: error
              continue;
            }
            const [, paramName, paramDescription] = matches;

            // if tag is already defined, skip it
            if (natSpec.params.find((param) => param.name == paramName)) {
              continue;
            }

            let params: VariableDeclaration[];
            // if (isNodeType(["EnumDefinition", "StructDefinition"], node)) {
            if (node.nodeType === "EnumDefinition" || node.nodeType === "StructDefinition") {
              params = node.members;
            } else {
              params = node.parameters.parameters;
            }

            const variableDeclaration = params.find((param) => param.name == paramName);
            if (!variableDeclaration) {
              // TODO: error
              continue;
            }

            const type = variableDeclaration.typeDescriptions?.typeString || "";

            natSpec.params.push({ name: paramName, type: type, description: paramDescription });
          } else if (tag === "return") {
            natSpec.returns ??= [];

            let currentParameter: VariableDeclaration = isNodeType("FunctionDefinition", node)
              ? node.returnParameters.parameters[natSpec.returns.length]
              : node;

            if (!currentParameter) {
              // TODO: error
              console.log("error");
              console.log(node);
              continue;
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
                // TODO: error
                console.log("error");
                console.log(node);
                continue;
              }
              const [, paramName, paramDescription] = matches;
              // TODO: check if paramName is equal to currentParameterName
              natSpec.returns.push({ name: paramName, type: type, description: paramDescription });
            }
          } else if (tag.startsWith("custom:")) {
            const customTag = tag.replace("custom:", "");
            natSpec.custom ??= {};
            natSpec.custom[customTag] = text;
          } else if (tag === "inheritdoc") {
            const parentNodeRegex = /^(\w+)$/gm;
            const matches = parentNodeRegex.exec(text);
            if (!matches) {
              // TODO: error
              continue;
            }
            const [, parentName] = matches;
            const parentNode = node.baseFunctions
              .map((id: number) => this.deref("FunctionDefinition", id))
              .find(
                (node: FunctionDefinition) => this.deref("ContractDefinition", node.scope).canonicalName === parentName
              );
            if (!parentNode) {
              // TODO: error
              continue;
            }
            nodes.push(parentNode);
          }
        }
      }
    }

    return natSpec;
  }
}

export { Parser };
