import ConfigPoint from "../dist/index.js";
import must from "must";

describe("plugins", () => {
  it("dynamic load", () => {
    const {plugins} = ConfigPoint.register({
      plugins: {
        testLoad: "../plugin/testLoad.js",
      },
    });
    must(ConfigPoint.getConfig("testLoad")).be.undefined();
    return import(plugins["testLoad"]);
  });
});
