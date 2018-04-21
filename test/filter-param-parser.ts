const { expect } = require("chai");
import { isId } from '../src/helpers';
import { Identifier, FieldExpression } from './helpers';
import sut from '../src/filter-param-parser';

const noValidationFinalizeArgs = function(a: any, b: any, args: any[]) {
  return args;
}

const eqOperator = {
  "eq": { isBinary: true, finalizeArgs: noValidationFinalizeArgs }
};

const andOrOperators = {
  "and": { isBinary: false, finalizeArgs: noValidationFinalizeArgs },
  "or": { isBinary: false, finalizeArgs: noValidationFinalizeArgs }
};

const gteOperator = {
  "gte": { isBinary: true, finalizeArgs: noValidationFinalizeArgs }
};

const nowOperator = {
  "now": { isBinary: false, finalizeArgs: noValidationFinalizeArgs }
}

const andOrProperOperators = {
  "and-list": {
    isBinary: false,
    finalizeArgs(a: any, b: any, c: any[]) {
      if(!c.every(it => it && it.type === "FieldExpression")) {
        throw new Error("Arguments must be field expressions.");
      }
      return c;
    }
  },
  "or-list": {
    isBinary: false,
    finalizeArgs(a: any, b: any, c: any[]) {
      if(!c.every(it => it && it.type === "FieldExpression")) {
        throw new Error("Arguments must be field expressions.");
      }
      return c;
    }
  }
};

const nowProperOperator = {
  "now": {
    isBinary: false,
    finalizeArgs(a: any, b: any, args: any[]) {
      if(args.length) {
        throw new Error("`now` operator cannot take any arguments.");
      }
      return args;
    }
  }
};

const withFieldOperators = {
  "eq": {
    isBinary: true,
    finalizeArgs(a: any, b: any, args: any[]) {
      if(!isId(args[0])) {
        throw new Error("field reference required as first argument.");
      }
      return args;
    }
  },
  "lte": {
    isBinary: true,
    finalizeArgs(a: any, b: any, args: any[]) {
      if(!isId(args[0])) {
        throw new Error("field reference required as first argument.");
      }
      return args;
    }
  }
}

const gteExtendedOperator = {
  "gte": {
    isBinary: false,
    // Defining a custom finalizeArgs shoudl override the built-in one.
    finalizeArgs(a: any, b: any, args: any[]) {
      return ["custom args"];
    }
  }
};

