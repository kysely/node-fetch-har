const { withHar, createHarLog } = require("./index");

describe("withHar", () => {
  describe.each(["node-fetch", "isomorphic-fetch", "isomorphic-unfetch"])(
    "using %s",
    fetchModule => {
      const baseFetch = require(fetchModule);

      describe("fetch", () => {
        it("adds harEntry to responses", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch(
            "https://postman-echo.com/get?foo1=bar1&foo2=bar2",
            {
              compress: false,
              headers: {
                Cookie: "token=12345; other=abcdef"
              }
            }
          );
          expect(response.headers.get("content-type")).toBe(
            "application/json; charset=utf-8"
          );
          expect(response.harEntry).toEqual({
            _timestamps: expect.any(Object),
            startedDateTime: expect.stringMatching(
              /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z$/
            ),
            time: expect.any(Number),
            timings: {
              blocked: expect.any(Number),
              connect: expect.any(Number),
              dns: expect.any(Number),
              receive: expect.any(Number),
              send: expect.any(Number),
              ssl: expect.any(Number),
              wait: expect.any(Number)
            },
            cache: {
              afterRequest: null,
              beforeRequest: null
            },
            pageref: "page_1",
            request: {
              bodySize: -1,
              cookies: [
                { name: "token", value: "12345" },
                { name: "other", value: "abcdef" }
              ],
              headers: expect.arrayContaining([
                {
                  name: expect.stringMatching(/^cookie$/i),
                  value: "token=12345; other=abcdef"
                },
                {
                  name: "x-har-request-id",
                  value: expect.any(String)
                },
                {
                  name: expect.stringMatching(/^accept$/i),
                  value: "*/*"
                },
                {
                  name: expect.stringMatching(/^user-agent$/i),
                  value:
                    "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
                }
              ]),
              headersSize: -1,
              httpVersion: "HTTP/1.1",
              method: "GET",
              queryString: [
                {
                  name: "foo1",
                  value: "bar1"
                },
                {
                  name: "foo2",
                  value: "bar2"
                }
              ],
              url: "https://postman-echo.com/get?foo1=bar1&foo2=bar2"
            },
            response: {
              httpVersion: "HTTP/1.1",
              status: 200,
              statusText: "OK",
              redirectURL: "",
              headersSize: -1,
              bodySize: expect.any(Number),
              content: {
                mimeType: "application/json; charset=utf-8",
                size: expect.any(Number),
                text: expect.any(String)
              },
              cookies: expect.any(Array),
              headers: expect.arrayContaining([
                {
                  name: "Content-Type",
                  value: "application/json; charset=utf-8"
                },
                {
                  name: "Date",
                  value: expect.any(String)
                },
                {
                  name: "Vary",
                  value: "Accept-Encoding"
                },
                {
                  name: "Content-Length",
                  value: expect.any(String)
                },
                {
                  name: "Connection",
                  value: "Close"
                }
              ])
            }
          });
          const body = await response.json();
          expect(body).toEqual({
            args: {
              foo1: "bar1",
              foo2: "bar2"
            },
            headers: {
              accept: "*/*",
              cookie: "token=12345; other=abcdef",
              host: "postman-echo.com",
              "user-agent":
                "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
              "x-forwarded-port": "443",
              "x-forwarded-proto": "https",
              "x-har-request-id": expect.any(String)
            },
            url: "https://postman-echo.com/get?foo1=bar1&foo2=bar2"
          });
        });

        it("reports entries with the onHarEntry option", async () => {
          const onHarEntry = jest.fn();
          const fetch = withHar(baseFetch);
          await fetch("https://postman-echo.com/get", { onHarEntry });
          expect(onHarEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              request: expect.objectContaining({
                url: "https://postman-echo.com/get"
              })
            })
          );
        });

        it("adds entries to the given log created with createHarLog", async () => {
          const har = createHarLog();
          const har2 = createHarLog();
          const fetch = withHar(baseFetch);
          await Promise.all([
            fetch("https://postman-echo.com/stream/5", { har }),
            fetch("https://postman-echo.com/delay/2", { har: har2 }),
            fetch("https://postman-echo.com/deflate", { har })
          ]);
          expect(har.log.entries).toHaveLength(2);
          expect(har2.log.entries).toHaveLength(1);
        });

        it("does not record entries if har option is false", async () => {
          const onHarEntry = jest.fn();
          const fetch = withHar(baseFetch);
          const response = await fetch("https://postman-echo.com/get", {
            har: false,
            onHarEntry
          });
          expect(onHarEntry).not.toHaveBeenCalled();
          expect(response).not.toHaveProperty("harEntry");
        });

        it("supports large request and response bodies", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch("https://graphbrainz.herokuapp.com/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              query: `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}

fragment InputValue on __InputValue {
  name
  description
  type { ...TypeRef }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}
`
            })
          });
          const body = await response.json();
          expect(body).toMatchObject({
            data: {
              __schema: expect.any(Object)
            }
          });
        });

        it("fails gracefully if fetch unsets our request ID header", async () => {
          function customFetch(input, options) {
            // Remove `x-har-request-id`.
            const headers = { ...options.headers };
            delete headers["x-har-request-id"];
            return baseFetch(input, { ...options, headers });
          }
          const fetch = withHar(customFetch);
          const response = await fetch("https://postman-echo.com/get");
          expect(response).not.toHaveProperty("harEntry");
        });

        it("removes the entry from the entry map on success", async () => {
          const harEntryMap = new Map();
          jest.spyOn(harEntryMap, "get");
          jest.spyOn(harEntryMap, "set");
          jest.spyOn(harEntryMap, "delete");
          const fetch = withHar(baseFetch, { harEntryMap });
          await fetch("https://postman-echo.com/get");
          expect(harEntryMap.set).toHaveBeenCalled();
          expect(harEntryMap.delete).toHaveBeenCalled();
          expect(harEntryMap.size).toBe(0);
        });

        it("removes the entry from the entry map on failure", async () => {
          const harEntryMap = new Map();
          jest.spyOn(harEntryMap, "get");
          jest.spyOn(harEntryMap, "set");
          jest.spyOn(harEntryMap, "delete");
          const fetch = withHar(baseFetch, { harEntryMap });
          await expect(
            fetch(
              "https://httpbin.org/redirect-to?url=https://github.com/exogen&status_code=302",
              {
                redirect: "error"
              }
            )
          ).rejects.toThrow();
          expect(harEntryMap.set).toHaveBeenCalled();
          expect(harEntryMap.delete).toHaveBeenCalled();
          expect(harEntryMap.size).toBe(0);
        });

        it("records multiple entries and populates redirectURL on redirects", async () => {
          const har = createHarLog();
          const onHarEntry = jest.fn();
          const fetch = withHar(baseFetch, { har, onHarEntry });
          const response = await fetch(
            "https://httpbin.org/redirect-to?url=https://github.com/exogen&status_code=302"
          );
          expect(har.log.entries).toHaveLength(2);
          const [firstEntry, secondEntry] = har.log.entries;
          expect(firstEntry.response.status).toBe(302);
          expect(firstEntry.response.redirectURL).toBe(
            "https://github.com/exogen"
          );
          expect(secondEntry).toBe(response.harEntry);
          expect(response.harEntry.request.url).toBe(
            "https://github.com/exogen"
          );
          expect(response.harEntry.response.status).toBe(200);
          expect(response.harEntry.response.redirectURL).toBe("");
          expect(onHarEntry).toHaveBeenCalledTimes(2);
          expect(onHarEntry).toHaveBeenNthCalledWith(1, firstEntry);
          expect(onHarEntry).toHaveBeenNthCalledWith(2, secondEntry);
        });

        it("works when headers are a Headers object", async () => {
          const Headers = baseFetch.Headers || global.Headers;
          const headers = new Headers();
          headers.set("X-Test-Foo", "foo");
          headers.set("X-Test-Bar", "bar");
          const fetch = withHar(baseFetch);
          const response = await fetch("https://httpbin.org/status/201", {
            headers
          });
          expect(response.harEntry.request.url).toBe(
            "https://httpbin.org/status/201"
          );
        });

        it("works when the input is a Request object", async () => {
          const Request = baseFetch.Request || global.Request;
          const request = new Request("https://postman-echo.com/post", {
            method: "POST",
            body: "test"
          });
          const fetch = withHar(baseFetch);
          const response = await fetch(request);
          expect(response.harEntry.request.url).toBe(
            "https://postman-echo.com/post"
          );
          expect(response.harEntry.request.method).toBe("POST");
        });

        it("records request body info", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch("https://postman-echo.com/post", {
            method: "POST",
            headers: {
              "Content-Type": "text/plain"
            },
            body: "test one two!"
          });
          expect(response.harEntry.request.bodySize).toBe(13);
          expect(response.harEntry.request.postData).toEqual({
            mimeType: "text/plain",
            text: "test one two!"
          });
        });

        it("records request body params", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch("https://postman-echo.com/post", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "foo=1&bar=2&bar=three%20aka%203&baz=4"
          });
          expect(response.harEntry.request.bodySize).toBe(37);
          expect(response.harEntry.request.postData).toEqual({
            mimeType: "application/x-www-form-urlencoded",
            params: [
              { name: "foo", value: "1" },
              { name: "bar", value: "2" },
              { name: "bar", value: "three aka 3" },
              { name: "baz", value: "4" }
            ]
          });
        });

        it("supports compression savings detection (gzip)", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch("https://postman-echo.com/gzip");
          const body = await response.json();
          expect(body.gzipped).toBe(true);
          expect(response.harEntry.response.bodySize).toBeLessThan(
            response.harEntry.response.content.size
          );
          expect(response.harEntry.response.content.compression).toBe(
            response.harEntry.response.content.size -
              response.harEntry.response.bodySize
          );
        });

        it("supports compression savings detection (deflate)", async () => {
          const fetch = withHar(baseFetch);
          const response = await fetch("https://postman-echo.com/deflate");
          const body = await response.json();
          expect(body.deflated).toBe(true);
          expect(response.harEntry.response.bodySize).toBeLessThan(
            response.harEntry.response.content.size
          );
          expect(response.harEntry.response.content.compression).toBe(
            response.harEntry.response.content.size -
              response.harEntry.response.bodySize
          );
        });
      });

      it("reports entries with the onHarEntry option", async () => {
        const onHarEntry = jest.fn();
        const fetch = withHar(baseFetch, { onHarEntry });
        await fetch("https://postman-echo.com/get");
        expect(onHarEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              url: "https://postman-echo.com/get"
            })
          })
        );
      });

      it("adds entries to the given log created with createHarLog", async () => {
        const har = createHarLog();
        const fetch = withHar(baseFetch, { har });
        await Promise.all([
          fetch("https://postman-echo.com/stream/5"),
          fetch("https://postman-echo.com/delay/2"),
          fetch("https://postman-echo.com/deflate")
        ]);
        expect(har.log.entries).toHaveLength(3);
      });
    }
  );
});
