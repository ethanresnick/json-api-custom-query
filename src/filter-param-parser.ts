import R = require("ramda");
import parser = require("./parser");

import {
  OperatorsConfig,
  FieldExpression,
  listToFieldExpression,
  finalizeArgs
} from './helpers';

/**
 * Takes a set of operator descriptions for operators that are all legal in
 * the filter query string, and the value of the filter query parameter, and
 * returns a parsed set of filters.
 *
 * Fundamentally, this invokes our generic parser (from grammar.pegjs) and then
 * validates/transforms the list results into FieldExpressions based on the
 * specific rules for the filter param and the user provided finalizeArgs fns.
 *
 * @param {OperatorsConfig} filterOperators Operators allowed in ?filter.
 * @param {string} filterVal The value for ?filter.
 * @throws {Error} If any of the input is invalid.
 */
export default function parse(
  filterOperators: OperatorsConfig,
  filterVal: string
): (FieldExpression)[] {
  const constraintLists = parser.parse(filterVal, { startRule: "Filter" });
  const toFieldExpression = listToFieldExpression(filterOperators);

  // Transform the args of an expression by calling the user's finalizeArgs,
  // if present, or else calling our built-in finalizeArgs.
  const finalizeExp = (exp: FieldExpression) => {
    const operatorConfig = filterOperators[exp.operator]!;
    const finalizeArgsFn = (operatorConfig && operatorConfig.finalizeArgs)
      ? operatorConfig.finalizeArgs
      : finalizeArgs;

    return {
      ...exp,
      args: finalizeArgsFn(filterOperators, toFieldExpression, exp.operator, exp.args)
    };
  }

  // Process each filter expression.
  return constraintLists.map(R.pipe(toFieldExpression, finalizeExp));
}
