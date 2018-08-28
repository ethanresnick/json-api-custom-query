const { expect } = require("chai");
import jsc = require("jsverify");
import sut from '../../src/serialization/sort-param-serializer';
import parser = require('../../src/parsing/parser');
import { FieldExpression, Identifier, Symbol as SymbolArb } from "./shared-arbitraries";

const legalSortsToSerialization = {
  "fieldA,(ax,:x,x)": true,
  "fieldA,(:ax,[])": true,
  "fieldA,-fieldB": true,
  "nullified": true,
  "truthy": true,
  "fieldA,(x,:y,z)": true,
  "(x,:y,z),fieldA": true,
  "fieldA,-(x,:y,z)": true,
  "-(x,:y,z),fieldA": true,
  "-(a,4)": true,
  "test": true,
  "test,-test,(1,:eq,1),-(1,1)": "test,-test,(1,1),-(1,1)",
  "%C2%A9": true,
  // tests that symbols can be begin with a [-\.0-9] character
  // if it's encoded, even though these can't appear literally
  // as leading chars to prevent ambiguity.
  "%2D": true,
  "%39": true,
  "%2e": "%2E" // encoding should normalize to upper case
};

const SortDirection = jsc.oneof([jsc.constant("ASC"), jsc.constant("DESC")]);
const SortField = jsc.oneof([
  jsc.record({
    direction: SortDirection,
    field: SymbolArb
  }),
  jsc.record({
    direction: SortDirection,
    expression: FieldExpression
  })
]);

const Sort = jsc.nearray(SortField);

describe("Sort Serialization", () => {
  it("should be the inverse of parsing (generated cases)", () => {
    jsc.assert(
      jsc.forall(Sort, (parsed) => {
        const serialized = sut(parsed as any); //normalized
        const reparsed = parser.parse(serialized, { startRule: "Sort" });
        expect(reparsed).to.deep.equal(parsed);
        return true;
      })
    );
  }).timeout(Infinity);

  it("should be the inverse of parsing (manual cases)", () => {
    Object.keys(legalSortsToSerialization).forEach(k => {
      const v = legalSortsToSerialization[k as keyof typeof legalSortsToSerialization];
      const expected = v === true ? k : v;

      expect(sut(parser.parse(k, { startRule: "Sort" }))).to.equal(expected);
    })
  });
});
