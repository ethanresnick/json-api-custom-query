const { expect } = require("chai");
import sut = require('../src/parser');
import { Identifier, RawFieldExpression } from './helpers';

const parseFilter = (str: string) => sut.parse(str, { startRule: "Filter" });
const parseSort = (str: string) => sut.parse(str, { startRule: "Sort" });

describe('Parser from underlying grammar', () => {
  describe("Filter", () => {
    it("should reject empty field expressions", () => {
      expect(() => parseFilter("()")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(a,b,c)()")).to.throw(/Expected.+field expression/);
      expect(() => parseFilter("(a,b,())")).to.throw(/Expected.+field expression/);
    });

    it("should support only field expressions without any separators at top-level", () => {
      expect(parseFilter("(ab,c)(3,e)")).to.deep.equal([
        RawFieldExpression([Identifier("ab"), Identifier("c")]),
        RawFieldExpression([3, Identifier("e")])
      ]);

      expect(() => parseFilter("(ab,c),(3,e)")).to.throw(/but "," found/);
      expect(() => parseFilter("(ab,c) (3,e)")).to.throw(/but " " found/);
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
      expect(() => parseSort("fieldA,(a,())")).to.throw();
      expect(() => parseSort("fieldA,(ax,x)")).to.not.throw();
      expect(() => parseSort("fieldA,(ax,[])")).to.not.throw();
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
      const expression = {
        type: "RawFieldExpression",
        items: [
          Identifier("x"),
          Identifier("y"),
          Identifier("z")
        ]
      };

      const ascResult = { direction: "ASC", expression };
      const descResult = { direction: "DESC", expression };

      expect(parseSort("fieldA,(x,y,z)")[1]).to.deep.equal(ascResult);
      expect(parseSort("(x,y,z),fieldA")[0]).to.deep.equal(ascResult)
      expect(parseSort("fieldA,-(x,y,z)")[1]).to.deep.equal(descResult);
      expect(parseSort("-(x,y,z),fieldA")[0]).to.deep.equal(descResult);
    });
  });

  describe("Field expression lists", () => {
    it("should reject trailing commas", () => {
      expect(() => parseSort("(a,)")).to.throw();
      expect(() => parseSort("(a,,)")).to.throw();
    });

    it("should reject lists with no content between commas", () => {
      expect(() => parseSort("(a,,b)")).to.throw();
    });
  });

  describe("Symbol", () => {
    it("should properly differentiate symbols from null/bool literals", () => {
      expect(sut.parse("(true,truedat)", { startRule: "Filter" }))
        .to.deep.equal([RawFieldExpression([true, Identifier("truedat")])]);
    });

    it("may not have a quotation mark in it", () => {
      expect(() => parseSort("'test'")).to.throw(/sort fields list but "'"/i);
      expect(() => parseSort("are'te")).to.throw(/end of input but "'"/i);
    })

    // Symbol literals should be totally unambiguous with number literals.
    it("should reject leading period, minus, and number in symbol names", () => {
      expect(() => { parseFilter("(-test)"); }).to.throw();
      expect(() => { parseFilter("(-22d)"); }).to.throw();
      expect(() => { parseFilter("(1d)"); }).to.throw();
      expect(() => { parseFilter("(.test)"); }).to.throw();
      expect(() => { parseFilter("(.22d)"); }).to.throw();
    })

    it("should allow periods, minus signs, and numbers in symbol names", () => {
      expect(parseFilter("(a-test)")).to.deep.equal([
        RawFieldExpression([Identifier("a-test")])
      ]);
      expect(parseFilter("(a-22d)")).to.deep.equal([
        RawFieldExpression([Identifier("a-22d")])
      ]);
      expect(parseFilter("(a1d)")).to.deep.equal([
        RawFieldExpression([Identifier("a1d")])
      ]);
      expect(parseFilter("(a.test)")).to.deep.equal([
        RawFieldExpression([Identifier("a.test")])
      ]);
      expect(parseFilter("(a.22d)")).to.deep.equal([
        RawFieldExpression([Identifier("a.22d")])
      ]);
    });

    it("should not allow [] in symbol names", () => {
      expect(() => parseFilter("(ast[rst)")).to.throw(/expected field expression/i)
      expect(() => parseFilter("(astrs]t)")).to.throw(/expected field expression/i)
      expect(() => parseFilter("(ast[rst])")).to.throw(/expected field expression/i)
    });
  });

  describe("Number", () => {
    it("should support integers and integer-prefixed decimals", () => {
      expect(parseFilter("(2)")).to.deep.equal([
        RawFieldExpression([2])
      ]);
      expect(parseFilter("(-2)")).to.deep.equal([
        RawFieldExpression([-2])
      ]);
      expect(parseFilter("(2.1)")).to.deep.equal([
        RawFieldExpression([2.1])
      ]);
      expect(parseFilter("(-2.1)")).to.deep.equal([
        RawFieldExpression([-2.1])
      ]);
    });

    it("should allow literals with no integer part", () => {
      expect(parseFilter("(.99)")).to.deep.equal([
        RawFieldExpression([.99])
      ]);
      expect(parseFilter("(-.99)")).to.deep.equal([
        RawFieldExpression([-0.99])
      ]);
    });

    it("should reject trailing decimal point", () => {
      // JS allows these trailing decimals, but fuck that.
      // We can save the grammar space for something better.
      expect(() => parseFilter("(10.)")).to.throw();
      expect(() => parseFilter("(-10.)")).to.throw();
    });

    it('should reject just a decimal point', () => {
      expect(() => parseFilter("(.)")).to.throw();
      expect(() => parseFilter("(-.)")).to.throw();
    })

    it("should allow 0-prefixed integer parts", () => {
      expect(parseFilter("(0.99)")).to.deep.equal([
        RawFieldExpression([.99])
      ]);

      // JS rejects these, but why??
      expect(parseFilter("(011.99)")).to.deep.equal([
        RawFieldExpression([11.99])
      ]);
      expect(parseFilter("(001.99)")).to.deep.equal([
        RawFieldExpression([1.99])
      ]);
    })
  });

  describe("String", () => {
    it("should support backtick + single quote strings", () => {
      expect(parseFilter("(`test`,'test2')"))
        .to.deep.equal([RawFieldExpression(['test', 'test2'])]);
    });
  })

  describe("Boolean, number, null", () => {
    it("should parse them into their js equivalents", () => {
      expect(parseFilter("(true,false,null)")).to.deep.equal([
        RawFieldExpression([true, false, null])
      ]);
    });
  });
});
