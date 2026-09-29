import ConfigPoint from "./ConfigPoint";
import { THEME_NAME, loadThemeData } from "./loadTheme";
import loadIncludedThemes from "./loadIncludedThemes";

/**
 * The names to load, in order and without duplicates.  The parameter may repeat, and each value may be
 * a comma separated list, because a URL often joins a list parameter with commas.
 */
const getLoadNames = (defaultName, parameterName) => {
  const defaultNames = defaultName ? [defaultName] : null;
  if (!parameterName) return defaultNames;
  const queryString = globalThis?.location?.search || "";
  const paramValues = new URLSearchParams(queryString)
    .getAll(parameterName)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  if (!paramValues.length) return defaultNames;
  paramValues.forEach((item) => {
    if (!item.match(THEME_NAME)) {
      throw new Error(`Parameter ${parameterName} has invalid value ${item}`);
    }
  });
  return [...new Set(paramValues)];
};

const toOptions = (defaultName, path, parameterName, extension, options) => {
  if (defaultName && typeof defaultName === "object") {
    const { paths, path: singlePath, ...rest } = defaultName;
    return { ...rest, extension: rest.extension === undefined ? ".ion" : rest.extension, paths: paths !== undefined ? paths : singlePath };
  }
  return { ...options, defaultName, paths: path, parameterName, extension };
};

/**
 * Loads the given value, as specified by the search parameters name path.
 * parameterName is a list of config-point files to load, named  [a-zA-Z0-9]+  Null means load the default.
 * The parameter may repeat, and each value may hold a comma separated list (?theme=a,b); the names load in that order.
 * The path is the required path prefix (automatically added), and the default name is what to use if nothing is specified.
 * The path may also be a list of paths: each name loads from the first path that has it.
 * The defaultName parameter is NOT checked for validity, it is assumed to be allowed.
 *
 * Call it as loadSearchConfigPoint(defaultName, path, parameterName, extension = ".ion", options = {})
 * or as loadSearchConfigPoint({ defaultName, paths, parameterName, extension, ...options }).
 * The options are:
 *   * loadResource, an async hook ({ kind, name, url, defaultLoad }) that returns the data, or undefined for the regular load;
 *   * includeTheme, true to also load the themes that includeTheme lists (see loadIncludedThemes);
 *   * pathPrefix, the prefix of a relative includeTheme URL (default "/").
 * @returns a promise that is completed when the load finishes, with the registered configs of each name in order.
 */
export default (defaultName, path, parameterName, extension = ".ion", options = {}) => {
  const opts = toOptions(defaultName, path, parameterName, extension, options);
  const { paths, loadResource, includeTheme, pathPrefix } = opts;
  const loadNames = getLoadNames(opts.defaultName, opts.parameterName);
  if (!loadNames) {
    return Promise.resolve({});
  }
  const loadOptions = { paths, extension: opts.extension, loadResource };
  // Load in parallel, but register in the listed order so that a later theme always extends an earlier one.
  const loaded = Promise.all(loadNames.map((name) => loadThemeData(name, loadOptions))).then((datas) => datas.map((data) => ConfigPoint.register(data)));
  if (!includeTheme) return loaded;
  return loadIncludedThemes(loaded, { ...loadOptions, pathPrefix });
};
