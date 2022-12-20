import parse from "./parseIon";
import { ConfigPoint } from "./ConfigPoint";

/**
 * Loads the given file name object.  Expected to have a resolved filename object (eg full path).
 * Only works in the context of NodeJS, or other environments containing an fs object used to load things.
 * @param fileName is the fully resolved path name for a JSON5 or ION loadable file.
 * @param fs is the nodejs promises version of the file loader.
 */
export default (fileName, fs) => {
  return fs.readFile(fileName).then((text) => {
    const json = parse(text);
    return ConfigPoint.register(json);
  });
};
