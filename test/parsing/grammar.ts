const { expect } = require("chai");
import sut = require('../../src/parsing/parser');
import { Identifier, FieldExpression } from './utils';

const parseFilter = (str: string) => sut.parse(str, { startRule: "Filter" });
const parseSort = (str: string) => sut.parse(str, { startRule: "Sort" });

describe('Parser from underlying grammar', () => {
  describe("Filter", () => {
    it("should reject empty field expressions", () => {
      expect(() => parseFilter("()")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(a,b,c)()")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(a,b,())")).to.throw(/Expected.+field expression/);
    });

    it("should support multiple field expressions without any separators at top-level", () => {
      expect(() => parseFilter("(ab,:c,d)(3,:e,d)")).to.not.throw();
      expect(() => parseFilter("(ab,:c,d),(3,:e,d)")).to.throw(/but "," found/);
      expect(() => parseFilter("(ab,:c,d) (3,:e,d)")).to.throw(/but " " found/);
    });

    it("should not allow non-field-expression items at top-level", () => {
      expect(() => parseFilter("44")).to.throw(/field expression but "4"/);
      expect(() => parseFilter("-4")).to.throw(/field expression but "-"/);
      expect(() => parseFilter("ab")).to.throw(/field expression but "a"/);
      expect(() => parseFilter("true")).to.throw(/field expression but "t"/);
      expect(() => parseFilter("null")).to.throw(/field expression but "n"/);
      expect(() => parseFilter("null")).to.throw(/field expression but "n"/);
      expect(() => parseFilter("[test]")).to.throw(/field expression but \"\[\"/);
    })
  });

  describe("Sort", () => {
    it("should reject empty field expressions", () => {
      expect(() => parseSort("fieldA,()")).to.throw();
      expect(() => parseSort("fieldA,(:a,())")).to.throw();
      expect(() => parseSort("fieldA,(ax,:x,x)")).to.not.throw();
      expect(() => parseSort("fieldA,(:ax,[])")).to.not.throw();
    });

    it("should reject number literals as sort fields", () => {
      expect(() => parseSort("fieldA,-23")).to.throw()
    });

    it("should parse direction based on minus sign", () => {
      expect(parseSort("fieldA,-fieldB")).to.deep.equal([
        { field: "fieldA", direction: "ASC" },
        { field: "fieldB", direction: "DESC" }
      ]);
    });

    // In theory, we could accept these as symbols, because a boolean/null
    // isn't allowed in this context, but that'd be confusing/inconistent.
    it("should reject true/false/null as sort fields", () => {
      expect(() => parseSort("null")).to.throw(/sort fields list but "n" found/);
      expect(() => parseSort("true")).to.throw(/sort fields list but "t" found/);
      expect(() => parseSort("false")).to.throw(/sort fields list but "f" found/);
      expect(parseSort("nullified")).to.deep.equal([{ field: "nullified", direction: "ASC" }]);
      expect(parseSort("truthy")).to.deep.equal([{ field: "truthy", direction: "ASC" }]);
    });

    it("should reject list literals as sort fields", () => {
      expect(() => parseSort("john,[test]")).to.throw()
      expect(() => parseSort("[test],john")).to.throw(/sort fields list but \"\[\" found/)
    });

    it('should support field expressions, with directions', () => {
      const expression = FieldExpression("y", [
        Identifier("x"),
        Identifier("z")
      ]);

      const ascResult = { direction: "ASC", expression };
      const descResult = { direction: "DESC", expression };

      expect(parseSort("fieldA,(x,:y,z)")[1]).to.deep.equal(ascResult);
      expect(parseSort("(x,:y,z),fieldA")[0]).to.deep.equal(ascResult)
      expect(parseSort("fieldA,-(x,:y,z)")[1]).to.deep.equal(descResult);
      expect(parseSort("-(x,:y,z),fieldA")[0]).to.deep.equal(descResult);
    });

    it("should allow a mix of field expressions and simple fields", () => {
      expect(parseSort("-(a,4)")).to.deep.equal([
        { direction: "DESC", expression: FieldExpression('eq', [Identifier("a"), 4]) }
      ]);

      expect(parseSort("test")).to.deep.equal([
        { direction: "ASC", field: "test" }
      ]);

      expect(parseSort("test,-test,(1,:eq,1),-(1,1)")).to.deep.equal([
        { direction: "ASC", field: "test" },
        { direction: "DESC", field: "test" },
        { direction: "ASC", expression: FieldExpression("eq", [1, 1]) },
        { direction: "DESC", expression: FieldExpression("eq", [1, 1]) },
      ]);
    });
  });

  describe("Field expression lists", () => {
    it("Should reject empty lists ", () => {
      expect(() => parseSort("()")).to.throw(/Expected sort fields list/);
      expect(() => parseFilter("()")).to.throw(/Expected field expression/);
    });

    it("should accept zero or more args if leading operator syntax used", () => {
      expect(parseFilter("(:now)")).to.deep.equal([
        FieldExpression("now", [])
      ]);
      expect(parseFilter("(:w,1)")).to.deep.equal([
        FieldExpression("w", [1])
      ]);
      expect(parseFilter("(:now,fieldName,[])")).to.deep.equal([
        FieldExpression("now", [Identifier("fieldName"), []])
      ]);
      expect(parseFilter("(:now,233,fieldName,(:now,1,2,3),[true])")).to.deep.equal([
        FieldExpression(
          "now",
          [233, Identifier("fieldName"), FieldExpression("now",[1,2,3]), [true]]
        )
      ]);
    })

    it("should require exactly 2 args if infix operator syntax is used", () => {
      expect(parseFilter("(fieldName,:eq,1)")).to.deep.equal([
        FieldExpression("eq", [{ type: "Identifier", value: "fieldName" }, 1])
      ]);

      expect(() => parseFilter("(now)")).to.throw(/Expected field expression/);
      expect(() => parseFilter("(fieldName,:eq)")).to.throw(/Expected field expression/);
      expect(() => parseFilter("(fieldName,:eq,3,14)")).to.throw(/Expected field expression/);
    });

    it("should reject constraints with no operator", () => {
      expect(() => parseFilter("(a,b,c)")).to.throw();
    });

    it("should reject constraints with two operators", () => {
      expect(() => parseFilter("(:a,:b,c,d)")).to.throw();
    });

    it("should infer the eq operator from two item lists with no operator", () => {
      expect(parseFilter("(fieldName,1)")).to.deep.equal([
        FieldExpression("eq", [Identifier("fieldName"), 1])
      ]);
      expect(parseFilter("(1,fieldName)")).to.deep.equal([
        FieldExpression("eq", [1,Identifier("fieldName")])
      ]);
    });

    it("should parse the appropriate item as the operator", () => {
      expect(parseFilter("(ab,:c,d)")).to.deep.equal([
        FieldExpression("c", [Identifier("ab"),Identifier("d")])
      ]);

      expect(parseFilter("(:ab,c)")).to.deep.equal([
        FieldExpression("ab", [Identifier("c")])
      ]);

      expect(parseSort("(:x,y,z)")).to.deep.equal([{
        direction: "ASC",
        expression: FieldExpression("x", [
          Identifier("y"),
          Identifier("z")
        ])
      }]);
    });

    it("should reject trailing commas", () => {
      expect(() => parseSort("(a,)")).to.throw();
      expect(() => parseSort("(:a,)")).to.throw();
      expect(() => parseSort("(:a,,)")).to.throw();
    });

    it("should reject lists with no content between commas", () => {
      expect(() => parseSort("(a,,b)")).to.throw();
      expect(() => parseSort("(:a,,b)")).to.throw();
    });

    it("should reject non-symbols in operator position", () => {
      expect(() => parseFilter("(a,:3)")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(:3,a)")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(:true,a)")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(:(a,eq,b),a)")).to.throw(/Expected.+field expression/);
    });
  });

  describe("Symbol", () => {
    it("should properly differentiate symbols from null/bool literals", () => {
      expect(sut.parse("(true,:truedat,null)", { startRule: "Filter" }))
        .to.deep.equal([FieldExpression("truedat", [true, null])]);
    });

    it("may not have a quotation mark in it", () => {
      expect(() => parseSort("'test'")).to.throw(/sort fields list but "'"/i);
      expect(() => parseSort("are'te")).to.throw(/end of input but "'"/i);
    })

    it("may not have URL-meaningful characters in it (?, &, =, /)", () => {
      expect(() => parseSort("?test'")).to.throw(/sort fields list but "?"/i);
      expect(() => parseSort("te?st'")).to.throw(/end of input but "?"/i);

      expect(() => parseSort("/arte")).to.throw(/sort fields list but "\/"/i);
      expect(() => parseSort("are/te")).to.throw(/end of input but "\/"/i);

      expect(() => parseSort("=arte")).to.throw(/sort fields list but "="/i);
      expect(() => parseSort("are=te")).to.throw(/end of input but "="/i);

      expect(() => parseSort("&arte")).to.throw(/sort fields list but "&"/i);
      expect(() => parseSort("are&te")).to.throw(/end of input but "&"/i);
    });

    it("may have a percent sign in it", () => {
      expect(parseSort("%C2%A9")).to.deep.equal([{
        field: "©", direction: "ASC"
      }]);

      expect(parseSort("(:test,`%22J%26J%22%21%2C%20%27You%20know%20%28it%29%2C%20and%20%2a.`)"))
        .to.deep.equal([{
          direction: "ASC",
          expression: FieldExpression("test", ['"J&J"!, \'You know (it), and *.'])
        }])
    });

    // Symbol literals should be totally unambiguous with number literals and
    // our operator prefix sigil.
    it("should reject leading period, minus, colon, and number in symbol names", () => {
      expect(() => { parseFilter("(:op,-test)"); }).to.throw();
      expect(() => { parseFilter("(:op,-22d)"); }).to.throw();
      expect(() => { parseFilter("(:op,1d)"); }).to.throw();
      expect(() => { parseFilter("(:op,.test)"); }).to.throw();
      expect(() => { parseFilter("(:op,.22d)"); }).to.throw();
      expect(() => { parseFilter("(:a,true,:a22)"); }).to.throw();
    })

    it("should allow periods, minus signs, and numbers in symbol names", () => {
      expect(parseFilter("(:a-test)")).to.deep.equal([
        FieldExpression("a-test", []),
      ]);
      expect(parseFilter("(2,:a-22d,3)")).to.deep.equal([
        FieldExpression("a-22d", [2,3])
      ]);
      expect(parseFilter("(:a1d)")).to.deep.equal([
        FieldExpression("a1d", [])
      ]);
      expect(parseFilter("(true,:a.test,false)")).to.deep.equal([
        FieldExpression("a.test", [true,false])
      ]);
      expect(parseFilter("(:a.22d)")).to.deep.equal([
        FieldExpression("a.22d", [])
      ]);
    });

    it("should not allow [] in symbol names", () => {
      expect(() => parseFilter("(true,:ast[rst,false)")).to.throw(/expected field expression/i)
      expect(() => parseFilter("(true,:astrs]t,false)")).to.throw(/expected field expression/i)
      expect(() => parseFilter("(true,:ast[rst],false)")).to.throw(/expected field expression/i)
    });
  });

  describe("Number", () => {
    it("should support integers and integer-prefixed decimals", () => {
      expect(parseFilter("(:any,2)")).to.deep.equal([
        FieldExpression("any",[2])
      ]);
      expect(parseFilter("(:any,-2)")).to.deep.equal([
        FieldExpression("any",[-2])
      ]);
      expect(parseFilter("(:any,2.1)")).to.deep.equal([
        FieldExpression("any",[2.1])
      ]);
      expect(parseFilter("(:any,-2.1)")).to.deep.equal([
        FieldExpression("any",[-2.1])
      ]);
    });

    it("should allow literals with no integer part", () => {
      expect(parseFilter("(:any,.99)")).to.deep.equal([
        FieldExpression("any",[.99])
      ]);
      expect(parseFilter("(:any,-.99)")).to.deep.equal([
        FieldExpression("any",[-0.99])
      ]);
    });

    it("should reject trailing decimal point", () => {
      // JS allows these trailing decimals, but fuck that.
      // We can save the grammar space for something better.
      expect(() => parseFilter("(:whatevs,10.)")).to.throw();
      expect(() => parseFilter("(:whatevs,-10.)")).to.throw();
    });

    it('should reject just a decimal point', () => {
      expect(() => parseFilter("(.,:gte,10)")).to.throw();
      expect(() => parseFilter("(-.,:gte,0)")).to.throw();
    })

    it("should allow 0-prefixed integer parts", () => {
      expect(parseFilter("(0.99,:gte,0)")).to.deep.equal([
        FieldExpression("gte",[.99,0])
      ]);

      // JS rejects these, but why??
      expect(parseFilter("(:test,011.99)")).to.deep.equal([
        FieldExpression("test",[11.99])
      ]);
      expect(parseFilter("(001.99,:test,true)")).to.deep.equal([
        FieldExpression("test",[1.99,true])
      ]);
    })
  });

  describe("String", () => {
    it("should support backtick + exclamation point quoted strings", () => {
      expect(parseFilter("(:and,`test`,!test2!)"))
        .to.deep.equal([FieldExpression("and",['test', 'test2'])]);
    });
  })

  describe("Boolean, number, null", () => {
    it("should parse them into their js equivalents", () => {
      expect(parseFilter("(:op,true,false,null)")).to.deep.equal([
        FieldExpression("op",[true, false, null])
      ]);
    });
  });
});
