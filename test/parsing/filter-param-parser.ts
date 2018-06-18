const { expect } = require("chai");
import { isIdentifier, isFieldExpression } from '../../src/helpers';
import { Identifier, FieldExpression } from './utils';
import sut from '../../src/parsing/filter-param-parser';

const noValidationFinalizeArgs = function(a: any, b: any, args: any[]) {
  return args;
}

const andOrOperators = {
  "and": { arity: Infinity, finalizeArgs: noValidationFinalizeArgs },
  "or": { arity: Infinity, finalizeArgs: noValidationFinalizeArgs }
};

const andOrProperOperators = {
  "and-list": {
    arity: Infinity,
    finalizeArgs(a: any, b: any, c: any[]) {
      if(!c.every(isFieldExpression)) {
        throw new Error("Arguments must be field expressions.");
      }
      return c;
    }
  },
  "or-list": {
    arity: Infinity,
    finalizeArgs(a: any, b: any, c: any[]) {
      if(!c.every(isFieldExpression)) {
        throw new Error("Arguments must be field expressions.");
      }
      return c;
    }
  }
};

const gteOperator = {
  "gte": { arity: 2, finalizeArgs: noValidationFinalizeArgs }
};

const gteExtendedOperator = {
  "gte": {
    arity: 1, // always satisfied because of finalizeArgs below.
    // Defining a custom finalizeArgs shoudl override the built-in one.
    finalizeArgs(a: any, b: any, args: any[]) {
      return ["custom args"];
    }
  }
};

const nowProperOperator = {
  "now": {
    arity: 0,
    finalizeArgs(a: any, b: any, args: any[]) {
      return args;
    }
  }
};

const eqProperOperator = {
  "eq": {
    arity: 2,
    finalizeArgs(a: any, b: any, args: any[]) {
      if(!isIdentifier(args[0])) {
        throw new Error("field reference required as first argument.");
      }
      return args;
    }
  }
}

describe("Filter param parsing", () => {
  // Here, we're only testing stuff not covered by the parser tests. We could
  // explicitly test "does it call parseFilter", but that's probably overkill.
  it("should reject unknown operators", () => {
    expect(() => sut(gteOperator, "(:now)")).to.throw(/"now" is not a recognized operator/);
    expect(() => sut(gteOperator, "(gte,:fieldName,1)")).to.throw(/"fieldName"/);
  });

  it("should reject if the operator requires a different number of args", () => {
    expect(() => sut(gteOperator, "(:gte,1)")).to.throw(/"gte" .+ exactly 2 arguments/);
    expect(() => sut(nowProperOperator, "(:now,1)")).to.throw(/"now" .+ exactly 0 arguments/);
  });

  it("should validate arity of the *finalized* arg set", () => {
    expect(() => sut(gteExtendedOperator, "(:gte,1)")).to.not.throw();
    expect(() => sut(gteExtendedOperator, "(:gte,1,2,3)")).to.not.throw();
  });

  describe("finalizeFieldExpression/finalizeArgs", () => {
    it("should call it recursively", () => {
      expect(sut(gteExtendedOperator, "(:gte,1000,fieldName,230)")).to.deep.equal([
        FieldExpression("gte", ["custom args"])
      ]);

      expect(
          sut({
            ...andOrOperators,
            ...gteExtendedOperator
          }, "(:and,(:gte,1000,fieldName,230))"
        )
      ).to.deep.equal([
        FieldExpression("and", [FieldExpression("gte", ["custom args"])])
      ]);

      const missingFieldError = /field reference required/;
      expect(() => sut(eqProperOperator, "(2,:eq,1)")).to.throw(missingFieldError);
      expect(() => sut(eqProperOperator, "((a,:eq,c),:eq,1)")).to.throw(missingFieldError);
      expect(() => sut(eqProperOperator, "(null,1)")).to.throw(missingFieldError);
      expect(() => sut(eqProperOperator, "([a,b],:eq,1)")).to.throw(missingFieldError);
      expect(() => sut(eqProperOperator, "(test,:eq,1)")).to.not.throw();

      const sutWithOps = sut.bind(null, {
        ...nowProperOperator,
        ...eqProperOperator,
        ...gteExtendedOperator,
        ...andOrOperators,
        ...andOrProperOperators
      });

      // Verify that the checks from finalizeFieldExpression (i.e., is it a
      // recognized operator with proper arity) and the custom finalizeArgs
      // (usually, was args[0] an identifier) are pplied recusively.
      const invalidsToErrors = {
        //test is unknown operator [at all levels]
        "(:or,(field,:gte,2),(:test,fieldName,3))": /"test" .+ recognized operator/,
        "(:and,(:or,(:test,x,1)))": /"test" .+ recognized operator/,

        // arity validation must happen recursively
        "(a,(:eq,field,2,2))": /"eq" .+ exactly 2 arguments/,
        "(a,(field,:eq,(:eq,field,0,0)))": /"eq" .+ exactly 2 arguments/,

        // "true" and "test" below isn't a field expression
        "(:and-list,true)": /arguments must be field expressions/i,
        "(:or-list,(field,:eq,2),(date,:gte,(:now)),(:and-list,test))": /arguments must be field expressions/i,
        "(:or-list,(:and-list,(:or-list,test)))": /arguments must be field expressions/i,
      };

      Object.keys(invalidsToErrors).forEach(k => {
        expect(() => sutWithOps(k)).to.throw((invalidsToErrors as any)[k]);
      })

      expect(sut(eqProperOperator, "(test,:eq,(a,:eq,c))")).to.deep.equal([
        FieldExpression("eq", [
          Identifier("test"),
          FieldExpression("eq", [Identifier("a"), Identifier("c")])
        ])
      ]);

      expect(sutWithOps("(:and,(:or,(:and,(it,:eq,3)),(test,:gte,null)))"))
        .to.deep.equal([
          FieldExpression("and", [
            FieldExpression("or", [
              FieldExpression("and", [
                FieldExpression("eq", [Identifier("it"), 3])
              ]),
              FieldExpression("gte", ["custom args"])
            ])
          ])
        ]);
    });
  });
});
