import { FastifyInstance } from "fastify";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

function getCanonicalPrefix(dir: string): string {
  if (dir === "public-auth") {
    return "/v1/public/auth";
  }
  if (dir === "public-market") {
    return "/v1/public";
  }
  return `/v1/${dir}`;
}

function getLegacyPrefix(dir: string): string | null {
  if (dir === "public-auth") {
    return null;
  }
  return `/${dir}`;
}

function resolveRouteEntry(routesDir: string, dir: string): string {
  const tsEntry = join(routesDir, dir, "index.ts");
  const jsEntry = join(routesDir, dir, "index.js");
  const fallback = join(routesDir, dir, "index");

  if (existsSync(tsEntry)) {
    return tsEntry;
  }
  if (existsSync(jsEntry)) {
    return jsEntry;
  }

  return fallback;
}

export async function loadRoutes(app: FastifyInstance) {
  const routesDir = join(__dirname, "..", "routes");

  let dirs: string[];
  try {
    dirs = readdirSync(routesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    app.log.warn("No routes directory found, skipping route loading");
    return;
  }

  for (const dir of dirs) {
    try {
      const entry = resolveRouteEntry(routesDir, dir);
      const routeModule = await import(pathToFileURL(entry).href);
      if (typeof routeModule.default !== "function") {
        continue;
      }

      const canonicalPrefix = getCanonicalPrefix(dir);
      await app.register(routeModule.default, { prefix: canonicalPrefix });
      app.log.info(`Loaded route: ${canonicalPrefix}`);

      if (dir === "public-market") {
        app.log.info("Loaded route: /v1/public/market");
        app.log.info("Loaded route: /v1/public/match");
      }

      const legacyPrefix = getLegacyPrefix(dir);
      if (legacyPrefix) {
        await app.register(routeModule.default, { prefix: legacyPrefix });
        app.log.info(`Loaded route: ${legacyPrefix}`);
      }
    } catch (error) {
      app.log.warn(
        {
          route: dir,
          error,
        },
        `Skipped route module: ${dir} (not implemented)`,
      );
    }
  }
}
