// Constructors for various AST nodes
export const Identifier = (value: string) => ({
  type: "Identifier",
  value
});

export const FieldExpression = (operator: string, args: any[]) => ({
  type: "FieldExpression",
  operator, args
});
