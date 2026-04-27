import Fastify from "fastify";
import { config } from "./config";
import { loadRoutes } from "./lib/route-loader";

const app = Fastify({ logger: true });

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

app.addHook("onRequest", async (request, reply) => {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
    reply.header("Access-Control-Allow-Credentials", "true");
  }

  reply.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");

  if (request.method === "OPTIONS") {
    reply.code(204).send();
  }
});

app.get("/health", async () => ({ status: "ok" }));

async function start() {
  await loadRoutes(app);
  await app.listen({ port: config.port, host: config.host });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
