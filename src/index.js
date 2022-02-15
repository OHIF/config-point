import { ConfigPoint } from './ConfigPoint';
import { ConfigPointOperation, SortOp, ReferenceOp, ReplaceOp, DeleteOp, InsertOp, safeFunction } from './ConfigPointOperation';
export default ConfigPoint;
const register = ConfigPoint.register.bind(ConfigPoint);

export {
  ConfigPoint, ConfigPointOperation, ReplaceOp, SortOp, ReferenceOp, DeleteOp, InsertOp, safeFunction,
  register,
};
