import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { prisma, type PrismaClient } from "@openspace-db/core-db";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (app: FastifyInstance) => {
  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
