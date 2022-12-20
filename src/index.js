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
const plugins = ConfigPoint.getConfig("plugins");

export default ConfigPoint;

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
