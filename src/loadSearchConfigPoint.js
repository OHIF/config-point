import loadUrl from "./loadUrl";

/**
 * Loads the given value, as specified by the search parameters name path.
 * parameterName is a list of config-point files to load, named  [a-zA-Z0-9]+(\.((js)|(json)))?  Null means load the default
 * The path is the required path prefix (automatically added), and the default name is what to use if nothing is specified.
 * The defaultName parameter is NOT checked for validity, it is assumed to be allowed.
 * @returns a promise that is completed when the load finishes.
 */
export default (defaultName, path, parameterName) => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  let loadNames = defaultName ? [defaultName] : null;
  if (parameterName) {
    const paramValues = urlParams.getAll(parameterName);
    if (paramValues && paramValues.length) {
      paramValues.forEach((item) => {
        if (!item.match(/^[a-zA-Z0-9]+$/)) {
          throw new Error(`Parameter ${parameterName} has invalid value ${item}`);
        }
      });
      loadNames = paramValues;
    }
  }
  if (loadNames) {
    const loadPromises = {};
    loadNames.forEach((name) => {
      if (loadPromises[name]) return;
      const url = ((path && path + "/" + name) || name) + ".json5";
      loadPromises[name] = loadUrl(name, url);
    });
    return Promise.all(Object.values(loadPromises));
  } else {
    return Promise.resolve({});
  }
};
