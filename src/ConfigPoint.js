import assignHidden from "./assignHidden";

/**
 * Contains the model data for the extensibility level points.
 * This is implicitly updated by the add/update configuration values.
 */
let _configPoints = {};
const _rootConfigPoints = {};

/**
 * Indicates if any is a primitive value, eg not an object or function.
 *
 * @param {any} val
 * @returns true if val is primitive
 */
function isPrimitive(val) {
  const tof = typeof val;
  return val === null || val === undefined || tof == "number" || tof == "boolean" || tof == "string" || tof == "bigint";
}

/**
 *
 * @param {string|int} key
 * @returns undefined or the operation looked up
 */
const getOpValue = (sVal) => {
  if (!sVal || !sVal.configOperation || sVal.isHidden) return undefined;
  const { configOperation } = sVal;
  const ret = ConfigPoint.ConfigPointOperation[configOperation];
  if (!ret) {
    console.log("configOperation", configOperation, "specified but not defined - might be lazy defined later");
  }
  return ret;
};

/**
 * Creates an object of the same type as src, but as a new copy so that it can be
 * modified later on.
 * For reference instances, creates a copy of the referenced object.
 * For primitives, returns the primitive.
 * Arrays and objects creates a copy
 * Functions, returns the original function (TBD on how to copy those)
 */
export const mergeCreate = function (sVal, context) {
  if (isPrimitive(sVal)) {
    return sVal;
  }
  const tof = typeof sVal;
  if (tof === "function") {
    // TODO - decide between returning raw original and copied/updated value
    return sVal;
  }
  if (tof === "object") {
    return mergeObject(Array.isArray(sVal) ? [] : {}, sVal, context);
  }
  throw new Error(`The value ${sVal} of type ${tof} isn't a known type for merging.`);
};

/**
 * Gets the position for the given value inside base.
 * Uses sVal.id, sVal.position and sVal.key to determine the key information.
 * If none of those are defined, then uses sVal[id] as a key.
 * If the id isn't found, returns the length of the list
 * If none are defined and bKey is an int, then returns it.
 * If none are defined and bKey is a string, treats it as an id
 * @param {Array} base
 * @param {*} bKey
 * @param {*} sVal
 * @returns
 */
export const arrayPosition = ({ base, bKey, sVal }) => {
  if (!sVal) return bKey;
  if (sVal.position !== undefined) return sVal.position;
  if (!sVal || (sVal.id === undefined && typeof bKey == "number")) return bKey;
  const key = sVal.key || "id";
  const id = sVal.id === undefined ? bKey : sVal.id;
  if (id === undefined) return undefined;
  for (let i = 0; i < base.length; i++) {
    if (base[i] == id || (base[i] && base[i][key] === id)) {
      return i;
    }
  }

  return base.length;
};

export const objectPosition = ({ base, bKey, sVal }) => {
  return (sVal && (sVal.id || sVal.position)) || bKey;
};

const getOpSrc = (base, bKey, create, context) => {
  let { opSrcMap } = base;
  if (!opSrcMap) {
    if (!create) return undefined;
    opSrcMap = {};
    Object.defineProperty(base, "opSrcMap", {
      configurable: true,
      enumerable: false,
      value: opSrcMap,
    });
  }
  let opSrc = opSrcMap[bKey];
  if (opSrc || !create) return opSrc;
  return (opSrcMap[bKey] = mergeCreate(create, context));
};

export const getAlias = (key, opValue, sVal) => (opValue && ((sVal && sVal.alias) || (key[0] == "_" && key.substring(1)))) || key;

/**
 * Merges into base[key] the value from src[key], if any.  This can end up remove
 * base[key], merging into it, replacing it or modifying the value.
 * @param {*} base
 * @param {*} src
 * @param {*} key
 * @param {*} context
 * @returns
 */
