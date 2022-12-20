import must from "must";
import fs from "fs";
import "regenerator-runtime";

import {ConfigPoint, loadFile} from "../src";

const fsPromises = fs.promises;

describe("loadFile", () => {
  it("loads files", async() => {
    const origConfig = ConfigPoint.getConfig("testLoad");
    must(origConfig).be.undefined();
    await loadFile("tests/testLoad.ion", fsPromises);
    const testLoad = ConfigPoint.getConfig("testLoad");
    must(testLoad).not.be.undefined();
  })
})