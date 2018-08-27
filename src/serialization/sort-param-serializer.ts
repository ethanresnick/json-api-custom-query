import { SortField } from '../helpers';
import serialize from './serializeFieldExpression';
import { encodeSymbolValue } from './encodeComponentString';

export default function serializeSort(exps: SortField[]) {
  return exps.map(it => {
    return (
      (  it.direction === "DESC" ? '-' : '') +
      ("expression" in it
        ? serialize(it.expression)
        : encodeSymbolValue(it.field))
    );
  }).join(",");
}

