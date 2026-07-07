// Route-mounting smoke test — uses only Node's built-in test runner + http.
//
// Purpose: prove the Express app still boots and mounts every route WITHOUT a
// live database. `require("../app")` never opens a DB connection (connectDB is
// only called from index.js / api.js), so dummy env vars are enough for every
// route/controller/service module to load.
//
// Placeholder env vars MUST be set before requiring the app, because several
// modules instantiate SDK clients at load time (e.g. `new Groq({ apiKey:
// process.env.GROQ_API_KEY })` in services/ai/llm.client.js and controllers).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-groq-key";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../app");

// Boot the app on an ephemeral port for the whole file, tear it down after.
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// Minimal GET helper: resolves with { status, body } where body is parsed JSON
// when possible, otherwise the raw string.
function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${baseUrl}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let body = data;
          try {
            body = JSON.parse(data);
          } catch {
            /* leave as raw string */
          }
          resolve({ status: res.statusCode, body });
        });
      })
      .on("error", reject);
  });
}

test("app-loads", () => {
  // The exported app is an Express handler (a function), loaded with no throw.
  assert.equal(typeof app, "function", "app should be an Express app function");
});

test("root-returns-200", async () => {
  const res = await get("/");
  assert.equal(res.status, 200, `GET / status: ${res.status}`);
  assert.equal(
    res.body.success,
    true,
    `GET / body.success: ${JSON.stringify(res.body)}`,
  );
});

test("dashboard-mounted", async () => {
  // A MOUNTED protected route rejects the unauthenticated request with 401.
  // If the route were NOT mounted, the app's 404 handler would answer instead,
  // so asserting 401 (and explicitly NOT 404) proves the route is wired in.
  const res = await get("/api/dashboard");
  assert.equal(
    res.status,
    401,
    `GET /api/dashboard status: ${res.status} (401 = mounted+protected, 404 = unmounted)`,
  );
});

test("unmounted-route-returns-404", async () => {
  // Control: an unknown path DOES hit the 404 handler. This is what makes the
  // dashboard-mounted assertion meaningful — 401 and 404 are distinguishable
  // outcomes on this app, so a passing dashboard-mounted test truly proves the
  // route was mounted rather than falling through to the 404 handler.
  const res = await get("/api/definitely-not-a-real-route");
  assert.equal(
    res.status,
    404,
    `GET /api/definitely-not-a-real-route status: ${res.status}`,
  );
});
