import { iteratee } from "lodash";
import ConfigPoint from "../src/index.js";
import must from "must";

describe("config-point", () => {
  it("has register", () => {
    const { testRegister } = ConfigPoint.register({
      testRegister: { simpleValue: 5 },
    });
    must(testRegister.simpleValue).eql(5);
  });
});
