import { FieldExpression } from '../helpers';
import serializeFieldExpression from './serializeFieldExpression';

export default function serializeFilter(exps: FieldExpression[]) {
  return exps.map(serializeFieldExpression).join("");
}
