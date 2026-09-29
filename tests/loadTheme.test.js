import must from "must";
import "regenerator-runtime";

import { ConfigPoint, loadSearchConfigPoint, loadIncludedThemes } from "../src";

/** A fetch mock that serves the text of files, and gives 404 for any other URL. */
const mockFetch = (files, { delays = {}, errors = [] } = {}) => {
  const fetchMock = jest.fn(async (url) => {
    if (delays[url]) await new Promise((resolve) => setTimeout(resolve, delays[url]));
    if (errors.includes(url)) throw new TypeError("Failed to fetch");
    if (files[url] === undefined) return { ok: false, status: 404, text: async () => "Not found" };
    return { ok: true, status: 200, text: async () => files[url] };
  });
  globalThis.fetch = fetchMock;
  return fetchMock;
};

const setSearch = (search) => window.history.replaceState({}, "", `/${search}`);

const fetchedUrls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);

describe("theme loading", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    ConfigPoint.clear();
    setSearch("");
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("backward compatibility", () => {
    it("loads the default name from one path", async () => {
      const fetchMock = mockFetch({ "/theme/base.ion": "{ compatTheme: { val: 3 } }" });
      const [registered] = await loadSearchConfigPoint("base", "/theme", "theme");
      must(fetchMock.mock.calls).eql([["/theme/base.ion", undefined]]);
      must(registered.compatTheme.val).eql(3);
      must(ConfigPoint.getConfig("compatTheme").val).eql(3);
    });

    it("loads the parameter names from one path, with the extension argument", async () => {
      setSearch("?theme=one");
      const fetchMock = mockFetch({ "/theme/one.json5": "{ compatTheme: { val: 1 } }" });
      await loadSearchConfigPoint("base", "/theme", "theme", ".json5");
      must(fetchedUrls(fetchMock)).eql(["/theme/one.json5"]);
      must(ConfigPoint.getConfig("compatTheme").val).eql(1);
    });

    it("resolves to an empty object when there is no name", async () => {
      const fetchMock = mockFetch({});
      must(await loadSearchConfigPoint(undefined, "/theme", "theme")).eql({});
      must(fetchMock.mock.calls.length).eql(0);
    });

    it("rejects when the single path does not have the theme", async () => {
      mockFetch({});
      await must(loadSearchConfigPoint("missing", "/theme", "theme")).reject.to.error(/Unable to load missing from \/theme\/missing.ion \(/);
    });

    it("throws for a name that is not alphanumeric", () => {
      setSearch("?theme=..%2Fsecret");
      mockFetch({});
      must(() => loadSearchConfigPoint("base", "/theme", "theme")).throw(/invalid value \.\.\/secret/);
    });
  });

  describe("path list", () => {
    it("loads each name from the first path that has it", async () => {
      setSearch("?theme=a,b");
      const fetchMock = mockFetch({
        "/global/a.ion": "{ pathA: { from: 'global' } }",
        "/theme/a.ion": "{ pathA: { from: 'theme' } }",
        "/theme/b.ion": "{ pathB: { from: 'theme' } }",
      });
      await loadSearchConfigPoint("base", ["/global", "/theme"], "theme");
      must(ConfigPoint.getConfig("pathA").from).eql("global");
      must(ConfigPoint.getConfig("pathB").from).eql("theme");
      must(fetchedUrls(fetchMock).sort()).eql(["/global/a.ion", "/global/b.ion", "/theme/b.ion"]);
    });

    it("moves to the next path after a fetch error", async () => {
      mockFetch({ "/theme/base.ion": "{ pathBase: { val: 2 } }" }, { errors: ["/global/base.ion"] });
      await loadSearchConfigPoint({ defaultName: "base", paths: ["/global", "/theme"] });
      must(ConfigPoint.getConfig("pathBase").val).eql(2);
    });

    it("moves to the next path after a parse error", async () => {
      mockFetch({ "/global/base.ion": "{ not ion", "/theme/base.ion": "{ pathBase: { val: 4 } }" });
      await loadSearchConfigPoint({ defaultName: "base", paths: ["/global", "/theme"] });
      must(ConfigPoint.getConfig("pathBase").val).eql(4);
    });

    it("rejects with every URL when no path has the theme", async () => {
      mockFetch({}, { errors: ["/global/base.ion"] });
      await must(loadSearchConfigPoint({ defaultName: "base", paths: ["/global", "/theme"] })).reject.to.error(
        /Unable to load base from \/global\/base.ion \(Failed to fetch\), \/theme\/base.ion \(\/theme\/base.ion returned 404\)/
      );
    });
  });

  describe("names of the search parameter", () => {
    it("registers a comma list and repeated parameters in the listed order", async () => {
      setSearch("?theme=b,a&theme=c,a");
      const fetchMock = mockFetch(
        {
          "/theme/a.ion": "{ orderTheme: { last: 'a', a: true } }",
          "/theme/b.ion": "{ orderTheme: { last: 'b', b: true } }",
          "/theme/c.ion": "{ orderTheme: { last: 'c', c: true } }",
        },
        // The first name arrives last, and the order must not change.
        { delays: { "/theme/b.ion": 30, "/theme/a.ion": 10 } }
      );
      const registered = await loadSearchConfigPoint("base", "/theme", "theme");
      must(registered.length).eql(3);
      must(fetchedUrls(fetchMock)).eql(["/theme/b.ion", "/theme/a.ion", "/theme/c.ion"]);
      const orderTheme = ConfigPoint.getConfig("orderTheme");
      must(orderTheme.last).eql("c");
      must([orderTheme.a, orderTheme.b, orderTheme.c]).eql([true, true, true]);
    });

    it("throws when one name of a comma list is not alphanumeric", () => {
      setSearch("?theme=a,b.c");
      mockFetch({});
      must(() => loadSearchConfigPoint("base", "/theme", "theme")).throw(/invalid value b\.c/);
    });
  });

  describe("loadResource hook", () => {
    it("uses the data that the hook returns, and gets the kind, name, url and defaultLoad", async () => {
      const fetchMock = mockFetch({});
      const loadResource = jest.fn(async () => ({ hookTheme: { val: 7 } }));
      await loadSearchConfigPoint("base", ["/global", "/theme"], "theme", ".ion", { loadResource });
      must(ConfigPoint.getConfig("hookTheme").val).eql(7);
      must(fetchMock.mock.calls.length).eql(0);
      const [[args]] = loadResource.mock.calls;
      must(args.kind).eql("theme");
      must(args.name).eql("base");
      must(args.url).eql("/global/base.ion");
      must(typeof args.defaultLoad).eql("function");
    });

    it("uses the default export of a module that the hook returns", async () => {
      mockFetch({});
      const loadResource = async () => ({ default: { hookTheme: { val: 8 } } });
      await loadSearchConfigPoint({ defaultName: "base", paths: "/theme", loadResource });
      must(ConfigPoint.getConfig("hookTheme").val).eql(8);
    });

    it("uses the regular load when the hook returns undefined", async () => {
      const fetchMock = mockFetch({ "/theme/base.ion": "{ hookTheme: { val: 9 } }" });
      const loadResource = jest.fn(async () => undefined);
      await loadSearchConfigPoint({ defaultName: "base", paths: ["/theme"], loadResource });
      must(ConfigPoint.getConfig("hookTheme").val).eql(9);
      must(fetchMock.mock.calls).eql([["/theme/base.ion", undefined]]);
    });

    it("adds headers through defaultLoad for the URLs that the hook selects", async () => {
      const fetchMock = mockFetch({ "/global/base.ion": "{ hookTheme: { from: 'global' } }", "/theme/other.ion": "{ otherTheme: { val: 1 } }" });
      setSearch("?theme=base,other");
      const loadResource = ({ url, defaultLoad }) =>
        url.startsWith("/global/") ? defaultLoad(url, { headers: { Authorization: "Bearer token" } }) : undefined;
      await loadSearchConfigPoint({ defaultName: "base", paths: ["/global", "/theme"], parameterName: "theme", loadResource });
      must(ConfigPoint.getConfig("hookTheme").from).eql("global");
      must(ConfigPoint.getConfig("otherTheme").val).eql(1);
      must(fetchMock.mock.calls).eql([
        ["/global/base.ion", { headers: { Authorization: "Bearer token" } }],
        ["/global/other.ion", { headers: { Authorization: "Bearer token" } }],
        ["/theme/other.ion", undefined],
      ]);
    });

    it("treats a hook that throws as a failed load, and moves to the next path", async () => {
      mockFetch({ "/theme/base.ion": "{ hookTheme: { from: 'theme' } }" });
      const loadResource = ({ url }) => {
        if (url.startsWith("/global/")) throw new Error("hook failure");
        return undefined;
      };
      await loadSearchConfigPoint({ defaultName: "base", paths: ["/global", "/theme"], loadResource });
      must(ConfigPoint.getConfig("hookTheme").from).eql("theme");
    });

    it("rejects when the hook throws for every path", async () => {
      mockFetch({ "/theme/base.ion": "{ hookTheme: { from: 'theme' } }" });
      const loadResource = async () => {
        throw new Error("hook failure");
      };
      await must(loadSearchConfigPoint({ defaultName: "base", paths: ["/theme"], loadResource })).reject.to.error(
        /Unable to load base from \/theme\/base.ion \(hook failure\)/
      );
    });
  });

  describe("includeTheme", () => {
    const files = {
      "/theme/main.ion": "{ includeTheme: { dark: 'dark', extra: 'extra/x.ion' }, mainTheme: { val: 1 } }",
      "/theme/dark.ion": "{ includeTheme: { main: 'main', large: 'large' }, darkTheme: { val: 2 } }",
      "/theme/large.ion": "{ largeTheme: { val: 3 } }",
      "/global/large.ion": "{ largeTheme: { val: 30 } }",
      "/extra/x.ion": "{ extraTheme: { val: 4 } }",
    };

    it("loads the included themes through the path list, with the includeTheme option", async () => {
      const fetchMock = mockFetch(files);
      await loadSearchConfigPoint({ defaultName: "main", paths: ["/global", "/theme"], includeTheme: true });
      must(ConfigPoint.getConfig("darkTheme").val).eql(2);
      must(ConfigPoint.getConfig("largeTheme").val).eql(30);
      must(ConfigPoint.getConfig("extraTheme").val).eql(4);
      const urls = fetchedUrls(fetchMock);
      // A theme name uses the path list, a relative URL uses pathPrefix, and each theme loads once only.
      must(urls.filter((url) => url === "/extra/x.ion").length).eql(1);
      must(urls.includes("/theme/large.ion")).false();
      // As in the consumer loader, an include of a start theme loads it again (on each of the two paths).
      must(urls.filter((url) => url.endsWith("/main.ion")).length).eql(4);
    });

    it("does not follow includeTheme without the option", async () => {
      const fetchMock = mockFetch(files);
      await loadSearchConfigPoint({ defaultName: "main", paths: ["/theme"] });
      must(fetchedUrls(fetchMock)).eql(["/theme/main.ion"]);
      must(ConfigPoint.getConfig("darkTheme")).be.undefined();
    });

    it("loads the included themes through the hook", async () => {
      const fetchMock = mockFetch(files);
      const loadResource = jest.fn(({ url, defaultLoad }) =>
        url.startsWith("/global/") ? defaultLoad(url, { headers: { Authorization: "Bearer token" } }) : undefined
      );
      await loadSearchConfigPoint({ defaultName: "main", paths: ["/global", "/theme"], includeTheme: true, loadResource });
      const hookCalls = loadResource.mock.calls.map(([{ kind, name, url }]) => `${kind}:${name}:${url}`);
      must(hookCalls).include("theme:dark:/global/dark.ion");
      must(hookCalls).include("theme:extra:/extra/x.ion");
      must(hookCalls).include("theme:large:/global/large.ion");
      expect(fetchMock).toHaveBeenCalledWith("/global/large.ion", { headers: { Authorization: "Bearer token" } });
      must(ConfigPoint.getConfig("largeTheme").val).eql(30);
    });

    it("loads from registered configs with loadIncludedThemes, with a pathPrefix", async () => {
      const fetchMock = mockFetch({ "/app/extra/x.ion": "{ extraTheme: { val: 5 } }", "/theme/large.ion": "{ largeTheme: { val: 3 } }" });
      const registered = ConfigPoint.register({ includeTheme: { extra: "extra/x.ion", large: "large" } });
      const result = await loadIncludedThemes(Promise.resolve([registered]), { paths: ["/theme"], pathPrefix: "/app" });
      must(result).eql([registered]);
      must(fetchedUrls(fetchMock).sort()).eql(["/app/extra/x.ion", "/theme/large.ion"]);
      must(ConfigPoint.getConfig("extraTheme").val).eql(5);
      must(ConfigPoint.getConfig("largeTheme").val).eql(3);
    });

    it("rejects when an included theme fails", async () => {
      mockFetch({ "/theme/main.ion": "{ includeTheme: { gone: 'gone' } }" });
      await must(loadSearchConfigPoint({ defaultName: "main", paths: ["/theme"], includeTheme: true })).reject.to.error(/Unable to load gone/);
    });
  });
});
