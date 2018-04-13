// Constructors for various AST nodes

export const Identifier = (value: string) => ({
  type: "Identifier",
  value
});

export const RawFieldExpression = (items: any[]) => ({
  type: "RawFieldExpression",
  items
});

export const FieldExpression = (operator: string, args: any[]) => ({
  type: "FieldExpression",
  operator, args
});
