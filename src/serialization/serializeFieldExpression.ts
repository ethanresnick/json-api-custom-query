import { FieldExpressionEntry, isFieldExpression, isIdentifier } from '../helpers';
import { encodeStringContents, encodeSymbolValue } from './encodeComponentString';

/**
 * This function serializes a FieldExpression, recursively serializing the
 * items/entries in it. (It can also be called directly to serialize one of
 * the entry types, like a list.)
 *
 * @param  {FieldExpressionEntry} node A FieldExpression node,
 *   or one of its arguments.
 * @return {string} The serialization result.
 */
export default function serializeNode(node: FieldExpressionEntry): string {
  if(node === null || typeof node === "boolean" || typeof node === "number") {
    if(typeof node === 'number' && !Number.isFinite(node)) {
      throw new Error("There's no way to serialize infinite numbers or NaN.");
    }

    return String(node);
  }

  else if (typeof node === 'string') {
    return "`" + encodeStringContents(node) + "`";
  }

  else if(isIdentifier(node)) {
    return encodeSymbolValue(node.value);
  }

  else if(Array.isArray(node)) {
    return "[" + node.map(serializeNode).join(",") + "]";
  }

  else if(isFieldExpression(node)) {
    const serializedOperator = ":" + encodeSymbolValue(node.operator);
    const serializedArgs = node.args.map(serializeNode);

    if(node.args.length === 2) {
      return node.operator === 'eq'
        ? `(${serializedArgs[0]},${serializedArgs[1]})`
        : `(${serializedArgs[0]},${serializedOperator},${serializedArgs[1]})`;
    }

    return (
      "(" +
        serializedOperator +
        (node.args.length ? "," : "") +
        serializedArgs.join(",") +
      ")"
    );
  }

  // Assert that node is of type `never` here, for compile-time
  // verification that we've handled all the cases.
  return assertNever(node, "Unexpected/unserializable node type.");
};

function assertNever(x: never, message: string): never {
  throw new Error(message);
}

