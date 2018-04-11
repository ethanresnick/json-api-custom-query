/**
 * A custom type used to represent the part of a query parameter parse result
 * that identifies/stands in for some literal value, to which it's dereferenced
 * given an an evaluation context. For example, in `?sort=fieldName` or
 * `?filter=(fieldName,eq,13)`, fieldName is an Identifier, that stands in for
 * and will be substituted for the field called `fieldName` on each resource
 * for which it evaluates. Likewise, `eq` would be an identifier that picks out
 * some global equals function, which'll be run on the db. These are just like
 * identifiers/variable names/symbols in programming languages.
 *
 * Using this class is important to support instanceof checks and more
 * functionality in the future.
 */
class Identifier {
  /**
   * @param {string} value A string value for the identifier.
   */
  constructor(value) {
    this.value = value;
  }
}

module.exports = Identifier;
