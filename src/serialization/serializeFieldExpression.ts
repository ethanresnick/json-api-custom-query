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
    // Numbers have various annoying special cases.
    if(typeof node === 'number') {
      if(!Number.isFinite(node)) {
        throw new Error("There's no way to serialize infinite numbers or NaN.");
      }

      // For very very large or small numbers, converting them to a string
      // renders them in exponential notation. E.g., String(.000000233296304941)
      // becomes "2.33296304941e-7". That's a problem, because then we can't
      // parse it back with the e. So, we need to use the internationalization
      // number formatting APIs in that case.
      const numberString = String(node);
      if(!numberString.toLowerCase().includes("e")) {
        return numberString;
      }

      // Note: we throw if toLocaleString doesn't support internationalization
      // options. That's ok, as we don't run this code unless we get a number
      // we can't serialize any other easy way.
      const toLocaleStringSupportsOptions = typeof Intl == 'object'
        && Intl && typeof Intl.NumberFormat === 'function';

      if (!toLocaleStringSupportsOptions) {
        throw new Error("This number was too big or too small to serialize.");
      }

      return node.toLocaleString("en-US", {
        useGrouping: false,
        maximumSignificantDigits: 21,
        minimumSignificantDigits: 1
      });
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

