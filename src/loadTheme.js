import { loadResourceData } from "./loadUrl";

/** A theme name from a URL parameter or an includeTheme value must match this, so that it cannot leave its path. */
export const THEME_NAME = /^[a-zA-Z0-9]+$/;

/** The theme paths to try, in order.  A single path (or none) gives a list of one. */
export const toPathList = (path) => {
  if (Array.isArray(path)) {
    const paths = path.filter((item) => typeof item === "string");
    return paths.length ? paths : [undefined];
  }
  return [path];
};

export const themeUrl = (path, name, extension) => ((path && path + "/" + name) || name) + extension;

/**
 * Loads the data of the theme name from the first path of paths that has it.
 * A non-OK response, a fetch error, a parse error or a hook that throws moves to the next path.
 * @returns a promise of the parsed (not yet registered) config object.
 */
export const loadThemeData = async (name, { paths, extension = ".ion", loadResource } = {}) => {
  const failures = [];
  for (const path of toPathList(paths)) {
    const url = themeUrl(path, name, extension);
    try {
      return await loadResourceData({ kind: "theme", name, url, loadResource });
    } catch (e) {
      failures.push(`${url} (${e && e.message ? e.message : e})`);
    }
  }
  const error = new Error(`Unable to load ${name} from ${failures.join(", ")}`);
  console.warn(error.message);
  throw error;
};