export function mergeAssign(baseSrc, src, key, context, bKeySrc) {
  let sVal = src[key];
  let base = baseSrc;
  let bKey = bKeySrc || key;
  if (Array.isArray(base) && !Array.isArray(src)) {
    bKey = arrayPosition({ base, bKey, sVal, context });
  }
  let bVal = base[bKey];
  const opValue = getOpValue(sVal);
  const alias = getAlias(bKey, opValue, sVal);
  let opSrc = getOpSrc(base, alias);

  if (opValue) {
    if (opValue.immediate) {
      return opValue.immediate({ sVal, base, bKey, key, context });
    }

    if (!opSrc) {
      opSrc = getOpSrc(base, alias, sVal, context);
      if (base[alias] && opSrc.replace !== true) mergeAssign(opSrc, base, alias, context, "value");
    }
    Object.defineProperty(base, alias, {
      configurable: true,
      enumerable: true,
      get: () => {
        if (opSrc.computedValue !== undefined) return opSrc.computedValue;
        opSrc.computedValue = opValue.getter({
          base,
          bKey,
          key,
          context,
          opSrc,
        });
        return opSrc.computedValue;
      },
      set: (val) => {
        // Should this merge into computedValue?
        // Not sure what use case this would hit
        opSrc.computedValue = val;
      },
    });
    return undefined;
  }

  if (opSrc) {
    base = opSrc;
    bKey = "value";
    bVal = opSrc.value;
    delete opSrc.computedValue;
  }

  if (Array.isArray(base) && sVal == null) return bVal;

  if (isPrimitive(bVal)) {
    return (base[bKey] = mergeCreate(sVal, context));
  }

  return mergeObject(bVal, sVal, context);
}

/**
 * mergeObject is a deep Object.assign replacement with enhanced merge/update functionality.
 * If the base value (being assigned to) has a property P, and the src value also has P, then
 * base.P isn't replaced with src.P, but is instead merged.
 * As well, if src.P is one of the operations defined above (ReplaceOp, DeleteOp etc), then instead of
 * base.P being assigned from src.P, the src.P operation method "perform" is run instead, which can
 * delete base.P, replace  base.P, insert into a list or remove from a list.
 * TODO - add the SortedListOp to create sorted lists.
 * @param {object|function} base
 * @param {*} src
 * @param {*} context
 * @returns
 */
export function mergeObject(base, src, context) {
  for (const key in src) {
    mergeAssign(base, src, key, context);
  }
  return base;
}

/** Adds a load listener.  Should already have defined such a point, even if empty. */
const addLoadListener = (point, callback) => {
  if (!point._loadListeners) {
    // Not iterable
    Object.defineProperty(point, "_loadListeners", { value: [] });
  }
  if (point._loadListeners.indexOf(callback) == -1) {
    point._loadListeners.push(callback);
  }
  callback(point);
};

const ConfigPointFunctionality = {
  /**
   * Extends the configuration on this config point instance with the data in data by adding data to the lsit
   * of config point extensions, and then applying all the existing extensions to generate the config point.
   * @param {*} data
   * @returns this object.
   */
  extendConfig(data) {
    const name = data.name || "_order" + this._extensions._order.length;
    const toRemove = this._extensions[name];
    if (toRemove) {
      throw new Error(`Level already has extension ${name}`);
    }
    this._extensions[name] = data;
    this._extensions._order.push(data);
    this.applyExtensions();
    return this;
  },

  /**
   * Applies all the extensions onto this config point, by starting with merging the configuration base, then
   * for each item in the extension, merging it into the resulting object.
   * Directly modifies this.
   */
  applyExtensions() {
    if (this._preExistingKeys) {
      for (const key of Object.keys(this)) {
        if (!this._preExistingKeys[key]) delete this[key];
      }
    } else {
      Object.defineProperty(this, "_preExistingKeys", { writable: true, configurable: true, value: {} });
      this._preExistingKeys = Object.keys(this).reduce((keyset, key) => {
        keyset[key] = true;
        return keyset;
      }, this._preExistingKeys);
    }
    delete this.opSrcMap;
    this._applyExtensionsTo(this);
    if (this._loadListeners) {
      this._loadListeners.forEach((listener) => listener(this));
    }
  },

  /** Applies the extensions from this object to the given result.  Allows for applying nested parent extensions,
   * and includes all the parent configuration before apply this set of extensions.
   */
  _applyExtensionsTo(dest) {
    const configBase = this._configBase;
    if (configBase && configBase._applyExtensionsTo) {
      configBase._applyExtensionsTo(dest);
    } else {
      mergeObject(dest, configBase, dest);
    }
    for (const item of this._extensions._order) {
      mergeObject(dest, item, dest);
    }
  },
};

