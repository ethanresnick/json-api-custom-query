const { expect } = require("chai");
import jsc = require("jsverify");
import sut from '../../src/serialization/filter-param-serializer';
import parser = require('../../src/parsing/parser');
import { Identifier, Atom } from '../../src/parsing/parser';

// Below, we have legal strings extracted from the parsing tests.
// If the value's true, means that parsing and then serializing the key gives
// you the exact same string out. We test these by invoking the raw parser,
// NOT the one that does argument validation/transformation, as serialize is
// expected to be called post those transformations/by the client (which won't
// have access to that config).
const legalFilterToSerialization = {
  "(ab,:c,d)(3,:e,d)": true,
  "(:now)": true,
  "(:w,1)": true,
  "(:now,fieldName,[])": "(fieldName,:now,[])",
  "(:now,233,fieldName,(:now,1,2,3),[true])": true,
  "(fieldName,:eq,1)": "(fieldName,1)",
  "(fieldName,1)": true,
  "(1,fieldName)": true,
  "(ab,:c,d)": true,
  "(:ab,c)": true,
  "(true,:truedat,null)": true,
  "(:a-test)": true,
  "(2,:a-22d,3)": true,
  "(:a1d)": true,
  "(:a.test,2,-2,2.1,-2.1)": true,
  "(:test,.99,-.99,0.99,011.99,001.99)": "(:test,0.99,-0.99,0.99,11.99,1.99)",
  "(:a.22d)": true,

  // our serializer only knows about backtick string form atm.
  "(:and,`test`,!test2!)": "(`test`,:and,`test2`)",
  "(:op,true,false,null)": true,
  "(:test,`%22J%26J%22%21%2C%20%27You%20know%20%28it%29%2C%20and%20%2A.`)": true,
  "(a,(:eq,field,2,2))": true,
  "(a,(field,:eq,[]))": "(a,(field,[]))",
  "(:and-list,true)": true,
  "(:or-list,(:and-list,(:or-list,test)))": true,
  "(:and,(:or,(:and,(it,:eq,3))))": "(:and,(:or,(:and,(it,3))))",

  // test that symbols get encoded back properly (e.g., non-ascii chars)
  "(:%C2%A9)": true,
  "(:op,%22J%26J%22%21%2C%20%27You%20know%20%28it%29%2C%20and%20%2A.)": true,
};

// symbols (in identifiers and operators) are just jsc.nestring because,
// after decoding, any character can show up in a symbol.
const Identifier = jsc.record({
  type: jsc.constant("Identifier" as "Identifier"),
  value: jsc.nestring
});

const Atom = jsc.oneof<any>([
  jsc.bool, jsc.string, jsc.number, jsc.constant(null), Identifier
]);

const { FieldExpression } = (jsc as any).letrec((tie: any) => ({
  FieldExpressionEntry: jsc.bless({
    generator: jsc.generator.recursive(
      // we need .small or we'll likely bust the stack.
      jsc.generator.small(jsc.oneof([Atom, tie("FieldExpression")]).generator),
      (gen) => jsc.generator.array(gen)
    )
  }),
  FieldExpression: jsc.record({
    type: jsc.constant("FieldExpression"),
    operator: jsc.nestring,
    args: jsc.array(tie("FieldExpressionEntry"))
  })
}));

const Filter = jsc.nearray(FieldExpression);

describe("Filter Serialization", () => {
  it("should be the inverse of parsing (generated cases)", () => {
    jsc.assert(
      jsc.forall(Filter, (parsed) => {
        const serialized = sut(parsed as any); //normalized
        const reparsed = parser.parse(serialized, { startRule: "Filter" });
        expect(reparsed).to.deep.equal(parsed);
        return true;
      })
    );
  }).timeout(Infinity);

  it("should be the inverse of parsing (manual cases)", () => {
    Object.keys(legalFilterToSerialization).forEach(k => {
      const v = legalFilterToSerialization[k as keyof typeof legalFilterToSerialization];
      const expected = v === true ? k : v;

      expect(sut(parser.parse(k, { startRule: "Filter" }))).to.equal(expected);
    })
  });
});
