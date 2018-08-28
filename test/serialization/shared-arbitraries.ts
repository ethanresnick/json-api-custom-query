import { Identifier, Atom } from '../../src/parsing/parser';
import jsc = require("jsverify");

// symbols (in identifiers and operators) are just jsc.nestring because,
// after decoding, any character can show up in a symbol.
const Symbol = jsc.nestring;

const Identifier = jsc.record({
  type: jsc.constant("Identifier" as "Identifier"),
  value: Symbol
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
    operator: Symbol,
    args: jsc.array(tie("FieldExpressionEntry"))
  })
}));

export { FieldExpression, Identifier, Symbol };
