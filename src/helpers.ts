import R = require("ramda");
import { RawFieldExpression } from './parser';

export type Identifier = { type: "Identifier", value: string };
export const isId = (it: any): it is Identifier => it && it.type === "Identifier";

export type OperatorsConfig = {
  [operatorName: string]: {
    arity: number;
    finalizeArgs: (operators: OperatorsConfig, operator: string, args: any[]) => any[];
  } | undefined
}

export type FieldExpression = {
  type: "FieldExpression"
  operator: string;
  args: any[];
};

export type SortField = ({
  field: string
} | {
  expression: FieldExpression
}) & {
  direction: "ASC" | "DESC"
};

/**
 * @returns {boolean} Is this node an identifier representing a known operator?
 */
export const isKnownOperator =
  R.curry((operators: OperatorsConfig, node: any): node is Identifier => {
    return isId(node) && Boolean(operators[node.value]);
  });

/**
 * @returns {boolean} Is this node an identifier representing a known,
 *   binary operator?
 */
export const isBinaryOperator =
  R.curry((operators: OperatorsConfig, node: any) => {
    return isKnownOperator(operators, node) && operators[node.value]!.arity === 2;
  });

/**
 * @returns {boolean} Is this node an identifier representing a known,
 *   non-binary operator?
 */
export const isNaryOperator =
  R.curry((operators: OperatorsConfig, node: any) => {
    return isKnownOperator(operators, node) && operators[node.value]!.arity !== 2;
  });

/**
 * Attempt to convert what's supposed to be a RawFieldExpression node (but that
 * we recognize at runtime might be anything) to a FieldExperssion, given a set
 * of supported operators. This doesn't transform or validate the operator's
 * args; it just extracts them. Because binary and n-ary operators have different
 * rules (i.e., binary ops are infixed), the meaning of a RawFieldExpression is
 * fundamentally ambiguous until we run it through this function.
 */
export const toFieldExpression =
  R.curry((operators: OperatorsConfig, it: any): FieldExpression => {
    // We may won't have a list at runtime when this is called to
    // validate the args to the and/or operators, among other cases.
    if(!(it && it.type === "RawFieldExpression")) {
      throw new SyntaxError("Expected a parenthesized list.");
    }

    // The elements of the call.
    const list = it.items;

    // For binary operators, the operator is the second item in the list
    // (i.e., it's infixed); otherwise, it must be the first item.
    if(list.length === 3 && isBinaryOperator(operators, list[1])) {
      return {
        type: "FieldExpression",
        operator: (list[1] as Identifier).value,
        args: [list[0], list[2]]
      };
    }

    // For other operators, they need to be known operators
    // and be non-binary. isNaryOperator checks for that.
    else if(isNaryOperator(operators, list[0])) {
      return {
        type: "FieldExpression",
        operator: (list[0] as Identifier).value,
        args: list.slice(1)
      };
    }

    // Otherwise, if we have a two item list, we infer eq,
    // assuming the eq operator is supported.
    else if(list.length === 2 && operators["eq"]) {
      return {
        type: "FieldExpression",
        operator: "eq",
        args: list
      };
    }

    // We need to throw an error at this point, so figure out which one.
    // First, we catch [ value|binary, binary, ((nary|value|binary){2,})? ].
    // Implicitly, list.length !== 3
    if(isBinaryOperator(operators, list[1])) {
      throw new SyntaxError(
        `"${list[1].value}" is a binary operator, so the field expression ` +
        "must have exactly three items."
      )
    }

    // Then catch [binary] | [binary, nary | value, (binary|nary|value)*]
    if(isBinaryOperator(operators, list[0])) {
      throw new SyntaxError(
        `"${list[0].value}" is a binary operator, so it must be infixed as ` +
        "the second item in your field expression."
      )
    }

    // Finally, catch [value] | [value, nary | value, (nary | binary | value)+]
    throw new SyntaxError(
      "Field expressions must have a valid operator symbol as their first " +
      "item (for non-binary operators) or second item (for binary operators), " +
      "or must be a two-item list without any operators (in which case the " +
      "`eq` operator is inferred, if it's supported)."
    );
  });


export function finalizeFieldExpression(
  operators: OperatorsConfig,
  it: RawFieldExpression
) {
  const finalizedExp = toFieldExpression(operators, it);

  // If the arguments in this expression contain other unprocessed
  // field expressions, recursively finalize them, so we're not leaking
  // unusable, proprietary-format RawFieldExpressions back to the consumer.
  const finalArgs = operators[finalizedExp.operator]!.finalizeArgs(
    operators,
    finalizedExp.operator,
    finalizedExp.args.map((arg: any) => {
      if(arg && arg.type === 'RawFieldExpression') {
        return finalizeFieldExpression(operators, arg);
      }

      return arg;
    })
  );

  return {
    ...finalizedExp,
    args: finalArgs
  };
}
