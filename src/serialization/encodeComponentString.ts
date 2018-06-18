/**
 * Encodes character sequences for use inside string literals or as identifiers.
 * It escapes (i.e., percent encodes) all characters our filter DSL uses for
 * delimiters. It builds on the RFC 2396-based encodeURIComponent and also
 * encodes the RFC 3986 reseved set, i.e. [!'()*], as we actually use most of
 * those characters for delimiters. Then, it adds other characters that we use
 * as delimiters, but that RFC 3986 doesn't technically reserve for this purpose,
 * but seem to be safe in practice (and/or are reserved by WHATWG Url), namely
 * backtick and the square brackets.
 */
export default function customEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(/[!'()*`\[\]]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
