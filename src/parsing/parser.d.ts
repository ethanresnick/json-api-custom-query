declare namespace Parser {
  export type Identifier = { type: "Identifier", value: string };
  export type Atom = number | string | boolean | null | Identifier;
  export type FieldExpressionEntry = Atom | List | FieldExpression;

  // List is an interface as a hack for it being recursive.
  // See https://github.com/Microsoft/TypeScript/issues/3496
  export interface List extends Array<FieldExpressionEntry> {}

  export type FieldExpression = {
    type: "FieldExpression"
    operator: string;
    args: FieldExpressionEntry[];
  };

  export type SortField =
    ({ field: string } | { expression: FieldExpression }) &
    { direction: "ASC" | "DESC" };

  export function parse(input: string, opts: { startRule: "Sort" }): SortField[]
  export function parse(input: string, opts: { startRule: "Filter" }): FieldExpression[]
}

export = Parser;
