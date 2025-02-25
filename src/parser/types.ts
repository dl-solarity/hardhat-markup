export interface ContractInfo {
  name: string;
  license: string;
  isAbstract: boolean;
  contractKind: "contract" | "interface" | "library";
  documentations: DocumentationBlock[];
}

export interface DocumentationBlock {
  documentation: Documentation[];
  blockName: string;
}

export interface Documentation {
  fullSign: string;
  header?: string;
  natSpecDocumentation?: NatSpecDocumentation;
}

export interface NatSpecDocumentation {
  title?: string;
  author?: string;
  notice?: string;
  dev?: string[];
  params?: {
    name?: string;
    type?: string;
    description: string;
  }[];
  returns?: {
    name?: string;
    type: string;
    description: string;
  }[];
  custom?: {
    [tag: string]: string;
  };
}
