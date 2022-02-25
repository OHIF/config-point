/** Assigns hidden values from src to dest */
export default (dest, src) => {
  if (!src) return dest;
  for (const key of Object.keys(src)) {
    Object.defineProperty(dest, key, {
      value: src[key],
      enumerable: false,
    });
  }
  return dest;
};
