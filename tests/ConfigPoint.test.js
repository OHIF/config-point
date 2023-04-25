import {
  ConfigPoint,
  ConfigPointOperation,
  DeleteOp,
  ReplaceOp,
  ReferenceOp,
  SortOp,
  InsertOp,
  safeFunction,
  loadSearchConfigPoint,
  mergeCreate, mergeObject,
} from "../dist/config-point";
// Import for testing internals
import "regenerator-runtime";
import must from "must";

describe("ConfigPoint.js", () => {
  const CONFIG_NAME = "testConfigPoint";
  const BASE_CONFIG = {
    a: "1",
    list: [1, 2, 3],
    obj: { v1: "v1", v2: "v2" },
    obj2: { v1: "v1", v2: "v2" },
    sumFunc: (a, b) => a + b,
  };

  const MODIFY_NAME = "modify";
  const MODIFY_CONFIG = {
    name: MODIFY_NAME,
    a: "2",
    // Default operation is to merge/replace item by item
    list: ["one", "two", "three", "four"],
    // Default object behaviour is update
    obj: { v2: "v2New", v3: "v3" },
    // Over-ride operation to replace entire item
    obj2: { v2: "v2New", v3: "v3", ...ConfigPoint.REPLACE },
    // Default function behaviour is replace, which in this case means add new.
    subFunc: (a, b) => a - b,
  };

  const MODIFY_MATCH = {
    a: "2",
    // list: [1.5,'two',3],
    // Default object behaviour is update
    // obj: { v1: 'v1', v2: 'v2New', v3: 'v3' },
    // Over-ride operation to replace entire item
    // obj2: { v2: 'v2New', v3: 'v3' },
    // Default function behaviour is replace, which in this case means add new.
    subFunc: MODIFY_CONFIG.subFunc,
  };

  beforeEach(() => {
    ConfigPoint.clear();
    jest.clearAllMocks();
  });

  describe("loadSearchConfigPoint()", () => {
    it("loads theme and notifies", async () => {
      let onopen;
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        addEventListener: (name, func) => {
          onopen = func;
        },
        readyState: 4,
        status: 200,
        responseText: "{ newConfigPoint: { val: 5 }, // Comment \n}",
      };

      jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => xhrMock);
      const callback = jest.fn();

      const { newConfigPoint } = ConfigPoint.register({
        newConfigPoint: {
          val: 1,
        },
      });
      let listenVal = 0;
      const func = (conf) => {
        listenVal += conf.val;
      };
      ConfigPoint.addLoadListener(newConfigPoint, func);
      ConfigPoint.addLoadListener(newConfigPoint, func);
      // One call for each listen
      expect(listenVal).toBe(2);
      listenVal = 0;

      const loadPromise = loadSearchConfigPoint("theme");
      onopen();
      await loadPromise;
      // And only one call here, because the add load only gets added once.
      expect(listenVal).toBe(5);
    });

    it("loads theme", async () => {
      let onopen;
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        addEventListener: (name, func) => {
          onopen = func;
        },
        readyState: 4,
        status: 200,
        responseText: "{ newConfigPoint: { val: 5 }, // Comment \n}",
      };

      jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => xhrMock);
      const callback = jest.fn();

      const loadPromise = loadSearchConfigPoint("theme");
      expect(xhrMock.open).toBeCalledWith("GET", "theme.ion");
      onopen();

      await loadPromise;
      expect(ConfigPoint.newConfigPoint.val).toBe(5);
    });

    /**
     * Ensure that if A has a value inheritted by B, and A is changed after B is read, that B gets the new value.
     */
    it("extends theme not referenced", () => {
      const { A, B } = ConfigPoint.register({
        A: { value: "aValue1" },
        B: { configBase: 'A' },
      });
      A.value.must.eql("aValue1");
      B.value.must.eql("aValue1");
      ConfigPoint.register({
        A: { value: "aValue2" },
      });
      B.value.must.eql("aValue2");
    })

    it("loads argument themes", async () => {
      let onopen;
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        addEventListener: (name, func) => {
          onopen = func;
        },
        readyState: 4,
        status: 200,
        responseText: "{ newConfigPoint: { val: 5 }, // Comment \n}",
      };

      jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => xhrMock);
      const callback = jest.fn();
      const loadPromise = loadSearchConfigPoint("theme", "/theme", "theme");
      expect(xhrMock.open).toBeCalledWith("GET", "/theme/altTheme.ion");
      onopen();

      await loadPromise;
      expect(ConfigPoint.getConfig("newConfigPoint").val).toBe(5);
    });
  });

  describe("safeFunction()", () => {
    it("evaluates backquote expressions", () => {
      const fn = safeFunction('`a+b=${a+b}`');
      expect(fn({ a: 1, b: 2 })).toBe("a+b=3");
    });

    it("evaluates local variables in an expr", () => {
      const fn = safeFunction('a==="eh" || Math.abs(b)>=3');
      expect(fn({ a: null, b: 1 })).toBe(false);
      expect(fn({ a: "eh" })).toBe(true);
      expect(fn({ a: null, b: -25 })).toBe(true);
    });
    it("throws on window refs", () => {
      const fn = safeFunction('window.alert("Hello")');
      expect(() => fn({ a: null, b: 1 })).toThrow();
    });

    it("acts as inline transform", () => {
      const { inlineSafeFunction } = ConfigPoint.register({
        inlineSafeFunction: {
          configBase: {
            func: { configOperation: "safe", value: "1+2" },
            funcRedef: { configOperation: "safe", value: "1+2" },
            funcLater: 'num+3',
          },
          funcRedef: 'num+3',
          funcLater: { configOperation: "safe" },
        }
      });
      const args = { num: 1 };
      must(inlineSafeFunction.func).be.function();
      must(inlineSafeFunction.func(args)).eql(3);
      must(inlineSafeFunction.funcRedef(args)).eql(4);
      must(inlineSafeFunction.funcLater(args)).eql(4);
    });

    it("provided value replaces base value", () => {
      const { inlineSafeFunction } = ConfigPoint.register({
        inlineSafeFunction: {
          configBase: {
            func: { description: "this is not a function" },
          },
          func: { configOperation: "safe", replace: true, value: "1+2" },
        }
      });
      const args = { num: 1 };
      must(inlineSafeFunction.func).be.function();
      must(inlineSafeFunction.func(args)).eql(3);
      ConfigPoint.extendConfiguration("inlineSafeFunction", {
        func: "2+3",
      });
      must(inlineSafeFunction.func(args)).eql(5);
    });

    it("works as a reference transform", () => {
      const { cp1, cp2 } = ConfigPoint.register([
        {
          cp1: {
            configBase: {
              func: {
                configOperation: "reference",
                reference: "funcText",
                transform: safeFunction,
              },
              funcText: "a+1",
            },
            funcText: "a-1",
          },
          cp2: {
            configBase: {
              func: {
                configOperation: "reference",
                reference: "funcText",
                transform: safeFunction,
              },
              funcText: "a+1",
            },
          },
        },
        {
          cp2: {
            funcText: "a-1",
          },
        },
      ]);
      expect(cp1.func({ a: 0 })).toBe(-1);
      expect(cp2.func({ a: 0 })).toBe(-1);
    });

    it("works as a named transform", () => {
      const { cp1, cp2 } = ConfigPoint.register([
        {
          cp1: {
            configBase: {
              func: { configOperation: "safe", reference: "funcText" },
              funcText: "a+1",
            },
            funcText: "a-1",
          },
          cp2: {
            configBase: {
              func: ConfigPointOperation.safe.createCurrent("funcText"),
              funcText: "a+1",
            },
          },
        },
        {
          cp2: {
            funcText: "a-1",
          },
        },
      ]);
      expect(cp1.func({ a: 0 })).toBe(-1);
      expect(cp2.func({ a: 0 })).toBe(-1);
      // Check that it is idempotent
      expect(cp2.func === cp2.func).toBe(true);
    });
  });

  describe("mergeCreate()", () => {
    it("creates primitives", () => {
      const aNumber = mergeCreate(123);
      expect(aNumber).toBe(123);
      const aString = mergeCreate("str");
      expect(aString).toBe("str");
      const aBool = mergeCreate(false);
      expect(aBool).toBe(false);
      const aNull = mergeCreate(null);
      expect(aNull).toBe(null);
    });

    it("Copies functions", () => {
      const sumFunc = (a, b) => a + b;
      sumFunc.value = 5;
      sumFunc.obj = { nested: true };
      const copyFunc = mergeCreate(sumFunc);
      expect(typeof copyFunc).toBe("function");
      expect(copyFunc.obj).toEqual(sumFunc.obj);
      expect(copyFunc.value).toEqual(sumFunc.value);
    });

    it("Copies arrays", () => {
      const arr = [1, 2, 3];
      const created = mergeCreate(arr);
      expect(created).toEqual(arr);
    });

    it("copies objects", () => {
      const aCopy = mergeCreate(BASE_CONFIG);
      expect(aCopy.a).toBe("1");
      expect(aCopy.list).toEqual([1, 2, 3]);
      expect(aCopy.sumFunc(5, 6)).toBe(11);
    });
  });

  describe("addConfig()", () => {
    it("Adds an extension level", () => {
      const config = ConfigPoint.addConfig(CONFIG_NAME, BASE_CONFIG);
      expect(config).toMatchObject(BASE_CONFIG);
    });
  });

  describe("extendConfig()", () => {
    it("updates the config data", () => {
      const level = ConfigPoint.addConfig(CONFIG_NAME, BASE_CONFIG);
      level.extendConfig(MODIFY_CONFIG);
      expect(level).toMatchObject(MODIFY_MATCH);
    });
  });

  describe("hasConfig()", () => {
    ConfigPoint.register({
      configName: CONFIG_NAME,
      configBase: BASE_CONFIG,
    });
    expect(ConfigPoint.hasConfig(CONFIG_NAME)).toBe(true);
    expect(ConfigPoint.hasConfig("notFound")).toBe(false);
  });

  describe("register()", () => {
    it("registers named child items", () => {
      const { configOne, configTwo } = ConfigPoint.register({
        configOne: {
          a: 5,
          b: [1, 2, 3],
        },

        configTwo: {
          configBase: "configOne",
          a: 3,
          b: [null, 5],
        },
      });
      expect(configOne.a).toBe(5);
      expect(configTwo.a).toBe(3);
      expect(configTwo.b[1]).toBe(5);
      expect(configTwo.b[2]).toBe(3);
    });

    it("creates a base configuration", () => {
      const { testConfigPoint } = ConfigPoint.register({
        configName: CONFIG_NAME,
        configBase: BASE_CONFIG,
      });
      expect(testConfigPoint).toMatchObject(BASE_CONFIG);
    });

    it("creates and updates", () => {
      const { testConfigPoint } = ConfigPoint.register({
        configName: CONFIG_NAME,
        configBase: BASE_CONFIG,
        extension: MODIFY_CONFIG,
      });
      expect(testConfigPoint).toMatchObject(MODIFY_MATCH);
    });

    it("references context value", () => {
      const multiplyFunc = (a, b) => a * b;
      const registered = ConfigPoint.register([
        {
          configName: CONFIG_NAME,
          configBase: {
            multiplyFunc,
            multiply: {
              configOperation: "reference",
              reference: "multiplyFunc",
            },
          },
          extension: MODIFY_CONFIG,
        },
      ]);
      const { testConfigPoint } = registered;
      expect(testConfigPoint.multiply).toBe(multiplyFunc);
    });

    it("references ConfigPoint", () => {
      const { one, two } = ConfigPoint.register({
        one: {
          refTwo: { configOperation: "reference", source: "two" },
        },
        two: {
          refOne: { configOperation: "reference", source: "one" },
        },
      });
      expect(one.refTwo).toBe(two);
      expect(two.refOne).toBe(one);
    });

    it("references ConfigPoint source value", () => {
      const { one, two } = ConfigPoint.register([
        {
          one: {
            a: 3,
          },
        },
        {
          two: {
            refA: {
              configOperation: "reference",
              source: "one",
              reference: "a",
            },
          },
        },
      ]);
      expect(two.refA).toBe(one.a);
    });

    it("extends first, then creates base", () => {
      const { testConfigPoint } = ConfigPoint.register(
        {
          configName: CONFIG_NAME,
          extension: MODIFY_CONFIG,
        },
        {
          configName: CONFIG_NAME,
          configBase: BASE_CONFIG,
        }
      );
      expect(testConfigPoint).toMatchObject(MODIFY_MATCH);
    });

    it("extends named base", () => {
      const { testConfigPoint2 } = ConfigPoint.register(
        {
          configName: CONFIG_NAME,
          configBase: BASE_CONFIG,
          extension: MODIFY_CONFIG,
        },
        {
          configName: CONFIG_NAME + "2",
          configBase: CONFIG_NAME,
        }
      );
      expect(testConfigPoint2).toMatchObject(MODIFY_MATCH);
    });

    it("Throws on extend of same instance", () => {
      expect(() => {
        ConfigPoint.register({
          configName: CONFIG_NAME,
          configBase: CONFIG_NAME,
        });
      }).toThrow();
    });

    it("Throws on extend twice", () => {
      expect(() =>
        ConfigPoint.register(
          {
            configName: CONFIG_NAME,
            extension: { name: "name" },
          },
          {
            configName: CONFIG_NAME,
            extension: { name: "name" },
          }
        )
      ).toThrow();
    });
  });

  describe("configOperation()", () => {
    it("DeleteOp", () => {
      const { testConfigPoint } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            toBeDeleted: true,
            list: [0, 1, 2, 3],
            list2: [
              { id: "item", value: "item" },
              { id: "item2", value: "item2" },
            ],
          },

          toBeDeleted: DeleteOp.create(1),
          list: [DeleteOp.at(1), DeleteOp.id(0)],
          list2: [DeleteOp.at(1), DeleteOp.id("item")],
        },
      });
      expect(testConfigPoint.toBeDeleted).toBe(undefined);
      expect(testConfigPoint.list).toMatchObject([2, 3]);
      expect(testConfigPoint.list2).toMatchObject([]);
    });

    it("ReplaceOp-onList", () => {
      const { testConfigPoint } = ConfigPoint.register({
        configName: CONFIG_NAME,
        configBase: {
          list: [0, 1, 2, 3],
        },
        extension: {
          list: [
            ReplaceOp.at(1, 4),
            { configOperation: "replace", id: 2, value: 5 },
          ],
        },
      });
      expect(testConfigPoint.list).toMatchObject([0, 4, 5, 3]);
    });

    it("ReplaceOp-onObject", () => {
      const { testConfigPoint } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            obj: { a: 3 },
            list: [1, 2],
          },
          obj: { configOperation: "replace", value: { b: 4 } },
          list: { configOperation: "replace", value: [] },
        },
      });

      expect(testConfigPoint.obj).toMatchObject({ b: 4 });
      expect(testConfigPoint.obj.a).toBe(undefined);
      expect(testConfigPoint.list.length).toBe(0);
    });

    it("ReferenceOp", () => {
      const nonReference = { reference: "preExistingItem" };
      const { testConfigPoint } = ConfigPoint.register({
        configName: CONFIG_NAME,
        configBase: {
          preExistingItem: "item",
          reference: ReferenceOp.createCurrent("preExistingItem"),
        },
        extension: {
          reference2: { configOperation: "reference", reference: "reference" },
          nonReference,
        },
      });
      expect(testConfigPoint.reference).toBe("item");
      expect(testConfigPoint.reference2).toBe("item");
      expect(testConfigPoint.nonReference).toMatchObject(nonReference);
    });

    it("InsertOp", () => {
      const arr = [1, 2, 3];
      const base = { arr };
      const inserts = { arr: [InsertOp.at(1, 1.5)] };
      let created = mergeCreate(base);
      mergeObject(created, inserts);
      expect(created.arr).toEqual([1, 1.5, 2, 3]);
    });

    it("list extend with object", () => {
      const { point } = ConfigPoint.register({
        point: {
          configBase: {
            list: [3, { id: "two" }, 0],
          },
          list: {
            0: "zero",
            two: { extraArg: true },
            insert1: {
              configOperation: "insert",
              position: 1,
              value: "insert",
            },
          },
        },
      });

      expect(point.list).toMatchObject([
        3,
        "insert",
        { id: "two", extraArg: true },
        "zero",
      ]);
    });

    it("external sort", () => {
      const srcPrimitive = [3, 1, 2, 2];
      const srcArray = [
        { value: 3, priority: 1 },
        { value: 2, priority: 2 },
        { value: 1, priority: 3 },
      ];
      const srcObject = {
        three: { value: 3, priority: 1 },
        two: { value: 2, priority: 2 },
        one: { value: 1, priority: 3 },
      };
      const srcFour = { value: 4, priority: 0 };
      const configBase = {
        srcPrimitive,
        srcArray,
        srcObject,
        sortPrimitive: ConfigPointOperation.sort.createSort("srcPrimitive"),
        sortArray: SortOp.createSort("srcArray", "priority", "value"),
        sortObject: SortOp.createSort("srcObject", "priority"),
        sortMissing: SortOp.createSort("srcMissing", "priority"),
      };
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register(
        {
          configName: CONFIG_NAME,
          configBase,
        },
        {
          testConfigPoint2: {
            configBase: CONFIG_NAME,
            srcPrimitive: [InsertOp.at(0, 4)],
            srcObject: {
              srcFour,
              three: { priority: 4 },
              two: { priority: null },
            },
          },
        }
      );
      expect(testConfigPoint.sortPrimitive).toMatchObject([1, 2, 2, 3]);
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1]);
      expect(testConfigPoint.sortObject).toMatchObject([
        srcObject.three,
        srcObject.two,
        srcObject.one,
      ]);
      expect(testConfigPoint.sortMissing).toMatchObject([]);
      expect(testConfigPoint2.sortPrimitive).toMatchObject([1, 2, 2, 3, 4]);
      expect(testConfigPoint2.sortObject).toMatchObject([
        srcFour,
        srcObject.one,
        { ...srcObject.three, priority: 4 },
      ]);
    });

    const sortArray = [
      { value: 3, priority: 1 },
      { value: 2, priority: 2 },
      { value: 1, priority: 3 },
    ];

    /**
     * An inline sort is one where the sort declaration directly declares the sorting element value.
     */
    it("valueFirst", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray,
          },
          _sortArray: {
            configOperation: "sort",
            sortKey: "priority",
            valueReference: "value",
          },
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1]);
    });

    it("valueLast", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            _sortArray: {
              configOperation: "sort",
              sortKey: "priority",
              valueReference: "value",
            },
          },
          sortArray,
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1]);
    });

    it("simpleInlineExtension", () => {
      const { testConfigPoint } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray: {
              configOperation: "sort",
              sortKey: "priority",
              valueReference: "value",
              value: sortArray,
            },
          },
          sortArray: {
            value4: { priority: 4, value: 0 },
          },
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1, 0]);
    });

    it("inlineValueWithExtension", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray: {
              configOperation: "sort",
              sortKey: "priority",
              valueReference: "value",
              value: sortArray,
            },
          },
          sortArray: {
            value4: { priority: 4, value: 0 },
          },
        },
        testConfigPoint2: {
          configBase: "testConfigPoint",
          sortArray: {
            value5: { priority: 5, value: -1 },
          },
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1, 0]);
      expect(testConfigPoint2.sortArray).toMatchObject([3, 2, 1, 0, -1]);
      expect(testConfigPoint.sortArray).toMatchObject([3, 2, 1, 0]);
    });

    it("listSortTwoLevels", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray: [{ configOperation: "sort", value: [3, 2] }, [-1, -2]],
          },
          sortArray: [
            [null, null, 1],
            { configOperation: "sort", value: [null, null, -3] },
          ],
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([
        [1, 2, 3],
        [-3, -2, -1],
      ]);
    });

    it("listSortArrayExtension", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray: {
              configOperation: "sort",
              value: [3, 2],
            },
          },
          sortArray: [null, null, 1],
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([1, 2, 3]);
    });

    it("listWithinListSort", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          configBase: {
            sortArray: [
              { configOperation: "sort", value: [3, 2] },
              [null, null, -3],
            ],
          },
          sortArray: [
            [null, null, 1],
            { configOperation: "sort", value: [-1, -2] },
          ],
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([
        [1, 2, 3],
        [-3, -2, -1],
      ]);
    });

    /**
     * This is a complex example showing how it is possible to sort lists of sorted lists.
     * The syntax is a bit obtuse - the child value needs to be referenced as a top level key/value
     * pair itself.
     */
    it("listSortTwoLevels", () => {
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          sortArray: {
            configOperation: "sort",
            sortKey: "priority",
            valueReference: "value",
            value: [
              {
                priority: 5,
                value: { configOperation: "sort", value: [3, 2] },
              },
              { priority: 3, value: [-1, -2] },
            ],
          },
        },
      });
      expect(testConfigPoint.sortArray).toMatchObject([
        [-1, -2],
        [2, 3],
      ]);
    });
  });

  describe("createConfiguration", () => {
    it("extendsConfiguration", () => {
      const config1 = ConfigPoint.createConfiguration("config1", {
        str: "",
        num: 0,
        func: () => "original",
        obj: { original: true },
        bool: false,
      });
      const config2 = ConfigPoint.createConfiguration(
        "config2",
        {
          func: () => "replaced",
        },
        config1
      );
      expect(config2.func()).toBe("replaced");
    });
  });

  describe("bindOp", () => {
    it("binds at top level", () => {
      const config = ConfigPoint.createConfiguration("bindConfig", {
        value: 5,
        func: {
          configOperation: "bind", value: function () { return this.value; },
        },
      });
      const { func } = config;
      expect(func()).toBe(5);
    });
    it("binds nested", () => {
      const config = ConfigPoint.createConfiguration("bindConfig", {
        nested: {
          value: 5,
          func: {
            configOperation: "bind", value: function () { return this.value; },
          },
        },
      });
      const { func } = config.nested;
      expect(func()).toBe(5);
    });

    it("binds to next object", () => {
      const config = ConfigPoint.createConfiguration("bindConfig", {
        nested: {
          value: 5,
          func: {
            configOperation: "bind", value: function () { return this.value; },
          },
        },
      });
      const config2 = ConfigPoint.createConfiguration("bindConfig2", {
        nested: {
          value: "replacedValue",
        },
      }, config)
      const { func } = config2.nested;
      expect(func()).toBe("replacedValue");
    });
  });
});
