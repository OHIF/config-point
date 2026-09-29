import ConfigPoint from "./ConfigPoint";
import { loadResourceData } from "./loadUrl";
import { THEME_NAME, loadThemeData } from "./loadTheme";

const resolveUrl = (path, pathPrefix) => {
  if (typeof path !== "string") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const prefix = pathPrefix.endsWith("/") ? pathPrefix : pathPrefix + "/";
  return path.startsWith("/") ? path : prefix + path;
};

const getIncludeTheme = (config) => {
  if (!config || typeof config !== "object") return null;
  const { includeTheme } = config;
  if (!includeTheme || typeof includeTheme !== "object") return null;
  return includeTheme;
};

/**
 * Loads, and registers, every theme that the includeTheme config point of the loaded configs lists,
 * and then the themes that those themes include, until no new theme remains.
 *
 * includeTheme maps a name to a value:
 *   * a theme name ([a-zA-Z0-9]+) loads from the first of paths that has it, as loadSearchConfigPoint does;
 *   * any other value is a URL: absolute (http:// or https://), root relative (/...), or relative to pathPrefix.
 * Each theme or URL loads once only, which also stops a circular include.
 * The themes that one config includes load in parallel, and each one registers when it arrives.
 *
 * @param {Promise|object|object[]} loaded the result of loadSearchConfigPoint, or registered configs
 * @param {object} [options] paths, extension (default ".ion"), pathPrefix (default "/") and loadResource
 * @returns a promise of the loaded value, after all the included themes are registered.
 */
export default (loaded, { paths, extension = ".ion", pathPrefix = "/", loadResource } = {}) => {
  const loadedKeys = new Set();

  const loadInclude = ({ name, value }) => {
    const load = THEME_NAME.test(value)
      ? loadThemeData(value, { paths, extension, loadResource })
      : loadResourceData({ kind: "theme", name, url: resolveUrl(value, pathPrefix), loadResource });
    return load
      .then((json) => ConfigPoint.register(json))
      .catch((e) => {
        console.warn("Unable to load theme", name, e);
        throw new Error(`Unable to load ${name} because ${e && e.message ? e.message : e}`);
      });
  };

  const loadFromConfig = async (config) => {
    const includeTheme = getIncludeTheme(config);
    if (!includeTheme) return;

    const toLoad = [];
    for (const [name, value] of Object.entries(includeTheme)) {
      if (typeof value !== "string") continue;
      const key = THEME_NAME.test(value) ? `theme:${value}` : `url:${resolveUrl(value, pathPrefix)}`;
      if (!loadedKeys.has(key)) {
        loadedKeys.add(key);
        toLoad.push({ name, value });
      }
    }

    const results = await Promise.all(toLoad.map(loadInclude));
    for (const result of results) {
      if (result && typeof result === "object") {
        await loadFromConfig(result);
      }
    }
  };

  return Promise.resolve(loaded).then(async (results) => {
    const configs = Array.isArray(results) ? results : [results];
    for (const config of configs) {
      if (config && typeof config === "object") {
        await loadFromConfig(config);
      }
    }
    return results;
  });
};
