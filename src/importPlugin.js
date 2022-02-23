import ConfigPoint from "./ConfigPoint";
import plugins from "./plugins";

const defaultImporter = (name) => import(name);

function importPlugin(name, importer = defaultImporter) {
  const loadedPlugin = ConfigPoint.getConfig(name);
  if (loadedPlugin) return Promise.resolve(loadedPlugin);
  const pluginImport = plugins[name];
  if (!pluginImport) throw new Error(`Unknown plugin ${name}`);
  return importer(pluginImport);
}

export default importPlugin;
