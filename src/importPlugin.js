import { ConfigPoint, plugins } from ".";

const defaultImporter = (name) => import(name);

function importPlugin(name, importer = defaultImporter) {
  const loadedPlugin = ConfigPoint.getConfig(name);
  if (loadedPlugin) return Promise.resolve(loadedPlugin);
  const pluginImport = plugins[name];
  if (!pluginImport) throw new Error(`Unknown plugin ${name} from plugins ${Object.keys(plugins)}`);
  return importer(pluginImport);
}

export default importPlugin;
