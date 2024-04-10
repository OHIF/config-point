import { ConfigPoint, mergeCreate, mergeObject } from "./ConfigPoint";
import loadFile from "./loadFile";
import loadSearchConfigPoint from "./loadSearchConfigPoint";
import { ConfigPointOperation, SortOp, ReferenceOp, ReplaceOp, DeleteOp, InsertOp, safeFunction } from "./ConfigPointOperation";
import "./plugins";
import parseIon from "./parseIon";

const register = ConfigPoint.register.bind(ConfigPoint);
const getConfig = ConfigPoint.getConfig.bind(ConfigPoint);
const extendConfiguration = ConfigPoint.extendConfiguration.bind(ConfigPoint);
const createConfiguration = ConfigPoint.createConfiguration.bind(ConfigPoint);
const plugins = getConfig("plugins");

export default ConfigPoint;

// Re-assign to modules global - this should not be needed but webpack screws up when using config-point
globalThis.modules ||= {};
globalThis.modules['config-point'] = ConfigPoint;

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
  parseIon,
  // Used for testing
  mergeCreate,
  mergeObject,
};
