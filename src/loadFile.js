import JSON5 from "json5";
import ConfigPoint from ".";

/**
 * Loads the given file name object.  Expected to have a resolved filename object (eg full path).
 * Only works in the context of NodeJS, or other environments containing an fs object used to load things.
 * @param fileName is the fully resolved path name for a JSON5 loadable file.
 * @param fs is the nodejs promises version of the file loader.
 */
export default (fileName, fs) => {
  return fs.readFile(fileName).then((text) => {
    const json = JSON5.parse(text);
    return ConfigPoint.register(json);
  });
};
