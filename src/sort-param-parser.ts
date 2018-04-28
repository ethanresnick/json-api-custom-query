import parser = require("./parser");
import { OperatorsConfig, SortField, finalizeFieldExpression } from './helpers';

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
): (SortField)[] {
  const sortFields = parser.parse(sortVal, { startRule: "Sort" });
  return sortFields.map(function(rawSortField): SortField {
    if(!("expression" in rawSortField)) {
      return rawSortField;
    }

    return {
      ...rawSortField,
      expression: finalizeFieldExpression(sortOperators, rawSortField.expression)
    };
  });
}
