import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "../cloudflare/api-errors-worker.mjs";

const request = (path, init) => new Request(`https://about.wukai.work${path}`, init);

test("passes non-API requests through unchanged", async () => {
  const response = await handleRequest(request("/"), async () => new Response("homepage"));
  assert.equal(await response.text(), "homepage");
});

test("preserves successful JSON API responses", async () => {
  const response = await handleRequest(
    request("/api/site.json"),
    async () => Response.json({ name: "Kai Wu" })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: "Kai Wu" });
});

test("converts an HTML API 404 to RFC 9457-style JSON", async () => {
  const response = await handleRequest(
    request("/api/missing?source=test"),
    async () => new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } })
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /^application\/problem\+json/);
  assert.equal(body.code, "API_NOT_FOUND");
  assert.equal(body.message, "No API endpoint exists at /api/missing.");
  assert.equal(body.status, 404);
  assert.equal(body.instance, "/api/missing?source=test");
  assert.match(body.hint, /openapi\.json/);
});

test("preserves an existing JSON error response", async () => {
  const response = await handleRequest(
    request("/api/failure"),
    async () => Response.json({ code: "EXISTING_ERROR" }, { status: 400 })
  );
  assert.deepEqual(await response.json(), { code: "EXISTING_ERROR" });
});

test("returns JSON for unsupported methods on the profile endpoint", async () => {
  const response = await handleRequest(request("/api/site.json", { method: "POST" }));
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
  assert.equal(body.code, "METHOD_NOT_ALLOWED");
  assert.equal(body.message, "POST is not supported for /api/site.json.");
  assert.equal(body.detail, "POST is not supported for /api/site.json.");
});

test("returns a JSON gateway error when the origin is unavailable", async () => {
  const response = await handleRequest(request("/api/site.json"), async () => {
    throw new Error("offline");
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.code, "ORIGIN_UNAVAILABLE");
});
