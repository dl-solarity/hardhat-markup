import {
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  ModifierDefinition,
  StructDefinition,
  UsingForDirective,
  VariableDeclaration,
} from "solidity-ast";
import { ContractInfo, DocumentationLine, FunctionDefinitionWithParsedData } from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FUNCTION_NAME_H_SIZE } from "./constants";
import { MDConstructor } from "./md-constructor";

class MDGenerator {
  generateContractMDStr(contractInfo: ContractInfo): any {
    const mdConstructor: MDConstructor = new MDConstructor();

    mdConstructor.addHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE);

    mdConstructor.addHeaderTag(
      `${contractInfo.isAbstract ? "Abstract " : ""}${
        contractInfo.contractKind.at(0)?.toUpperCase() + contractInfo.contractKind.slice(1)
      } Description`
    );
    mdConstructor.addParagraphTag(`License: ${contractInfo.license}`);
    this.generateDocumentationBlock(mdConstructor, contractInfo.baseDescription);

    const events: EventDefinition[] = Array.from(contractInfo.events);

    if (events.length > 0) {
      mdConstructor.addHeaderTag("Events info");

      for (const event of events) {
        this.generateEventBlock(mdConstructor, event);
        if (contractInfo.documentations.has(event.id)) {
          this.generateDocumentationBlock(mdConstructor, contractInfo.documentations.get(event.id)!.documentationLines);
        }
      }
    }

    const errors: ErrorDefinition[] = Array.from(contractInfo.errors);

    if (errors.length > 0) {
      mdConstructor.addHeaderTag("Errors info");

      for (const error of errors) {
        this.generateErrorBlock(mdConstructor, error);
        if (contractInfo.documentations.has(error.id)) {
          this.generateDocumentationBlock(mdConstructor, contractInfo.documentations.get(error.id)!.documentationLines);
        }
      }
    }

    const functions: FunctionDefinitionWithParsedData[] = Array.from(contractInfo.functions);

    if (functions.length > 0) {
      mdConstructor.addHeaderTag("Functions info");

      for (const func of functions) {
        this.generateFunctionBlock(mdConstructor, func);
        if (contractInfo.documentations.has(func.id)) {
          this.generateDocumentationBlock(mdConstructor, contractInfo.documentations.get(func.id)!.documentationLines);
        }
      }
    }

    const enums: EnumDefinition[] = Array.from(contractInfo.enums);

    if (enums.length > 0) {
      mdConstructor.addHeaderTag("Enums info");

      for (const enumDef of enums) {
        this.generateEnumBlock(mdConstructor, enumDef);
        if (contractInfo.documentations.has(enumDef.id)) {
          this.generateDocumentationBlock(
            mdConstructor,
            contractInfo.documentations.get(enumDef.id)!.documentationLines
          );
        }
      }
    }

    const structs: StructDefinition[] = Array.from(contractInfo.structs);

    if (structs.length > 0) {
      mdConstructor.addHeaderTag("Structs info");

      for (const struct of structs) {
        this.generateStructBlock(mdConstructor, struct);
        if (contractInfo.documentations.has(struct.id)) {
          this.generateDocumentationBlock(
            mdConstructor,
            contractInfo.documentations.get(struct.id)!.documentationLines
          );
        }
      }
    }

    const modifiers: ModifierDefinition[] = Array.from(contractInfo.modifiers);

    if (modifiers.length > 0) {
      mdConstructor.addHeaderTag("Modifiers info");

      for (const modifier of modifiers) {
        this.generateModifierBlock(mdConstructor, modifier);
        if (contractInfo.documentations.has(modifier.id)) {
          this.generateDocumentationBlock(
            mdConstructor,
            contractInfo.documentations.get(modifier.id)!.documentationLines
          );
        }
      }
    }

    const usingForDirectives: UsingForDirective[] = Array.from(contractInfo.usingForDirectives);

    if (usingForDirectives.length > 0) {
      mdConstructor.addHeaderTag("Using for directives info");

      for (const usingForDirective of usingForDirectives) {
        this.generateUsingForDirectiveBlock(mdConstructor, usingForDirective);
        if (contractInfo.documentations.has(usingForDirective.id)) {
          this.generateDocumentationBlock(
            mdConstructor,
            contractInfo.documentations.get(usingForDirective.id)!.documentationLines
          );
        }
      }
    }

