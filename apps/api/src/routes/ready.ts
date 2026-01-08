import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function readyRoutes(app: FastifyInstance) {
  app.get("/ready", async (_, reply) => {
    try {
      await pool.query("select 1");
      return { status: "ready" };
    } catch (err) {
      app.log.error({ err }, "DB not ready");
      return reply.code(503).send({ status: "not-ready" });
    }
  });
}
