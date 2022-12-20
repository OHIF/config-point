/* eslint-disable jest/expect-expect */
import must from "must";
import "regenerator-runtime";

import { parseIon } from "../src";

describe("parseIon", () => {
  it("parsesJSON", () => {
    const orig = { str: "ex", int: 5, float: 3.2, bool: true, arr: [1, 2, 3], nullV: null };
    const str = JSON.stringify(orig, null, 2);
    const obj = parseIon(str);
    must(obj).eql(orig);
  });

  it("parseION", () => {
    const str = "{ binary: {{ \"stringBinary\" }}, }";
    const obj = parseIon(str);
    must(obj.binary).instanceOf(Uint8Array);
  });
});
