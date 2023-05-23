import { AlignTypes, DEFAULT_CODE_LANGUAGE, DEFAULT_TABLE_ALIGN, TOPIC_H_SIZE } from "./constants";
import json2md = require("json2md");

export class MDFactory {
  private contractTags: any[];

  constructor() {
    this.contractTags = [];
  }

  addHeaderTag(headerContent: string, headerSize: number | string = TOPIC_H_SIZE) {
    this.contractTags.push(this.createHeaderTag(headerContent, headerSize));
  }

  addPlainText(plainTextContent: string) {
    this.contractTags.push(plainTextContent);
  }

  addParagraphTag(pContent: string) {
    this.contractTags.push(this.createParagraphTag(pContent));
  }

  addUlTag(ulContent: string[]) {
    this.contractTags.push(this.createUlTag(ulContent));
  }

  addOlTag(olContent: string[]) {
    this.contractTags.push(this.createOlTag(olContent));
  }

  addTableTag(headers: string[], rows: string[][], aligns: AlignTypes[] = [], isPretty: boolean = true) {
    this.contractTags.push(this.createTableTag(headers, rows, aligns, isPretty));
  }

  addCodeTag(codeContent: string[], language: string = DEFAULT_CODE_LANGUAGE) {
    this.contractTags.push(this.createCodeTag(codeContent, language));
  }

  getContractTagsStr(): string {
    return json2md(this.contractTags);
  }

  getInlineCodeStr(str: string): string {
    return `\`${str}\``;
  }

  getBoldStr(str: string): string {
    return `**${str}**`;
  }

  private createHeaderTag(headerContent: string, headerSize: number | string): any {
    switch (Number(headerSize)) {
      case 1:
        return { h1: headerContent };
      case 2:
        return { h2: headerContent };
      case 3:
        return { h3: headerContent };
      case 4:
        return { h4: headerContent };
      case 5:
        return { h5: headerContent };
      case 6:
        return { h6: headerContent };
      default:
        throw new Error("Invalid header size number");
    }
  }

  private createParagraphTag(pContent: string): any {
    return { p: pContent };
  }

  private createUlTag(ulContent: string[]): any {
    return { ul: ulContent };
  }

  private createOlTag(olContent: string[]): any {
    return { ol: olContent };
  }

  private createTableTag(headers: string[], rows: string[][], aligns: AlignTypes[], isPretty: boolean): any {
    rows.forEach((row: string[]) => {
      if (row.length != headers.length) {
        throw new Error(
          `Failed to create Table tag. Expected ${headers.length} columns, actual - ${row.length} columns in ${row} row`
        );
      }
    });

    const alignments: string[] = headers.map((_, index: number) => {
      return aligns && aligns[index] ? aligns[index] : DEFAULT_TABLE_ALIGN;
    });

    return {
      table: {
        headers: headers,
        rows: rows,
        pretty: isPretty,
        aligns: alignments,
      },
    };
  }

  private createCodeTag(codeContent: string[], language: string): any {
    return {
      code: {
        language: language,
        content: codeContent,
      },
    };
  }
}
