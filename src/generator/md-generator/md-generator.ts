import { VariableDeclaration } from "solidity-ast";
import {
  ContractInfo,
  Documentation,
  EnumDefinitionWithDocumentation,
  ErrorDefinitionWithDocumentation,
  EventDefinitionWithDocumentation,
  FunctionDefinitionWithDocumentation,
  ModifierDefinitionWithDocumentation,
  NatSpecDocumentation,
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

    const usingForDirectives: UsingForDirectiveWithDocumentation[] = contractInfo.usingForDirectives;

    if (usingForDirectives.length > 0) {
      mdConstructor.addHeaderTag("Using for directives info");

      for (const usingForDirective of usingForDirectives) {
        this.generateUsingForDirectiveBlock(mdConstructor, usingForDirective);
        if (usingForDirective.natSpecDocumentation)
          this.generateDocumentationBlock(mdConstructor, usingForDirective.natSpecDocumentation);
      }
    }

    const enums: EnumDefinitionWithDocumentation[] = contractInfo.enums;

    if (enums.length > 0) {
      mdConstructor.addHeaderTag("Enums info");

      for (const enumDef of enums) {
        this.generateEnumBlock(mdConstructor, enumDef);
        if (enumDef.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, enumDef.natSpecDocumentation);
      }
    }

    const structs: StructDefinitionWithDocumentation[] = contractInfo.structs;

    if (structs.length > 0) {
      mdConstructor.addHeaderTag("Structs info");

      for (const struct of structs) {
        this.generateStructBlock(mdConstructor, struct);
        if (struct.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, struct.natSpecDocumentation);
      }
    }

    const events: EventDefinitionWithDocumentation[] = contractInfo.events;

    if (events.length > 0) {
      mdConstructor.addHeaderTag("Events info");

      for (const event of events) {
        this.generateEventBlock(mdConstructor, event);
        if (event.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, event.natSpecDocumentation);
      }
    }

    const errors: ErrorDefinitionWithDocumentation[] = contractInfo.errors;

    if (errors.length > 0) {
      mdConstructor.addHeaderTag("Errors info");

      for (const error of errors) {
        this.generateErrorBlock(mdConstructor, error);
        if (error.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, error.natSpecDocumentation);
      }
    }

    const stateVariables: VariableDeclarationWithDocumentation[] = contractInfo.stateVariables;

    if (stateVariables.length > 0) {
      mdConstructor.addHeaderTag("State variables info");

      for (const stateVariable of stateVariables) {
        this.generateStateVariableBlock(mdConstructor, stateVariable);
        if (stateVariable.natSpecDocumentation)
          this.generateDocumentationBlock(mdConstructor, stateVariable.natSpecDocumentation);
      }
    }

    const modifiers: ModifierDefinitionWithDocumentation[] = contractInfo.modifiers;

    if (modifiers.length > 0) {
      mdConstructor.addHeaderTag("Modifiers info");

      for (const modifier of modifiers) {
        this.generateModifierBlock(mdConstructor, modifier);
        if (modifier.natSpecDocumentation)
          this.generateDocumentationBlock(mdConstructor, modifier.natSpecDocumentation);
      }
    }

    const functions: FunctionDefinitionWithDocumentation[] = contractInfo.functions;

    if (functions.length > 0) {
      mdConstructor.addHeaderTag("Functions info");

      for (const func of functions) {
        this.generateFunctionBlock(mdConstructor, func);
        if (func.natSpecDocumentation) this.generateDocumentationBlock(mdConstructor, func.natSpecDocumentation);
      }
    }

    return mdConstructor.getContractTagsStr();
  }

  generateDocumentationBlock(mdConstructor: MDConstructor, documentation: NatSpecDocumentation) {
    const res = [];
    if (documentation.author) {
      res.push(`Author: ${documentation.author}`);
    }
    if (documentation.title) {
      res.push(documentation.title);
    }
    if (documentation.notice) {
      res.push(documentation.notice);
    }
    if (documentation.dev) {
      res.push(`_${documentation.dev.trim().split("\n").join("_\n_")}_`);
    }
    if (documentation.custom) {
      res.push(documentation.custom);
    }

    mdConstructor.addParagraphTag(res.join("\n"));
  }

  generateFunctionBlock(mdConstructor: MDConstructor, funcInfo: FunctionDefinitionWithDocumentation) {
    const funcSelectorString = funcInfo.functionSelector ? ` (0x${funcInfo.functionSelector})` : "";
    const funcHeader = `${funcInfo.name ? funcInfo.name : funcInfo.kind}${funcSelectorString}`;

    this.generateBaseMethodBlock(mdConstructor, funcHeader, funcInfo);

    if (funcInfo.natSpecDocumentation && funcInfo.natSpecDocumentation.returns) {
      mdConstructor.addParagraphTag("Return values:");

      this.generateElementsBlock(mdConstructor, funcInfo.natSpecDocumentation.returns);
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

  generateStateVariableBlock(mdConstructor: MDConstructor, stateVariableInfo: VariableDeclarationWithDocumentation) {
    mdConstructor.addHeaderTag(stateVariableInfo.name, FUNCTION_NAME_H_SIZE);
    mdConstructor.addCodeTag([stateVariableInfo.fullSign]);
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

    if (methodInfo.natSpecDocumentation && methodInfo.natSpecDocumentation.params) {
      mdConstructor.addParagraphTag("Parameters:");

      this.generateElementsBlock(mdConstructor, methodInfo.natSpecDocumentation.params);
    }
  }

  generateElementsBlock(
    mdConstructor: MDConstructor,
    documentation: {
      name?: string;
      type: string;
      description: string;
    }[]
  ) {
    const raws: string[][] = [];

    for (let i = 0; i < documentation.length; i++) {
      const element = documentation[i];
      raws.push([element.name ? element.name : `[${i}]`, element.type, element.description]);
    }

    mdConstructor.addTableTag(["Name", "Type", "Description"], raws);
  }
}

export { MDGenerator };
