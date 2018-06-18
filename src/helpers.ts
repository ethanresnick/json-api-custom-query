import { FieldExpression, SortField, FieldExpressionEntry } from './parsing/parser';

export type Identifier = { type: "Identifier", value: string };
export const isIdentifier = (it: any): it is Identifier =>
  it && it.type === "Identifier";

export { FieldExpression };
export const isFieldExpression = (it: any): it is FieldExpression =>
  it && it.type === "FieldExpression";

export { SortField };
export const isSortField = (it: any): it is SortField =>
  it && it.type === "SortField";

export type OperatorsConfig = {
  [operatorName: string]: {
    arity: number;
    finalizeArgs: (operators: OperatorsConfig, operator: string, args: any[]) => any[];
  } | undefined
}

export { FieldExpressionEntry };
