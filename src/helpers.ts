import { FieldExpression, SortField, FieldExpressionEntry } from './parsing/parser';

export type Identifier = { type: "Identifier", value: string };
export const isIdentifier = (it: any): it is Identifier =>
  it && it.type === "Identifier";

export { FieldExpression };
export const isFieldExpression = (it: any): it is FieldExpression =>
  it && it.type === "FieldExpression";

export { SortField };
export const isSortField = (it: any): it is SortField =>
  it && it.type === "SortField";

export type OperatorsConfig = {
  [operatorName: string]: {
    arity: number;
    finalizeArgs: (operators: OperatorsConfig, operator: string, args: any[]) => any[];
  } | undefined
}

/**
 * All the input to our parsing functions come from from url query strings.
 * It's possible that this input could have percent-encoded versions of
 * unreserved characters in it (e.g., "%61" instead of "a"). According to
 * RFC 3986, we need to treat these like their unencoded equivalents --
 * which seems like a good idea anyway, because someone sending an encoded
 * unreserved character and expecting a different parse result could have
 * their code break if an intermediary is added that does URL normalization.
 * So, we need to normalize the input strings by decoding only unreserved chars
 * before parsing.
 */
export function normalizePartialUriString(str: string) {
  // Unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
  return str.replace(
    /\%((?:3[0-9])|(?:4[1-F])|(?:5[0-A])|(?:6[1-F])|(?:7[0-A])|2D|2E|5F|7E)/ig,
    function(x) {
      return decodeURIComponent(x);
    }
  );
}

export { FieldExpressionEntry };
