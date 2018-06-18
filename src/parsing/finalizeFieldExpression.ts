import { OperatorsConfig, FieldExpression, isFieldExpression } from '../helpers';

/**
 * Takes in a FieldExpression and validates its operator against the set
 * of known operators, and the arity of its (finalized) args list against the
 * operator's required arity. Returns the finalied FieldExpression, having
 * called finalizeArgs on the arguments.
 *
 * @param {OperatorsConfig} operators Known operators.
 * @param {FieldExpression} it
 */
export default function finalizeFieldExpression(
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
