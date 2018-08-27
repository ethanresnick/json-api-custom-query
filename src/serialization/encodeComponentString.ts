/**
 * Takes a string containing a single, ascii character
 * and returns its percent encoded value.
 *
 * This function throws if it's given a non-ascii characters, as such
 * characters have to be converted to a specific (superset of ascii) character
 * encoding before percent encoding the character's bytes (in that character
 * encoding). Doing that conversion is tricky, so we don't bother with it here.
 *
 * Note: if you _were_ going to try to percent encode a non-ascii unicode
 * character, you'd probably want to encode it as UTF8 first. The early URI RFCs
 * are silent on what encoding to use, but RFC 3986 seems to suggest encoding with
 * UTF 8 (at least in new URI schemes) and that's encodeURIComponent does, which
 * we're using elsewhere.
 */
function percentEncodeAscii(c: string) {
  if(c.length !== 1 || c.codePointAt(0)! > 127) {
    throw new Error("This function is only designed to encode a single ASCII character.");
  }

  return '%' + c.codePointAt(0)!.toString(16).toUpperCase();
}

/**
 * Encodes character sequences for use inside string literals.
 * It's also the basis for encoding identifier names, though they require
 * a bit of additional special handling.
 *
 * It escapes (i.e., percent encodes) all characters our filter DSL uses for
 * delimiters, or that always have to be escaped in URLs. It builds on the
 * RFC 2396-based encodeURIComponent and also encodes the RFC 3986 reseved set,
 * i.e. [!'()*], as we actually use most of those characters for delimiters.
 * Then, it adds other characters that we use as delimiters, but that RFC 3986
 * doesn't technically reserve for this purpose, but seem to be safe in practice
 * (and/or are reserved by WHATWG Url), namely backtick and the square brackets.
 *
 * Note: this function encodes more than it technically needs to. E.g., it
 * encodes the `/` character, even though that's only a delimiter in the path
 * the path segment, not the query. And there's a bit more over-encoding for
 * string literals than for symbol values (because, e.g., a parenthesis can
 * appear literally in a string but not in a symbol, since the parser knows
 * that the string continues until the next backtick/exclamation mark).
 * This over-encoding doesn't cause problems, so I'm leaving it. Also, I'm
 * not making a separate function to escape fewer symbols in strings becuase
 * 1) that would now change peoples' existing urls, which is bad; and 2) it's
 * probably not worth the complexity.
 */
function customEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(/[!'()*`\[\]]/g, percentEncodeAscii);
}

/**
 * Encode the name of a symbol/identifier for use in a url.
 */
export function encodeSymbolValue(str: string) {
  const encoded = customEncodeURIComponent(str);

  // Our grammar doesn't allow leading digits, hyphens, or periods in
  // symbol names to appear literally, to prevent grammar ambiguity.
  if(/[0-9\-.]/.test(encoded[0])) {
    return percentEncodeAscii(encoded[0]) + encoded.slice(1);
  }

  return encoded;
}

export { customEncodeURIComponent as encodeStringContents };