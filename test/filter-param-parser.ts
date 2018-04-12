const { expect } = require("chai");
import sut from '../src/filter-param-parser';

const eqOperator = {
  "eq": { isBinary: true }
};

const andOrOperators = {
  "and": { isBinary: false },
  "or": { isBinary: false }
};

const gteOperator = {
  "gte": { isBinary: true }
};

const nowOperator = {
  "now": { isBinary: false }
}

const nowProperOperator = {
  "now": {
    isBinary: false,
    finalizeArgs(a: any, b: any, c: any, args: any[]) {
      if(args.length) {
        throw new Error("`now` operator cannot take any arguments.");
      }
      return args;
    }
  }
};

const gteExtendedOperator = {
  "gte": {
    isBinary: false,
    // Defining a custom finalizeArgs shoudl override the built-in one.
    finalizeArgs(a: any, b: any, c: any, args: any[]) {
      return ["custom args"];
    }
  }
};

describe("Filter param parsing", () => {
  describe("Empty lists", () => {
    it("Should reject them as invalid filter constraints", () => {
      expect(() => sut(eqOperator, "()")).to.throw(/Expected comma-separated list/);
    });
  });

  describe("One items lists", () => {
    it("should reject if the item isn't a known operator", () => {
      expect(() => sut(eqOperator, "(now)")).to.throw(/must have a valid operator/);
    });

    it("should reject if the item is a binary operator", () => {
      expect(() => sut(eqOperator, "(eq)")).to.throw(/binary operator .+ exactly three items/);
    });

    it("should treat as a no-arg expression if the arg is known + n-ary", () => {
      expect(sut(nowOperator, "(now)")).to.deep.equal([
        { operator: "now", args: [] }
      ]);
    })
  });

  describe("Two item lists", () => {
    it("should recognize valid n-ary operators", () => {
      expect(sut(nowOperator, "(now,1)")).to.deep.equal([
        { operator: "now", args: [1] }
      ]);
    });

    it("should infer `eq` if no known n-ary operator is present and eq is known", () => {
      expect(sut(eqOperator, "(fieldName,1)")).to.deep.equal([
        { operator: "eq", args: [{ type: "identifier", value: "fieldName" }, 1] }
      ]);
    });

    it("should not try to recognize a binary operator", () => {
      const missingItemError = /binary operator .+ must have exactly three items/;
      expect(() => sut(gteOperator, "(gte,1)")).to.throw(missingItemError);
      expect(() => sut(gteOperator, "(1,gte)")).to.throw(missingItemError);
      expect(() => sut(gteOperator, "(fieldName,gte)")).to.throw(missingItemError);
    });

    it("should error if no known operator is present and eq isn't known", () => {
      expect(() => sut(nowOperator, "(2,1)")).to.throw();
    });
  });

  describe("three item lists", () => {
    it("should appropriately recognize infixed binary operators in valid lists", () => {
      expect(sut(eqOperator, "(fieldName,eq,1)")).to.deep.equal([
        { operator: "eq", args: [{ type: "identifier", value: "fieldName" }, 1] }
      ]);

      expect(sut(gteOperator, "(fieldName,gte,1)")).to.deep.equal([
        { operator: "gte", args: [{ type: "identifier", value: "fieldName" }, 1] }
      ]);
    });

    it("should reject leading binary operators, assuming no infixed op", () => {
      expect(() => sut(gteOperator, "(gte,fieldName,1)")).to.throw();

      expect(sut(gteOperator, "(gte,gte,1)")).to.deep.equal([
        { operator: "gte", args: [{ type: "identifier", value: "gte" }, 1] }
      ]);
    });

    it("should recognize leading n-ary operators", () => {
      expect(sut(nowOperator, "(now,fieldName,())")).to.deep.equal([{
        operator: "now",
        args: [
          { type: "identifier", value: "fieldName" },
          []
        ]
      }]);
    });

    it("should prefer a known infixed binary op over a known leadingnary op", () => {
      expect(sut({ ...nowOperator, ...gteOperator }, "(now,gte,())"))
        .to.deep.equal([{
          operator: "gte",
            args: [
            { type: "identifier", value: "now" },
            []
          ]
        }]);
    })

    it("should error if first arg is not a known operator", () => {
      expect(() => sut(eqOperator, "(now,fieldName,())")).to.throw();
    });
  });

  describe("4+-item lists", () => {
    it("should reject if the first item isn't a known operator", () => {
      expect(() => sut(eqOperator, "(now,test,3,14)"))
        .to.throw(/must have a valid operator/);

      // This looks like it could be binary, but it has an extra arg.
      expect(() => sut(eqOperator, "(fieldName,eq,3,14)"))
        .to.throw(/must have a valid operator/);
    });

    it("should wrap up all args into an array", () => {
      expect(sut(nowOperator, "(now,233,fieldName,(true))")).to.deep.equal([{
        operator: "now",
        args: [233, { type: "identifier", value: "fieldName"}, [true]]
      }]);
    });
  });

  describe("custom finalizeArgs", () => {
    it("should use the user's finalizeArgs instead of the built-in one", () => {
      expect(sut(gteExtendedOperator, "(gte,1000,fieldName,230)")).to.deep.equal([
        { operator: "gte", args: ["custom args"]}
      ]);

      expect(() => sut(nowProperOperator, "(now,1)"))
        .to.throw(/`now` operator cannot take any arguments/);

      expect(sut(nowProperOperator, "(now)")).to.deep.equal([
        { operator: "now", args: []}
      ]);
    })
  });

  describe("binary operators", () => {
    it("should require the first item be a field reference", () => {
      const missingFieldError = /expects field reference/;
      expect(() => sut(eqOperator, "(2,1)")).to.throw(missingFieldError);
      expect(() => sut(eqOperator, "(2,eq,1)")).to.throw(missingFieldError);
      expect(() => sut(gteOperator, "(2,gte,1)")).to.throw(missingFieldError);
      expect(() => sut(gteOperator, "((a,b,c),gte,1)")).to.throw(missingFieldError);
      expect(() => sut(gteOperator, "(null,gte,1)")).to.throw(missingFieldError);
      expect(() => sut(gteOperator, "((),gte,1)")).to.throw(missingFieldError);
    });
  });

  describe("and/or operators", () => {
    it("should verify (recursively) that args are valid field expressions themselves", () => {
      const sutWithOps = sut.bind(null, {
        ...eqOperator,
        ...nowProperOperator,
        ...gteOperator,
        ...andOrOperators
      });

      const invalidsToErrors = {
        // () is a field expr missing any operator.
        "(and,())": /must have a valid operator symbol/,

        //test is unknown operator
        "(or,(field,gte,2),(test,fieldName,3))": /must have a valid operator symbol/,

        // same as above, but nested
        "(and,(or,()))": /must have a valid operator symbol/,

        // true and test below aren't lists
        "(and,true)": /expression must be a list/i,
        "(or,(field,eq,2),(date,gte,(now)),(and,test))": /expression must be a list/i,

        // In the case below, we try to parse first argument to the and
        // (i.e., the nested list) as a field expr, as always. Because it has
        // two items, an eq operator is inferred. So this is asserting that
        // `((field,eq,2),eq,(date,gte,now))`. But the eq operator requires the
        // first argument to be a field reference not a list, hence the error.
        "(and,((field,eq,2),(date,gte,(now))))": /"eq" operator expects field reference/
      };

      Object.keys(invalidsToErrors).forEach(k => {
        expect(() => sutWithOps(k)).to.throw((invalidsToErrors as any)[k]);
      })

      expect(sutWithOps("(and,(field,eq,2),(date,gte,(now)),(test,4))"))
        .to.deep.equal([{
          operator: "and",
          args: [{
            operator: "eq",
            args: [{type: "identifier", value: "field"}, 2]
          }, {
            operator: "gte",
            args: [
              {type: "identifier", value: "date"},
              // Note: this is not automatically turned into a
              // { operator: "now", args: [] }, because the system can't
              // know whether you mean to evaluate some "now" function or
              // create a one item list with the value now in it.
              // If adapters want to disallow this, they can specify
              // their own finalizeArgs functions.
              [{ type: "identifier", value: "now" }]
            ]
          }, {
            operator: "eq",
            args: [{type: "identifier", value: "test"}, 4]
          }]
        }]);

      expect(sutWithOps("(and,(or,(and,(it,3))))"))
        .to.deep.equal([{
          operator: "and",
          args: [{
            operator: "or",
            args: [{
              operator: "and",
              args: [{
                operator: "eq",
                args: [{ type: "identifier", value: "it"}, 3]
              }]
            }]
          }]
        }]);
    });
  });
});
