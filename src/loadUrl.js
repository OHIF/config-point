import parseIon from "./parseIon";

const setHeaders = (oReq, headers) => {
  if (!headers) return;
  if (typeof headers.forEach === "function" && !Array.isArray(headers)) {
    headers.forEach((value, key) => oReq.setRequestHeader(key, value));
    return;
  }
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  entries.forEach(([key, value]) => oReq.setRequestHeader(key, value));
};

/**
 * Gets the text at url.  Uses fetch when the environment has it, and otherwise XMLHttpRequest,
 * which is what older versions used.  Only the headers of init apply to XMLHttpRequest.
 */
const fetchText = (url, init) => {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(url, init).then((response) => {
      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }
      return response.text();
    });
  }
  return new Promise((resolve, reject) => {
    const oReq = new XMLHttpRequest();
    // Status 0 is what a file: URL gives, and older versions accepted any response.
    oReq.addEventListener("load", () => {
      const { status } = oReq;
      if (status && (status < 200 || status >= 300)) {
        reject(new Error(`${url} returned ${status}`));
        return;
      }
      resolve(oReq.responseText);
    });
    oReq.onerror = () => reject(new Error(`${url} failed to load`));
    oReq.open("GET", url);
    setHeaders(oReq, init && init.headers);
    oReq.send();
  });
};

/**
 * The regular load of one resource: gets the text at url and parses it as ION/JSON5.
 * @param {string} url to load
 * @param {object} [init] fetch options, such as headers
 * @returns a promise of the parsed (not yet registered) config object.
 */
export const defaultLoad = (url, init) => fetchText(url, init).then((text) => parseIon(text));

const toConfigData = (data, url) => {
  // A module namespace, such as the result of a dynamic import, holds the config as its default export.
  const config = data && typeof data === "object" && data.default && typeof data.default === "object" ? data.default : data;
  if (!config || typeof config !== "object") {
    throw new Error(`${url} did not give a config object`);
  }
  return config;
};

/**
 * Loads the data of one resource.  The loadResource hook runs first, when it is given;
 * a result of undefined from the hook means the regular load (defaultLoad).
 * A hook that throws rejects the same way as a failed regular load.
 * @returns a promise of the parsed config object, not yet registered.
 */
export const loadResourceData = ({ kind, name, url, loadResource }) => {
  if (!loadResource) {
    return defaultLoad(url).then((data) => toConfigData(data, url));
  }
  return Promise.resolve()
    .then(() => loadResource({ kind, name, url, defaultLoad }))
    .then((data) => (data === undefined ? defaultLoad(url) : data))
    .then((data) => toConfigData(data, url));
};
