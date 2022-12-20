import * as ion from "ion-js";

const fromContainer = (fields, initial) => {
  return fields.reduce((prev,curr) => {
    const [key,value] = curr;
    const newValue = toJS(value);
    prev[key] = newValue;
    return prev;
  }, initial);
};

const toJS = (v) => {
  const type = v.getType();
  const { name } = type;
  if (type.isNumeric) return v.numberValue();
  switch(name) {
    case 'symbol':
    case 'string':
      return v.stringValue();
    case 'bool':
      return v.booleanValue();
    case 'decimal':
      return v.numberValue();
    case 'struct':
      return fromContainer(v.fields(), {});
    case 'list':
      return fromContainer(Object.entries(v), []);

    case 'null':
      return null;
    case 'undefined':
      return undefined;
    case 'clob':
    case 'blob':
      return v;
    default:
      console.log("unknown type", v, type);
      return v;
  }
}

export default function parse(txt, types={}) {
  const ret = ion.load(txt);
  return toJS(ret);
}