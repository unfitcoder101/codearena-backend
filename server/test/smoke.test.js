// Route-mounting smoke check.
//
// Boots the real Express app (app.js) on an ephemeral port and asserts that
// the routes are actually MOUNTED — a mounted-but-protected route answers 401,
// an unmounted route would 404. This is the proof that consolidating the auth
// middleware (deleting the dead duplicate files) did not break any route
// wiring: the live middleware `authMiddleware.js` still guards the routes.
//
// No new dependencies: uses Node's built-in test runner and http client.
// Run with: npm test  (which invokes `node --test test/`).

// Some controllers instantiate third-party SDK clients (e.g. Groq) at module
// load and throw if their API key env vars are missing. Provide harmless dummy
// values so the app can be required and mounted for the smoke check — no real
// external calls are made by the routes we exercise here.
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-dummy-key";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-dummy-secret";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-dummy-key";
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "test-dummy-key";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const app = require("../app");

// Boot once on an ephemeral port; share across subtests.
function boot() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

function request(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: urlPath, method: "GET" },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("app-loads", () => {
  // Requiring ../app above must yield an Express app (a callable).
  assert.equal(typeof app, "function", "app.js must export the Express app");
});

test("root-200", async () => {
  const server = await boot();
  try {
    const port = server.address().port;
    const res = await request(port, "/");
    assert.equal(res.status, 200, `GET / expected 200, got ${res.status}`);
  } finally {
    server.close();
  }
});

test("dashboard-mounted", async () => {
  const server = await boot();
  try {
    const port = server.address().port;
    // /api/dashboard is guarded by the live `protect` middleware. With no
    // Authorization header it must answer 401 (mounted + protected), NOT 404
    // (which would mean the route failed to mount after the middleware change).
    const res = await request(port, "/api/dashboard");
    assert.equal(
      res.status,
      401,
      `GET /api/dashboard expected 401 (mounted+protected), got ${res.status}`,
    );
  } finally {
    server.close();
  }
});

test("unknown-route-404", async () => {
  const server = await boot();
  try {
    const port = server.address().port;
    // Control: a genuinely unmounted path must 404, proving the 401 above is
    // real protection and not a blanket response.
    const res = await request(port, "/api/definitely-not-a-route");
    assert.equal(
      res.status,
      404,
      `GET /api/definitely-not-a-route expected 404, got ${res.status}`,
    );
  } finally {
    server.close();
  }
});

test("dead-auth-middleware-files-removed", () => {
  // The two duplicate/dead auth middleware files must be gone. This assertion
  // fails RED before the deletion (files present) and passes after — the
  // red-first proof for this dead-code-removal task.
  const middlewareDir = path.join(__dirname, "..", "middleware");
  for (const dead of ["auth.js", "verifyToken.js"]) {
    assert.equal(
      fs.existsSync(path.join(middlewareDir, dead)),
      false,
      `dead middleware file middleware/${dead} must be removed`,
    );
  }
  // The live middleware must still exist.
  assert.equal(
    fs.existsSync(path.join(middlewareDir, "authMiddleware.js")),
    true,
    "live middleware/authMiddleware.js must remain",
  );
});
