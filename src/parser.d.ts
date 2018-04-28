declare namespace Parser {
  export type Identifier = { type: "identifier", value: string };
  export type Atom = number | string | boolean | null | Identifier;
  export type Value = Atom | List | RawFieldExpression;

  // List is an interface as a hack for it being recursive.
  // See https://github.com/Microsoft/TypeScript/issues/3496
  interface List extends Array<Value> {}

  interface RawFieldExpression {
    type: "RawFieldExpression",
    items: Value[]
  }

  // The parse for sort fields has a raw List in the expression field,
  // as we have no contextual info to convert it to anything else.
  export type RawSortField = ({
    field: string
  } | {
    expression: RawFieldExpression
  }) & {
    direction: "ASC" | "DESC"
  };

  export function parse(input: string, opts: { startRule: "Sort" }): RawSortField[]
  export function parse(input: string, opts: { startRule: "Filter" }): RawFieldExpression[]
}

export = Parser;
