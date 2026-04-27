import test from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";

import { loadRoutes } from "./route-loader";

test("public-auth route only exposes canonical /v1/public/auth prefix", async () => {
  const app = Fastify();
  await loadRoutes(app);

  const canonical = await app.inject({
    method: "GET",
    url: "/v1/public/auth/challenge",
  });
  assert.equal(canonical.statusCode, 400);
  assert.deepEqual(canonical.json(), {
    error: "wallet query param is required",
  });

  const legacy = await app.inject({
    method: "GET",
    url: "/public-auth/challenge",
  });
  assert.equal(legacy.statusCode, 404);

  await app.close();
});
