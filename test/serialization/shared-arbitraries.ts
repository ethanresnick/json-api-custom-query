import { Identifier, Atom } from '../../src/parsing/parser';
import jsc = require("jsverify");

// symbols (in identifiers and operators) are basically jsc.nestring because,
// after decoding, any character can show up in a symbol. The exceptions are
// the ones called out in the grammar. E.g., true, false, null and number
// literals can't be symbol names, as those get parsed as keywords or numbers
// respectively. (We could invent some special syntax for representing symbols
// of those names, but that would totally not be worth it.) Likewise, symbols
// can't start with
const NumberRegexp = /^\-?(([0-9]+(\.[0-9]+)?)|\.[0-9]+)/;
const Symbol = jsc.suchthat(jsc.nestring, (str) => {
  return str !== "false" && str !== "true" && str !== "null"
    && str[0] !== "-" && !NumberRegexp.test(str);
});

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