    return mdConstructor.getContractTagsStr();
  }

  generateDocumentationBlock(mdConstructor: MDConstructor, documentation: DocumentationLine[]) {
    for (const docLine of documentation) {
      let res: string = "";
      if (docLine.tag === "notice") {
        res = docLine.description;
      }
      if (docLine.tag === "dev") {
        res = `_${docLine.description.trim().replace("\n", "_\n_")}_`;
      }
      if (docLine.tag === "inheritdoc") {
        // TODO: add inheritdoc
      }
      if (docLine.tag === "author") {
        res = `Author: ${docLine.description}`;
      }
      mdConstructor.addParagraphTag(res);
    }
  }

  generateFunctionBlock(mdConstructor: MDConstructor, funcInfo: FunctionDefinitionWithParsedData) {
    const funcSelectorString = funcInfo.functionSelector ? ` (0x${funcInfo.functionSelector})` : "";
    const funcHeader = `${funcInfo.name ? funcInfo.name : funcInfo.kind}${funcSelectorString}`;

    this.generateBaseMethodBlock(mdConstructor, funcHeader, funcInfo);

    if (funcInfo.returnParameters.parameters.length > 0) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, funcInfo.returnParameters.parameters);
    }
  }

  generateUsingForDirectiveBlock(mdConstructor: MDConstructor, usingForDirectiveInfo: UsingForDirective) {
    mdConstructor.addCodeTag([
      `using ${usingForDirectiveInfo.libraryName?.name} for ${usingForDirectiveInfo.typeName?.typeDescriptions.typeString}`,
    ]);
  }

  generateModifierBlock(mdConstructor: MDConstructor, modifierInfo: ModifierDefinition) {
    mdConstructor.addHeaderTag(modifierInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([
      `modifier ${modifierInfo.name} (`,
      ...modifierInfo.parameters.parameters.map(
        (variableDeclaration) =>
          "\t" + variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name + ","
      ),
      ")",
    ]);
  }

  generateEventBlock(mdConstructor: MDConstructor, eventInfo: EventDefinition) {
    mdConstructor.addHeaderTag(eventInfo.name, FUNCTION_NAME_H_SIZE);
    // TODO: delete last comma
    mdConstructor.addCodeTag([
      `event ${eventInfo.name} (`,
      ...eventInfo.parameters.parameters.map(
        (variableDeclaration) =>
          "\t" + variableDeclaration.typeDescriptions.typeString + " " + variableDeclaration.name + ","
      ),
      ")",
    ]);
  }

  generateErrorBlock(mdConstructor: MDConstructor, errorInfo: ErrorDefinition) {
    mdConstructor.addHeaderTag(errorInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([
      `error ${errorInfo.name} (`,
      ...errorInfo.parameters.parameters.map(
        (parameter) => "\t" + parameter.typeDescriptions.typeString + " " + parameter.name + ";"
      ),
      ")",
    ]);
  }

  generateStructBlock(mdConstructor: MDConstructor, structInfo: StructDefinition) {
    mdConstructor.addHeaderTag(structInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([
      `struct ${structInfo.name} {`,
      ...structInfo.members.map((member) => "\t" + member.typeDescriptions.typeString + " " + member.name + ";"),
      "}",
    ]);
  }

  generateEnumBlock(mdConstructor: MDConstructor, enumInfo: EnumDefinition) {
    mdConstructor.addHeaderTag(enumInfo.name, FUNCTION_NAME_H_SIZE);
    // TODO: delete last comma
    mdConstructor.addCodeTag([
      `enum ${enumInfo.name} {`,
      ...enumInfo.members.map((member) => "\t" + member.name + ","),
      "}",
    ]);
  }

  generateContainerBlock(
    mdConstructor: MDConstructor,
    methodHeader: string,
    containerInfo: StructDefinition | EnumDefinition
  ) {
    mdConstructor.addHeaderTag(methodHeader, FUNCTION_NAME_H_SIZE);

    if (containerInfo.members.length > 0) {
      mdConstructor.addParagraphTag("Members:");

      for (const member of containerInfo.members) {
        mdConstructor.addParagraphTag(`${member.name}`);
      }
    }
  }

  generateBaseMethodBlock(
    mdConstructor: MDConstructor,
    methodHeader: string,
    methodInfo: FunctionDefinitionWithParsedData
  ) {
    mdConstructor.addHeaderTag(methodHeader, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([methodInfo.fullMethodSign]);

    if (methodInfo.parameters.parameters.length > 0) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, methodInfo.parameters.parameters);
    }
  }

  generateElementsBlock(mdConstructor: MDConstructor, elements: VariableDeclaration[]) {
    const raws: string[][] = [];

    elements.map((el: VariableDeclaration) => {
      raws.push([el.name, el.typeDescriptions.typeString || "", el.documentation?.text || ""]);
    });

    mdConstructor.addTableTag(["Name", "Type", "Description"], raws);
  }
}

export { MDGenerator };
