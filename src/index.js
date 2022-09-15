import { ConfigPoint } from "./ConfigPoint";
import loadFile from "./loadFile";
import loadSearchConfigPoint from "./loadSearchConfigPoint";
import { ConfigPointOperation, SortOp, ReferenceOp, ReplaceOp, DeleteOp, InsertOp, safeFunction } from "./ConfigPointOperation";
import "./plugins";

const register = ConfigPoint.register.bind(ConfigPoint);
const getConfig = ConfigPoint.getConfig.bind(ConfigPoint);
const extendConfiguration = ConfigPoint.extendConfiguration.bind(ConfigPoint);
const createConfiguration = ConfigPoint.createConfiguration.bind(ConfigPoint);
const plugins = ConfigPoint.getConfig("plugins");

export default ConfigPoint;

ConfigPoint.loadSearchConfigPoint = loadSearchConfigPoint;

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
  loadSearchConfigPoint,
  loadFile,
};
