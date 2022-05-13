import { ConfigPoint } from "./ConfigPoint";
import loadUrl from "./loadUrl";
import loadFile from "./loadFile";
import loadSearchConfigPoint from "./loadSearchConfigPoint";
import { ConfigPointOperation, SortOp, ReferenceOp, ReplaceOp, DeleteOp, InsertOp, safeFunction } from "./ConfigPointOperation";
import plugins from "./plugins";
import importPlugin from "./importPlugin";

export default ConfigPoint;
const register = ConfigPoint.register.bind(ConfigPoint);
const getConfig = ConfigPoint.getConfig.bind(ConfigPoint);
const extendConfiguration = ConfigPoint.extendConfiguration.bind(ConfigPoint);
const createConfiguration = ConfigPoint.createConfiguration.bind(ConfigPoint);

export {
  ConfigPoint,
  ConfigPointOperation,
  extendConfiguration,
  createConfiguration,
  ReplaceOp,
  SortOp,
  ReferenceOp,
  DeleteOp,
  InsertOp,
  safeFunction,
  register,
  getConfig,
  plugins,
  importPlugin,
  loadUrl,
  loadSearchConfigPoint,
  loadFile,
};
