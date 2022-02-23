import JSON5 from "json5";
import ConfigPoint from "./ConfigPoint";

/** Loads a specific configuration and adds it to the import. Does no checking to see if this already exists. */
export default (name, url) => {
  const oReq = new XMLHttpRequest();
  const loadPromise = new Promise((resolve, reject) => {
    oReq.addEventListener("load", () => {
      try {
        const json = JSON5.parse(oReq.responseText);

        const itemsRegistered = ConfigPoint.register(json);
        resolve(itemsRegistered);
      } catch (e) {
        console.log(`Unable to load ${name}`);
        reject(`Unable to load ${name} because ${e}`);
      }
    });
  });
  oReq.open("GET", url);
  oReq.send();
  return loadPromise;
};
