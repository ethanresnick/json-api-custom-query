const { expect } = require("chai");
import { Identifier, FieldExpression } from './utils';
import sut from '../src/sort-param-parser';

const noValidationFinalizeArgs = function(a: any, b: any, args: any[]) {
  return args;
}

const eqOperator = {
  "eq": { arity: 2, finalizeArgs: noValidationFinalizeArgs }
};

const andOrOperators = {
  "and": { arity: Infinity, finalizeArgs: noValidationFinalizeArgs },
  "or": { arity: Infinity, finalizeArgs: noValidationFinalizeArgs }
};

const gteExtendedOperator = {
  "gte": {
    arity: Infinity,
    // Defining a custom finalizeArgs shoudl override the built-in one.
    finalizeArgs(a: any, b: any, args: any[]) {
      return ["custom args"];
    }
  }
};

describe("Sort param parsing", () => {
  it("should allow a mix of field expressions and simple fields", () => {
    expect(sut(eqOperator, "test,(a,4)")).to.deep.equal([
      { direction: "ASC", field: "test" },
      { direction: "ASC", expression: FieldExpression('eq', [Identifier("a"), 4]) }
    ]);

    expect(sut(eqOperator, "-(a,4)")).to.deep.equal([
      { direction: "DESC", expression: FieldExpression('eq', [Identifier("a"), 4]) }
    ]);

    expect(sut(eqOperator, "test")).to.deep.equal([
      { direction: "ASC", field: "test" }
    ]);
  });

  it("should error if a field expression is invalid", () => {
    expect(() => sut(eqOperator, "test,(now)")).to.throw(/must have a valid operator/);
    expect(() => sut(eqOperator, "(now)")).to.throw(/must have a valid operator/);
  })

  it("should (recursively) process the field expressions, calling finalizeArgs", () => {
    const sutWithOps = sut.bind(null, {
      ...eqOperator,
      ...gteExtendedOperator,
      ...andOrOperators
    });

    expect(sutWithOps("-hello,(and,(or,(and,(it,3)),(gte,1000,fieldName,230)),(field,eq,2))"))
      .to.deep.equal([{
        direction: "DESC",
        field: "hello"
      }, {
        direction: "ASC",
        expression: FieldExpression("and", [
          FieldExpression("or", [
            FieldExpression("and", [
              FieldExpression("eq", [Identifier("it"), 3])
            ]),
            FieldExpression("gte", ["custom args"])
          ]),
          FieldExpression("eq", [{type: "Identifier", value: "field"}, 2])
        ])
      }]);
  });

  it("should parse direction", () => {
    expect(sut(eqOperator,"test,-test,(1,1),-(1,1)")).to.deep.equal([
      { direction: "ASC", field: "test" },
      { direction: "DESC", field: "test" },
      { direction: "ASC", expression: FieldExpression("eq", [1, 1]) },
      { direction: "DESC", expression: FieldExpression("eq", [1, 1]) },
    ]);
  });
});
