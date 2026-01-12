import type { FastifyInstance, FastifyReply} from "fastify";
import crypto from "node:crypto";
import { getApiKeyByHash, touchApiKeyLastUsed } from "../repositories/apiKeys.repo.js";

export type AuthContext = {
  userId: string;
  apiKeyId: string;
  scopes: string[];
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }

  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireScope: (scope: string) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function authPlugin(app: FastifyInstance) {
  app.decorate("authenticate", async (req, reply) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      reply.code(401).send({ error: "missing_api_key" });
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      reply.code(401).send({ error: "missing_api_key" });
      return;
    }

    const hash = sha256Hex(token);
    const record = await getApiKeyByHash(hash);

    if (!record || !record.is_active) {
      reply.code(401).send({ error: "invalid_api_key" });
      return;
    }

    req.auth = {
      userId: record.user_id,
      apiKeyId: record.id,
      scopes: record.scopes ?? [],
    };

    void touchApiKeyLastUsed(record.id);
  });

  app.decorate("requireScope", (scope: string) => {
    return async (req, reply) => {
      if (!req.auth) {
        reply.code(401).send({ error: "missing_api_key" });
        return;
      }
      if (!req.auth.scopes.includes(scope)) {
        reply.code(403).send({ error: "insufficient_scope", scope });
        return;
      }
    };
  });
}
