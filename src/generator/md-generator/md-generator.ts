import { VariableDeclaration } from "solidity-ast";
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
} from "../../parser/types";
import { CONTRACT_NAME_H_SIZE, FUNCTION_NAME_H_SIZE } from "./constants";
import { MDConstructor } from "./md-constructor";

class MDGenerator {
  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  generateContractMDStr(contractInfo: ContractInfo): any {
    const mdConstructor: MDConstructor = new MDConstructor();

    mdConstructor.addHeaderTag(contractInfo.name, CONTRACT_NAME_H_SIZE);

    mdConstructor.addHeaderTag(
      `${contractInfo.isAbstract ? "Abstract " : ""}${this.capitalizeFirstLetter(
        contractInfo.contractKind
      )} Description`
    );

    mdConstructor.addParagraphTag(`License: ${contractInfo.license}`);

    this.generateDocumentationBlock(mdConstructor, contractInfo.baseDescription);

    const events: EventDefinitionWithDocumentation[] = contractInfo.events;

    if (events.length > 0) {
      mdConstructor.addHeaderTag("Events info");

      for (const event of events) {
        this.generateEventBlock(mdConstructor, event);
        this.generateDocumentationBlock(mdConstructor, event.documentationLines);
      }
    }

    const errors: ErrorDefinitionWithDocumentation[] = contractInfo.errors;

    if (errors.length > 0) {
      mdConstructor.addHeaderTag("Errors info");

      for (const error of errors) {
        this.generateErrorBlock(mdConstructor, error);
        this.generateDocumentationBlock(mdConstructor, error.documentationLines);
      }
    }

    const functions: FunctionDefinitionWithDocumentation[] = contractInfo.functions;

    if (functions.length > 0) {
      mdConstructor.addHeaderTag("Functions info");

      for (const func of functions) {
        this.generateFunctionBlock(mdConstructor, func);
        this.generateDocumentationBlock(mdConstructor, func.documentationLines);
      }
    }

    const enums: EnumDefinitionWithDocumentation[] = contractInfo.enums;

    if (enums.length > 0) {
      mdConstructor.addHeaderTag("Enums info");

      for (const enumDef of enums) {
        this.generateEnumBlock(mdConstructor, enumDef);
        this.generateDocumentationBlock(mdConstructor, enumDef.documentationLines);
      }
    }

    const structs: StructDefinitionWithDocumentation[] = contractInfo.structs;

    if (structs.length > 0) {
      mdConstructor.addHeaderTag("Structs info");

      for (const struct of structs) {
        this.generateStructBlock(mdConstructor, struct);
        this.generateDocumentationBlock(mdConstructor, struct.documentationLines);
      }
    }

    const modifiers: ModifierDefinitionWithDocumentation[] = contractInfo.modifiers;

    if (modifiers.length > 0) {
      mdConstructor.addHeaderTag("Modifiers info");

      for (const modifier of modifiers) {
        this.generateModifierBlock(mdConstructor, modifier);
        this.generateDocumentationBlock(mdConstructor, modifier.documentationLines);
      }
    }

    const usingForDirectives: UsingForDirectiveWithDocumentation[] = contractInfo.usingForDirectives;

    if (usingForDirectives.length > 0) {
      mdConstructor.addHeaderTag("Using for directives info");

      for (const usingForDirective of usingForDirectives) {
        this.generateUsingForDirectiveBlock(mdConstructor, usingForDirective);
        this.generateDocumentationBlock(mdConstructor, usingForDirective.documentationLines);
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
        res = `_${docLine.description.trim().split("\n").join("_\n_")}_`;
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

  generateFunctionBlock(mdConstructor: MDConstructor, funcInfo: FunctionDefinitionWithDocumentation) {
    const funcSelectorString = funcInfo.functionSelector ? ` (0x${funcInfo.functionSelector})` : "";
    const funcHeader = `${funcInfo.name ? funcInfo.name : funcInfo.kind}${funcSelectorString}`;

    this.generateBaseMethodBlock(mdConstructor, funcHeader, funcInfo);

    if (funcInfo.returnParameters.parameters.length > 0) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, funcInfo.returnParameters.parameters);
    }
  }

  generateUsingForDirectiveBlock(
    mdConstructor: MDConstructor,
    usingForDirectiveInfo: UsingForDirectiveWithDocumentation
  ) {
    mdConstructor.addCodeTag([usingForDirectiveInfo.fullSign]);
  }

  generateModifierBlock(mdConstructor: MDConstructor, modifierInfo: ModifierDefinitionWithDocumentation) {
    mdConstructor.addHeaderTag(modifierInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([modifierInfo.fullSign]);
  }

  generateEventBlock(mdConstructor: MDConstructor, eventInfo: EventDefinitionWithDocumentation) {
    mdConstructor.addHeaderTag(eventInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([eventInfo.fullSign]);
  }

  generateErrorBlock(mdConstructor: MDConstructor, errorInfo: ErrorDefinitionWithDocumentation) {
    mdConstructor.addHeaderTag(errorInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([errorInfo.fullSign]);
  }

  generateStructBlock(mdConstructor: MDConstructor, structInfo: StructDefinitionWithDocumentation) {
    mdConstructor.addHeaderTag(structInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([structInfo.fullSign]);
  }

  generateEnumBlock(mdConstructor: MDConstructor, enumInfo: EnumDefinitionWithDocumentation) {
    mdConstructor.addHeaderTag(enumInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([enumInfo.fullSign]);
  }

  generateBaseMethodBlock(
    mdConstructor: MDConstructor,
    methodHeader: string,
    methodInfo: FunctionDefinitionWithDocumentation
  ) {
    mdConstructor.addHeaderTag(methodHeader, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([methodInfo.fullSign]);

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
