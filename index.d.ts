declare namespace QueryParser {
  export type Atom = number | string | boolean | null | Identifier;
  export type Value = Atom | List;

  // List is an interface as a hack for it being recursive.
  // See https://github.com/Microsoft/TypeScript/issues/3496
  interface List extends Array<Value> {}

  // The parse for sort fields has a raw List in the expression field,
  // as we have no contextual info to convert it to anything else.
  export type SortField = ({
    field: string
  } | {
    expression: List
  }) & {
    direction: "ASC" | "DESC"
  };

  export type SortParseResult = SortField[];
  export type FilterParseResult = List[];

  export interface Parser {
    parse(input: string, opts: { startRule: "Sort" }): SortParseResult
    parse(input: string, opts: { startRule: "Filter" }): FilterParseResult
  }

  export const parser: Parser;
  export class Identifier {
    public value: string;
    constructor(value: string);
  }
}

export = QueryParser;
