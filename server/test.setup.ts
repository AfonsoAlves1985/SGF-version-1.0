import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const projectRoot = path.resolve(import.meta.dirname, "..");
const envTestLocalPath = path.join(projectRoot, ".env.test.local");
const envTestPath = path.join(projectRoot, ".env.test");

if (fs.existsSync(envTestLocalPath)) {
  dotenv.config({ path: envTestLocalPath });
} else if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const acknowledgedSafeDb = process.env.TEST_DB_SAFE === "true";
const allowsRemoteTestDb = process.env.TEST_DB_ALLOW_REMOTE === "true";

if (!databaseUrl) {
  throw new Error(
    "[TEST_GUARD] DATABASE_URL ausente para testes. Configure .env.test.local (ou .env.test) com um banco dedicado de testes."
  );
}

if (!acknowledgedSafeDb) {
  throw new Error(
    "[TEST_GUARD] TEST_DB_SAFE=true nao definido. Execucao de testes bloqueada para evitar uso acidental do banco operacional."
  );
}

const looksLikeTestDatabase =
  /localhost|127\.0\.0\.1|_test|\btest\b/i.test(databaseUrl) ||
  /\/[^/?#]*test[^/?#]*/i.test(databaseUrl);

if (!looksLikeTestDatabase && !allowsRemoteTestDb) {
  throw new Error(
    "[TEST_GUARD] DATABASE_URL nao parece de teste. Use um banco dedicado (ex.: nome contendo test) ou defina TEST_DB_ALLOW_REMOTE=true conscientemente."
  );
}

process.env.NODE_ENV = "test";
