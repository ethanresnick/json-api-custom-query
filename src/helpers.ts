export type Identifier = { type: "Identifier", value: string };
export const isId = (it: any): it is Identifier => it && it.type === "Identifier";

export type FieldExpression = {
  type: "FieldExpression"
  operator: string;
  args: any[];
};

export const isFieldExpression = (it: any): it is FieldExpression =>
  it && it.type === "FieldExpression";

export type OperatorsConfig = {
  [operatorName: string]: {
    arity: number;
    finalizeArgs: (operators: OperatorsConfig, operator: string, args: any[]) => any[];
  } | undefined
}

export type SortField = ({
  field: string
} | {
  expression: FieldExpression
}) & {
  direction: "ASC" | "DESC"
};


/**
 * Takes in a FieldExpression and validates its operator against the set
 * of known operators, and the arity of its (finalized) args list against the
 * operator's required arity. Returns the finalied FieldExpression, having
 * called finalizeArgs on the arguments.
 *
 * @param {OperatorsConfig} operators Known operators.
 * @param {FieldExpression} it
 */
export function finalizeFieldExpression(
  operators: OperatorsConfig,
  it: FieldExpression
) {
  if(!(it.operator in operators)) {
    throw new SyntaxError(`"${it.operator}" is not a recognized operator.`);
  }

  // If the arguments in this expression contain other unprocessed
  // FieldExpressions, recursively finalize them.
  const finalArgs = operators[it.operator]!.finalizeArgs(
    operators,
    it.operator,
    it.args.map((arg: any) => {
      return isFieldExpression(arg)
        ? finalizeFieldExpression(operators, arg)
        : arg;
    })
  );

  const expectedArity = operators[it.operator]!.arity;
  if(expectedArity !== Infinity && finalArgs.length !== expectedArity) {
    throw new SyntaxError(
      `"${it.operator}" operator expects exactly ${expectedArity} arguments; ` +
      `got ${finalArgs.length}.`
    );
  }

  return {
    ...it,
    args: finalArgs
  };
}
