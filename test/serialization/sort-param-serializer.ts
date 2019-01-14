const { expect } = require("chai");
import jsc = require("jsverify");
import sut from '../../src/serialization/sort-param-serializer';
import parser = require('../../src/parsing/parser');
import { FieldExpression, Symbol as SymbolArb } from "./shared-arbitraries";

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

const legalSortParses = [
  [{
    "direction": "ASC",
    "expression": {
      "type": "FieldExpression",
      "operator": "hi",
      "args": [2.3329630494117737e-7]
    }
  }],
  [{
    "direction": "ASC",
    "expression": {
      "type": "FieldExpression",
      "operator": "hi",
      "args": [179769313486992315799999999999992881938333299999912033]
    }
  }],
  [{
    "direction": "ASC",
    "expression": {
      "type": "FieldExpression",
      "operator": "hi",
      "args": [8e-324]
    }
  }]
];

const SortDirection = jsc.oneof([jsc.constant("ASC"), jsc.constant("DESC")]);
const SortField = jsc.oneof<any>([
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
  it("should be the inverse of parsing (manual cases, starting serialized)", () => {
    Object.keys(legalSortsToSerialization).forEach(k => {
      const v = legalSortsToSerialization[k as keyof typeof legalSortsToSerialization];
      const expected = v === true ? k : v;

      expect(sut(parser.parse(k, { startRule: "Sort" }))).to.equal(expected);
    })
  });

  it("should be the inverse of parsing (manual cases, starting parsed)", () => {
    legalSortParses.forEach(parsed => {
      const serialized = sut(parsed as any); //normalized
      const reparsed = parser.parse(serialized, { startRule: "Sort" });
      expect(reparsed).to.deep.equal(parsed);
    });
  });

  it("should be the inverse of parsing (generated cases)", () => {
    jsc.assert(
      jsc.forall(Sort, (parsed) => {
        const serialized = sut(parsed as any); //normalized
        const reparsed = parser.parse(serialized, { startRule: "Sort" });
        expect(reparsed).to.deep.equal(parsed);
        return true;
      }),
      { tests: 20000, size: 20 }
    );
  }).timeout(Infinity);
});