describe("Filter param parsing", () => {
  describe("Empty lists", () => {
    it("Should reject them as invalid filter constraints", () => {
      expect(() => sut(eqOperator, "()")).to.throw(/Expected field expression/);
    });
  });

  describe("One items lists", () => {
    it("should reject if the item isn't a known operator", () => {
      expect(() => sut(eqOperator, "(now)")).to.throw(/must have a valid operator/);
    });

    it("should reject if the item is a binary operator", () => {
      expect(() => sut(eqOperator, "(eq)")).to.throw(/"eq" .+ binary .+ infixed/);
    });

    it("should treat as a no-arg expression if the arg is known + n-ary", () => {
      expect(sut(nowOperator, "(now)")).to.deep.equal([
        FieldExpression("now", [])
      ]);
    })
  });

  describe("Two item lists", () => {
    it("should recognize valid n-ary operators", () => {
      expect(sut(nowOperator, "(now,1)")).to.deep.equal([
        FieldExpression("now", [1])
      ]);
    });

    it("should infer `eq` if no known n-ary operator is present and eq is known", () => {
      expect(sut(eqOperator, "(fieldName,1)")).to.deep.equal([
        FieldExpression("eq", [Identifier("fieldName"), 1])
      ]);
    });

    it("should not try to recognize a binary operator", () => {
      const missingItemError = /binary .+ must have exactly three items/;
      expect(() => sut(gteOperator, "(gte,1)")).to.throw(/"gte" .+ binary .+ infixed/);
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
        FieldExpression("eq", [{ type: "Identifier", value: "fieldName" }, 1])
      ]);

      expect(sut(gteOperator, "(fieldName,gte,1)")).to.deep.equal([
        FieldExpression("gte", [{ type: "Identifier", value: "fieldName" }, 1])
      ]);
    });

    it("should reject leading binary operators, assuming no infixed op", () => {
      expect(() => sut(gteOperator, "(gte,fieldName,1)")).to.throw();

      expect(sut(gteOperator, "(gte,gte,1)")).to.deep.equal([
        FieldExpression("gte", [{ type: "Identifier", value: "gte" }, 1])
      ]);
    });

    it("should recognize leading n-ary operators", () => {
      expect(sut(nowOperator, "(now,fieldName,[])")).to.deep.equal([
        FieldExpression("now", [Identifier("fieldName"), []])
      ]);
    });

    it("should prefer a known infixed binary op over a known leadingnary op", () => {
      expect(sut({ ...nowOperator, ...gteOperator }, "(now,gte,[2])"))
        .to.deep.equal([
          FieldExpression("gte", [Identifier("now"), [2]])
        ]);
    })

    it("should error if first arg is not a known operator", () => {
      expect(() => sut(eqOperator, "(now,fieldName,[])")).to.throw();
    });
  });

  describe("4+-item lists", () => {
    it("should reject if the first item isn't a known nary operator", () => {
      expect(() => sut(eqOperator, "(now,test,3,14)"))
        .to.throw(/must have a valid operator/);

      // This looks like it could be binary, so error message is different.
      expect(() => sut(eqOperator, "(fieldName,eq,3,14)"))
        .to.throw(/"eq" .+ binary .+ exactly three items/);

      // As above, different error because input may have been intended as binary
      expect(() => sut(eqOperator, "(eq,3,14,3)"))
        .to.throw(/"eq" .+ binary .+ infixed/);
    });

    it("should wrap up all args into an array", () => {
      expect(sut(nowOperator, "(now,233,fieldName,(now),[true])")).to.deep.equal([
        FieldExpression(
          "now",
          [233, Identifier("fieldName"), FieldExpression("now",[]), [true]]
        )
      ]);
    });
  });

  describe("finalizeArgs", () => {
    it("should call it recursively", () => {
      expect(sut(gteExtendedOperator, "(gte,1000,fieldName,230)")).to.deep.equal([
        FieldExpression("gte", ["custom args"])
      ]);

      expect(
          sut({
            ...andOrOperators,
            ...gteExtendedOperator
          }, "(and,(gte,1000,fieldName,230))"
        )
      ).to.deep.equal([
        FieldExpression("and", [FieldExpression("gte", ["custom args"])])
      ]);

      expect(() => sut(nowProperOperator, "(now,1)"))
        .to.throw(/`now` operator cannot take any arguments/);

      expect(sut(nowProperOperator, "(now)")).to.deep.equal([
        FieldExpression("now", [])
      ]);

      const missingFieldError = /field reference required/;
      expect(() => sut(withFieldOperators, "(2,1)")).to.throw(missingFieldError);
      expect(() => sut(withFieldOperators, "(2,eq,1)")).to.throw(missingFieldError);
      expect(() => sut(withFieldOperators, "(2,lte,1)")).to.throw(missingFieldError);
      expect(() => sut(withFieldOperators, "((a,eq,c),lte,1)")).to.throw(missingFieldError);
      expect(() => sut(withFieldOperators, "(null,lte,1)")).to.throw(missingFieldError);
      expect(() => sut(withFieldOperators, "([a,b],lte,1)")).to.throw(missingFieldError);

      expect(() => sut(withFieldOperators, "(test,1)")).to.not.throw();
      expect(() => sut(withFieldOperators, "(test,eq,1)")).to.not.throw();
      expect(() => sut(withFieldOperators, "(test,lte,1)")).to.not.throw();
    });
  });

  describe("operators with raw field expressions as args", () => {
    it("should (recursively) process the field expressions, calling finalizeArgs", () => {
      const sutWithOps = sut.bind(null, {
        ...eqOperator,
        ...nowProperOperator,
        ...gteOperator,
        ...andOrOperators,
        ...andOrProperOperators
      });

      const invalidsToErrors = {
        //test is unknown operator
        "(or,(field,gte,2),(test,fieldName,3))": /must have a valid operator symbol/,

        // same as above, but nested
        "(and,(or,(test,x,1)))": /must have a valid operator symbol/,

        // true and test below aren't field expressions
        "(and-list,true)": /arguments must be field expressions/i,
        "(or-list,(field,eq,2),(date,gte,(now)),(and-list,test))": /arguments must be field expressions/i,
      };

      Object.keys(invalidsToErrors).forEach(k => {
        expect(() => sutWithOps(k)).to.throw((invalidsToErrors as any)[k]);
      })

      expect(sutWithOps("(and,(field,eq,2),(date,gte,(now)),(test,4))"))
        .to.deep.equal([
          FieldExpression("and", [
            FieldExpression("eq", [{type: "Identifier", value: "field"}, 2]),
            FieldExpression("gte", [Identifier("date"), FieldExpression("now", [])]),
            FieldExpression("eq", [{type: "Identifier", value: "test"}, 4])
          ])
        ]);

      // Normal `and` operator doesn't validate it's args as field expressions.
      expect(sutWithOps("(and,true)")).to.deep.equal([
        FieldExpression("and", [true])
      ]);

      expect(sut(withFieldOperators, "(test,lte,(a,eq,c))")).to.deep.equal([
        FieldExpression("lte", [
          Identifier("test"),
          FieldExpression("eq", [Identifier("a"), Identifier("c")])
        ])
      ]);

      expect(sutWithOps("(and,(or,(and,(it,3)),(test,gte,null)))"))
        .to.deep.equal([
          FieldExpression("and", [
            FieldExpression("or", [
              FieldExpression("and", [
                FieldExpression("eq", [Identifier("it"), 3])
              ]),
              FieldExpression("gte", [Identifier("test"), null])
            ])
          ])
        ]);
    });
  });
});
