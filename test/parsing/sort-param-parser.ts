const { expect } = require("chai");
import { Identifier, FieldExpression } from './utils';
import sut from '../../src/parsing/sort-param-parser';

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
  it("should error if a field expression is invalid", () => {
    expect(() => sut(eqOperator, "test,(:now)")).to.throw(/"now" .+ recognized operator/);
    expect(() => sut(eqOperator, "(:now)")).to.throw(/"now" .+ recognized operator/);
  })

  it("should reject direction with missing symbol", () => {
    expect(() => sut(eqOperator, "%2d") /* %2D = "-" */).to.throw('Expected sort fields list but "-" found.');
  });

  it("should reject leading - signs in symbol names", () => {
    expect(() => sut(eqOperator, "-%2dx")).to.throw('Expected sort fields list but "-" found.');
    expect(() => sut(eqOperator, "--x")).to.throw('Expected sort fields list but "-" found.');
  });

  it("should reject url-encoded keywords, number literals as symbol names", () => {
    expect(() => sut(eqOperator, "%39") /* %39 = "9" */).to.throw('Expected sort fields list but "9" found.');
    expect(() => sut(eqOperator, "%74rue") /* %74 = "t" */).to.throw('Expected sort fields list but "t" found.');
    expect(() => sut(eqOperator, "%6Eull") /* %6E = "n" */).to.throw('Expected sort fields list but "n" found.');
    expect(() => sut(eqOperator, "n%75ll") /* %75 = "u" */).to.throw('Expected sort fields list but "n" found.');
    expect(() => sut(eqOperator, "%66alse") /* %66 = "f" */).to.throw('Expected sort fields list but "f" found.');
    expect(() => sut(eqOperator, "f%61lse") /* %61 = "a" */).to.throw('Expected sort fields list but "f" found.');
  });


  it("should (recursively) process the field expressions, calling finalizeArgs", () => {
    const sutWithOps = sut.bind(null, {
      ...eqOperator,
      ...gteExtendedOperator,
      ...andOrOperators
    });

    expect(sutWithOps("-hello,(:and,(:or,(:and,(it,3)),(:gte,1000,fieldName,230)),(field,:eq,2))"))
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
});
