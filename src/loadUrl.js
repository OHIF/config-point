import parseIon from "./parseIon";
import ConfigPoint from "./ConfigPoint";

/** Loads a specific configuration and adds it to the import. Does no checking to see if this already exists. */
export default (name, url) => {
  const oReq = new XMLHttpRequest();
  const loadPromise = new Promise((resolve, reject) => {
    oReq.addEventListener("load", () => {
      try {
        const json = parseIon(oReq.responseText);

        const itemsRegistered = ConfigPoint.register(json);
        resolve(itemsRegistered);
      } catch (e) {
        console.warn("Unable to load", name, e, oReq.responseText);
        reject(`Unable to load ${name} because ${e}`);
      }
    });
  });
  oReq.open("GET", url);
  oReq.send();
  return loadPromise;
};
