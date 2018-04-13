import R = require("ramda");

export type Identifier = { type: "Identifier", value: string };
export const isId = (it: any): it is Identifier => it && it.type === "Identifier";

export type OperatorsConfig = {
  [operatorName: string]: {
    isBinary: boolean;
    finalizeArgs: (operators: OperatorsConfig, operator: string, args: any[]) => any[];
  } | undefined
}

export type FieldExpression = {
  type: "FieldExpression"
  operator: string;
  args: any[];
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
    return isKnownOperator(operators, node) && operators[node.value]!.isBinary;
  });

/**
 * @returns {boolean} Is this node an identifier representing a known,
 *   non-binary operator?
 */
export const isNaryOperator =
  R.curry((operators: OperatorsConfig, node: any) => {
    return isKnownOperator(operators, node) && !(operators[node.value]!.isBinary);
  });

/**
 * Attempt to convert what's supposed to be a RawFieldExpression node (but that
 * we recognize at runtime might be anything) to a FieldExperssion, given a set
 * of supported operators. This doesn't transform or validate the operator's
 * args; it just extracts them. Because binary and n-ary operators have different
 * rules (i.e., binary ops are infixed), the meaning of a RawFieldExpression is
 * fundamentally ambiguous until we run it through this function.
 */
export const finalizeFieldExpression =
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

    throw new SyntaxError(
      "Field expressions must have a valid operator symbol as their first or " +
      "second item, or must be a two-item list without any operators (in " +
      "in which case the `eq` operator is inferred). If a binary operator is " +
      "used explicitly, the expression must have exactly three items."
    );
  });
