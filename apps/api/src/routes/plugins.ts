import type { FastifyInstance } from "fastify";
import type { PluginSummary } from "@openspace-db/shared-types";

/**
 * Read-only for v0.1 — the install/enable/disable lifecycle engine described
 * in docs/PLUGINS.md ships in v0.3. This endpoint exists now so the
 * Dashboard's plugin list page and the CLI have something real to call
 * against (always empty until the first plugin lands).
 */
export async function pluginRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/plugins",
    { preHandler: [app.requireAuth, app.requirePermission("plugins", "read")] },
    async (): Promise<PluginSummary[]> => {
      const plugins = await app.prisma.plugin.findMany();
      return plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.id,
        version: plugin.version,
        type: plugin.type,
        status: plugin.status,
        provides: [],
        errorMessage: plugin.errorMessage,
      }));
    },
  );
}
