import R = require("ramda");

export type Identifier = { type: "identifier", value: string };
export const isId = (it: any): it is Identifier => it && it.type === "identifier";

export type FinalizeArgs = (
  operators: OperatorsConfig,
  listToFieldExp: (parseResult: any) => FieldExpression,
  operator: string,
  args: any[]
) => any;

export type OperatorsConfig = {
  [operatorName: string]: {
    isBinary: boolean;
    finalizeArgs?: FinalizeArgs;
  } | undefined
}

export type FieldExpression = ({
  operator: "or" | "and",
  args: FieldExpression[]
} | {
  operator: "eq" | 'neq' | 'ne'; // ne and neq are synonyms
  args: [Identifier, any]
} | {
  operator: "in" | "nin";
  args: [Identifier, string[] | number[]]
} | {
  operator: 'lt' | 'gt' | 'lte' | 'gte';
  args: [Identifier, string | number];
} | {
  operator: string;
  args: any[];
});

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
 * Attempt to convert what's supposed to be a List node (but that we recognize
 * at runtime might be anything) to a FieldExperssion, given a set of supported
 * operators. This doesn't transform or validate the operator's args; it just
 * extracts them.
 */
export const listToFieldExpression =
  R.curry((operators: OperatorsConfig, list: any): FieldExpression => {
    // We may won't have a list at runtime when this is called to
    // validate the args to the and/or operators, among other cases.
    if(!Array.isArray(list)) {
      throw new SyntaxError("Expression must be a list.");
    }

    // For binary operators, the operator is the second item in the list
    // (i.e., it's infixed); otherwise, it must be the first item.
    if(list.length === 3 && isBinaryOperator(operators, list[1])) {
      return {
        operator: (list[1] as Identifier).value,
        args: [list[0], list[2]]
      };
    }

    // For other operators, they need to be known operators
    // and be non-binary. isNaryOperator checks for that.
    else if(isNaryOperator(operators, list[0])) {
      return {
        operator: (list[0] as Identifier).value,
        args: list.slice(1)
      };
    }

    // Otherwise, if we have a two item list, we infer eq,
    // assuming the eq operator is supported.
    else if(list.length === 2 && operators["eq"]) {
      return {
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

/**
 * A function called to finalize the arguments used in a given field expression.
 * This function has two points: 1) to transform the arguments from raw parse
 * results into a more amenable form, if appropriate; and 2) to throw if the
 * arguments are invalid for the operator in question.
 */
export function finalizeArgs(
  operators: OperatorsConfig,
  listToFieldExp: (parseResult: any) => FieldExpression,
  operator: string,
  args: any[]
): any[] {
  // For "and" and "or", the args must all themselves be field expressions.
  if(operator === "and" || operator === "or") {
    if(args.length === 0) {
      throw new Error(`The "${operator}" operator requires at least one argument.`);
    }
    return args.map(it => {
      const exp = listToFieldExp(it);
      return {
        ...exp,
        args: finalizeArgs(operators, listToFieldExp, exp.operator, exp.args)
      };
    });
  }

  // For built-in binary operators, there must be an identifier
  // as the first argument (to reference a field)
  else if(operators[operator]!.isBinary && !isId(args[0])) {
    throw new SyntaxError(
      `"${operator}" operator expects field reference as first argument.`
    );
  }

  return args;
};
