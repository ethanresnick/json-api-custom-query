// A PegJS grammar for parsing our sort and filter query parameters.
// Either Sort or Filter can be used as the start node,
// to generate a parser for the corresponding parameter.

Filter
  = FieldExpression+

Sort "sort fields list"
  = head:SortField tail:("," SortField)* {
    return [head, ...(tail ? tail.map(it => it[1]) : [])];
  }

SortField "sort field"
  = desc:"-"? fieldOrExp:(FieldExpression / Symbol) {
    const direction = desc ? 'DESC' : 'ASC';

    return Object.assign(
      { direction },
      (fieldOrExp && fieldOrExp.type === 'RawFieldExpression'
        ? { expression: fieldOrExp }
        : { field: fieldOrExp.value })
    );
  }

Value "field expression, atomic value, or comma-separated list"
  = FieldExpression / List / EmptyList / Atom

FieldExpression "field expression"
  = "(" head:Value tail:("," Value)* ")" {
    return {
      type: "RawFieldExpression",
      items: [head, ...(tail ? tail.map(it => it[1]) : [])]
    };
  }

// Note: using square brackets unencoded in query params is legal under
// WHATWG Url but illegal under RFC 3986. However, becauce RFC 3986 does
// reserve square brackets as a delim more generally, RFC 3986 implementations
// seem to allow them and leave them unencoded in practice, so it's a non-issue.
// See https://stackoverflow.com/questions/11490326/is-array-syntax-using-square-brackets-in-url-query-strings-valid/49806195#49806195
List "comma-separated list"
  = "[" head:Value tail:("," Value)* "]" {
    return [head, ...(tail ? tail.map(it => it[1]) : [])];
  }

EmptyList "empty list"
  =  "[" "]" { return []; }

Atom "atomic value (i.e., a non-list value)"
  = String / Keyword / Number / Symbol

// Backticks are our preferred delimiter, because: unencoded double quotes
// aren't allowed under any URL spec; and unencoded single quotes aren't allowed
// under WHATWG URL, and many implementations that generally follow RFC 3986
// encode single quotes even though RFC 3986 allows them unencoded. However,
// unencoded backticks aren't allowed under RFC 3986, so we support the
// exclamation point as a fallback delimiter for clients that refuse to make
// requests with unencoded backticks. We decode the content b/c it's urlencoded
// to allow ` / ! within it.
String "string"
  = "`" content:[^`]* "`" {
    return decodeURIComponent(content.join(''));
  } / "!" content:[^!]* "!" {
    return decodeURIComponent(content.join(''));
  }

// Symbols are identifiers that can be dereferenced to a literal value within
// some evaluation context. They're used for field/operator/function names.
// They can't start with a minus sign, period, or digit to disambiguate them
// from the number grammar, and to avoid confusion w/ a sort field's direction
// indicator. We also ensure they don't match keywords, because using a
// `Keyword / Symbol` ordered choice isn't enough to prevent keywords getting
// matched as Symbols in cases where we can't have keywords (like SortFields).
Symbol "symbol (i.e., a field or operator name)"
  = ![0-9\-.] !Keyword content:SymbolChar+ {
      return { type: "Identifier", value: decodeURIComponent(content.join('')) };
    }

Number "number"
  = isNegative:"-"? (([0-9]+ ("." [0-9]+)?) / "." [0-9]+) {
      return parseFloat(text());
    }

// A naive grammar for booleans and null (e.g., Null = "null") would match the
// Symbol production too. And it's hard to know how to narrow the Symbol rule so
// it wouldn't match "null", e.g. We  could start it with a negative lookahead
// (i.e., `!null`), but then it wouldn't match the field `nullifiedOn`. If we
// use a choice expression in our grammar to try to handle this (i.e.,
// Null / Boolean / Symbol), we'll hit problems because the beginning of the
// text "nullifiedOn" will match as a Null, and then the parse will fail because
// the next step will try to match a rule against the "ifiedOn" part, whereas
// the grammar is probably looking for a delimiter. Conversely, if we do
// (Symbol / Null / Boolean) as our choice, Null would never be reached and our
// parse results would only be Symbols. So, instead we do a lookahead after our
// bools and null, to make sure we're only matching as a bool etc if we don't
// have characters beyond the match that are part of the production for/would
// turn it into a general Symbol. The equivalent of this in the old code is that
// the separate lexing step would've encountered a delimiter (which includes
// !SymbolChar) and ended our "true"/"false"/"null"/"434" tokens at that
// delimiter, so our atomFromToken could easily match on them.
Keyword
  = Boolean / Null

Boolean "boolean"
  = ("false" / "true") !SymbolChar {
      return (text() === 'true') ? true : false;
    }

Null "null"
  = "null" !SymbolChar {
      return null;
    }

// A symbol can contain any character except for those that:
// 1) this grammar uses as delimiters (parentheses, comma, backtick,
//    exclamation points, and square brackets);
// 2) already have a function in query strings in the HTTP uri scheme or in
//    HTTP conventions (ampersand, equals, plus, question mark, slash);
// 3) are not allowed in query strings (#); or that
// 4) I want to reserve for future expansions of this grammar (:, @, $, *, ;, ')
// Importantly, symbols can contain "%", to allow percent-encoded characters.
SymbolChar = [^(),`!\[\]&=+#:@$*;'?/]
