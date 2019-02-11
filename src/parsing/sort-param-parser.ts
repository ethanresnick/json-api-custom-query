import parser = require("./parser");
import finalizeFieldExpression from './finalizeFieldExpression';
import {
  OperatorsConfig,
  SortField,
  normalizePartialUriString
} from '../helpers';

/**
 * Takes a set of operator descriptions for operators that are all legal in
 * the sort query string, and the value of the sort query parameter, and
 * returns a parsed set of sort fields/field expressions.
 *
 * Fundamentally, this invokes our generic parser (from grammar.pegjs) and then
 * validates/transforms the any RawFieldExpressions into FieldExpressions based
 * on the specific rules for the sort param and the user provided finalizeArgs fns.
 *
 * @param {OperatorsConfig} sortOperators Operators allowed in ?sort.
 * @param {string} sortVal The value for ?sort.
 * @throws {Error} If any of the input is invalid.
 */
export default function parse(
  sortOperators: OperatorsConfig,
  sortVal: string
): SortField[] {
  return parser
    .parse(normalizePartialUriString(sortVal), { startRule: "Sort" })
    .map(function(sortField): SortField {
      if(!("expression" in sortField)) {
        return sortField;
      }

      return {
        ...sortField,
        expression: finalizeFieldExpression(sortOperators, sortField.expression)
      };
    });
}
