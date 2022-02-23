import ConfigPoint, { importPlugin } from "../dist/index.js";
import must from "must";

describe("plugins", () => {
  it("dynamic load", () => {
    ConfigPoint.register({
      plugins: {
        testLoad: "../plugin/testLoad.js",
      },
    });
    must(ConfigPoint.getConfig("testLoad")).be.undefined();
    return importPlugin("testLoad");
  });
});