const BaseImplementation = {
  /** Adds a new configuraiton point, must get executed before the level is used.
   * It isn't necessary to provide a default configBase, but doing so enables
   * inheritting from the levelBase to provide other functionality for the given level.
   * The ordering of when addConfig is called to provide configBase doesn't matter much.
   */
  addConfig(configName, configBaseSrc) {
    if (configBaseSrc === configName) throw new Error(`The configuration point ${configName} uses itself as a base`);
    const configBase = typeof configBaseSrc === "string" ? this.addConfig(configBaseSrc) : configBaseSrc;
    let config = _configPoints[configName];
    if (!config) {
      _configPoints[configName] = config = assignHidden({}, ConfigPointFunctionality);
      Object.defineProperty(config, "_configName", { value: configName });
      Object.defineProperty(this, configName, {
        enumerable: true,
        configurable: true,
        get: () => {
          return _configPoints[configName];
        },
      });
      Object.defineProperty(config, "_configBase", { value: undefined, writable: true });
      Object.defineProperty(config, "_extensions", { value: { _order: [] } });
    }
    if (configBase) {
      if (config._configBase != configBase) {
        const configBaseName = configBase._configName;
        config._configBase = configBase;
        if (configBaseName) {
          if (!config._configReload) {
            Object.defineProperty(config, "_configReload", {
              value: () => {
                config.applyExtensions();
              },
            });
          }
          addLoadListener(configBase, config._configReload);
          return config;
        }
      }
      config.applyExtensions();
    }
    return config;
  },

  addLoadListener,

  /** Registers the specified configuration items.
   * The format of config is an array of extension items.
   * Each item has a configName for the top level config to change,
   * and then has configBase to set the base configuration.
   * The base extension, with an extension item or
   * basedOn, to base the extension on another existing configuration.
   * @param {Array|ConfigItem}} config elements to add to the ConfigPoint values.
   */
  register(...config) {
    let ret = {};
    config.forEach((configItem) => {
      if (Array.isArray(configItem)) {
        ret = { ...ret, ...this.register(...configItem) };
        return;
      }

      const { configName } = configItem;
      if (configName) {
        const { configBase, extension } = configItem;
        if (configBase) {
          ret[configName] = this.addConfig(configName, configBase);
        }
        if (extension) {
          ret[configName] = this.addConfig(configName).extendConfig(extension);
        }
      } else {
        Object.keys(configItem).forEach((key) => {
          const extension = configItem[key];
          const { configBase } = extension;
          ret[key] = this.addConfig(key, configBase).extendConfig(extension);
        });
      }
    });
    return ret;
  },

  // Indicate of the given configuration item exists.
  hasConfig(configName) {
    return _configPoints[configName] != undefined;
  },

  // Gets the given configuration name
  getConfig(config) {
    if (typeof config === "string") {
      return _configPoints[config];
    }
    return config;
  },

  // Clear all configuration items, mostly used for test purposes.
  clear() {
    _configPoints = {};
    Object.keys(_rootConfigPoints).forEach((key) => {
      this.register(_rootConfigPoints);
    });
  },

  // Registers a root config point - one that doesn't get cleared otherwise
  registerRoot(root) {
    Object.assign(_rootConfigPoints, root);
    return ConfigPoint.register(root);
  },

  /**
   * Creates a configuration with the given name.
   * @param {string} configName
   * @param {object|string} definition is a config-point definition for the base value of this object
   *    If definition is a string, then parent shall not be provided.
   * @param {string|object} parent? is the name of another config-point or a raw object.
   */
  createConfiguration(configName, definition, parent) {
    if (parent) {
      // Need to generate an intermediate configuration to ensure order of operations
      // so that the intermediate configuration inherits from parent, and applies definition as an
      // extension, before being used as the config base of the final config point.
      const inheritName = `_intermediate_${configName}`;
      ConfigPoint.register({
        configName: inheritName,
        configBase: parent,
        extension: definition,
      });
      return ConfigPoint.register({ configName, configBase: inheritName })[configName];
    } else {
      return ConfigPoint.register({ configName, configBase: definition })[configName];
    }
  },

  extendConfiguration(configName, extension) {
    return ConfigPoint.register({ configName, extension })[configName];
  },
};

// Create a default implementation
export const ConfigPoint = { name: "ConfigPoint", ...BaseImplementation };

export default ConfigPoint;
