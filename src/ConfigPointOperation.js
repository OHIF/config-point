import ConfigPoint from "./ConfigPoint";
import { mergeCreate, arrayPosition, objectPosition } from "./ConfigPoint";

/**
 * Contains the model data for the extensibility level points.
 * This is implicitly updated by the add/update configuration values.
 */
let _configPoints = {};

const configOperation = (configOperation, props) => ({
  _configOperation: configOperation,
  create(props) {
    return { ...props, configOperation: this._configOperation };
  },
  at(position, value, props) {
    return this.create({ ...props, position, value });
  },
  id(id, value, props) {
    return this.create({ ...props, id, value });
  },
  ...props,
});

// Indicates that this is the default configuration operation
const InsertOp = configOperation("insert", {
  immediate(props) {
    const { sVal, base, bKey, context } = props;
    const position = arrayPosition(props);
    base.splice(position || 0, 0, mergeCreate(sVal.value, context));
    return base;
  },
});

// Indicates that this is a delete or remove operation
const DeleteOp = configOperation("delete", {
  immediate(props) {
    const { base, bKey, sVal } = props;
    if (Array.isArray(base)) {
      const position = arrayPosition(props);
      if (position >= 0) return base.splice(position, 1);
    } else if (base) {
      const position = objectPosition(props);
      if (position === undefined) return undefined;
      delete base[position];
    }
    return base;
  },
});

/**
 * Reference to other values operation.
 * createCurrent creates an object the references the current ConfigPoint value, with the form:
 *    configOperation: 'reference',
 *    reference: 'nameOfReference'
 *    source?: where the object is coming from, 'ConfigPoint' means it is an external config point object
 * By default the reference value refers to an item in the current "context", which is usually a base value of the current
 * configuration item being created.  It is
 * Warning: There is no ordering to the reference within a given set of object creates.  That means you cannot
 * necessarily reference something created in the configuration object, only pre-existing objects should be
 * referenced.
 * For ConfigPoint references, a value will be created if one does not exist.
 */
export const ReferenceOp = configOperation("reference", {
  createCurrent(reference, props) {
    return this.create({ reference, ...props });
  },
  getter({ context, opSrc }) {
    const { reference, transform, source } = opSrc;
    const useContext = source ? ConfigPoint.addConfig(source) : context;
    if (source && !reference) return useContext;
    if (!useContext) return undefined;
    const ret = useContext[reference];
    return transform ? transform(ret) : ret;
  },
});

export const BindOp = configOperation("bind", {
  createCurrent(reference, props) {
    return this.create({ reference, ...props });
  },
  getter({ base, context, opSrc }) {
    const { reference, source, value } = opSrc;
    const useContext = source ? ConfigPoint.addConfig(source) : context;
    if (!useContext && value === undefined) return undefined;
    const ret = value === undefined ? useContext[reference] : value;
    return typeof ret === "function" ? ret.bind(base) : ret;
  },
});

/**
 * Indicates that this is a reference operation.
 */
export const ReplaceOp = configOperation("replace", {
  immediate(props) {
    const { sVal, context, base } = props;
    if (Array.isArray(base)) {
      const position = arrayPosition(props);
      if (position !== undefined) return base.splice(position, 1, mergeCreate(sVal.value, context));
    } else {
      return (base[objectPosition(props)] = mergeCreate(sVal.value, context));
    }
    return undefined;
  },
});

/**
 * Indicates that this is a sort operation operation.
 * A sort operation takes the parameters:
 *    valueReference - the attribute name to extract as the value, if not provided, defaults to the entire object
 *    sortKey - the attribute name to sort on.  If not provided, defaults to the value object
 *    reference - the attribute that this instance copies for the source material
 * The sorting is performed on the referenced value, which can be a list or an object.  If an object, then all values
 * from the object are considered to be part of the initial sort order.
 */
const SortOp = configOperation("sort", {
  createSort(reference, sortKey, valueReference, props) {
    return this.create({ ...props, reference, sortKey, valueReference });
  },
  getter({ base, bKey, context, opSrc }) {
    if (opSrc.original == undefined) opSrc.original = [];
    const { original, valueReference, sortKey, reference, value } = opSrc;
    const referenceValue = reference ? context[reference] : value;
    original.length = 0;

    const compare = (a, b) => {
      const valueA = valueReference ? a[valueReference] : a;
      const valueB = valueReference ? b[valueReference] : b;
      const sortA = sortKey ? a[sortKey] : valueA;
      const sortB = sortKey ? b[sortKey] : valueB;
      if (sortA === sortB) return 0;
      return sortA < sortB ? -1 : 1;
    };
    if (!referenceValue) return original;
    let result = Object.values(referenceValue).filter((item) => item !== null && item !== undefined && (!valueReference || item[valueReference] !== undefined));
    if (sortKey) {
      result = result.filter((value) => value[sortKey] !== null);
    }
    result.sort(compare);
    result = result.map((item) => (valueReference ? item[valueReference] : item));
    original.splice(0, original.length, ...result);
    return original;
  },
});

export const SafeOp = configOperation("safe", {
  createCurrent(reference, props) {
    return this.create({ reference, ...props });
  },
  getter({ base, context, opSrc }) {
    const { reference, source, value } = opSrc;
    const useContext = source ? ConfigPoint.addConfig(source) : context;
    if (!useContext && value === undefined) return undefined;
    const ret = value === undefined ? useContext[reference] : value;
    return safeFunction(ret);
  },
});

const { ConfigPointOperation } = ConfigPoint.registerRoot({
  ConfigPointOperation: {
    configBase: {
      sort: SortOp,
      insert: InsertOp,
      delete: DeleteOp,
      safe: SafeOp,
      bind: BindOp,
      reference: ReferenceOp,
      replace: ReplaceOp,
      functions: {
        safeFunction,
      },
    },
  },
});

const regUnquoted = /(?:[a-z$_][a-z0-9$_]*(\.[a-z0-9$_]*)*)|(?:[;\\])|(?:`[^`]*`)|(?:"[^"]*")|(?:'[^']*')/gi;
const regBackquote = /(?:\$\{[^}]*\})/g;

const safeBackquote = (textExpression) => textExpression.replace(regBackquote, (val) => "${" + safeUnquoted(val.substring(2, val.length - 1)) + "}");

const safeUnquoted = (textExpression) =>
  textExpression.replace(regUnquoted, (val) => {
    // console.log('Match', val0);
    if (val.indexOf("Math.") === 0) return val;
    if (val[0] === '"' || val[0] === "'") return val;
    if (val[0] === "`") return safeBackquote(val);
    return "this." + val;
  });

/**
 * A function that is designed to be reasonably safe to execute when provided from theme configurations.
 * In the expression, references are transformed into references to the single parameter value, for example,
 * if `a` is the text expression, and the parameters is param={a:3} then the function will evaluate to param.a,
 * and will return 3.  Additionally, Math.X expressions are permitted, as are quotes and back quoted strings.
 * @param {*} textExpression
 * @returns
 */
function safeFunction(textExpression) {
  // console.log('safeFunction', textExpression);
  if (!textExpression) return () => undefined;
  const safeExpr = safeUnquoted(textExpression);
  let fn = Function(`"use strict"; var $data = this;return (${safeExpr})`);
  return (contextData) => fn.bind(contextData)();
}

export { ConfigPointOperation, SortOp, DeleteOp, InsertOp, safeFunction };
export default ConfigPointOperation;
