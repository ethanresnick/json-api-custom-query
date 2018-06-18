import { SortField } from '../helpers';
import serialize from './serializeFieldExpression';
import encodeComponentString from './encodeComponentString';

export default function serializeSort(exps: SortField[]) {
  return exps.map(it => {
    return (
      (  it.direction === "DESC" ? '-' : '') +
      ("expression" in it
        ? serialize(it.expression)
        : encodeComponentString(it.field))
    );
  }).join(",");
}

