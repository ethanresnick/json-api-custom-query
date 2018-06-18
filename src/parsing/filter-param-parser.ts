import parser = require("./parser");
import finalizeFieldExpression from './finalizeFieldExpression';
import { OperatorsConfig, FieldExpression } from '../helpers';

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
): FieldExpression[] {
  return parser
    .parse(filterVal, { startRule: "Filter" })
    .map(fieldExp => finalizeFieldExpression(filterOperators, fieldExp));
}
